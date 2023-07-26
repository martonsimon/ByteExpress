import { Logger, ILogObj } from 'tslog';
import { Callback, NetworkHandler, CallbackContext, NetworkSettings } from "./NetworkHandler";
import { TransferWrapper } from "../Packets/NetworkingPackets/TransferWrapper";
import { Serializable } from "../Serialization/Serializable";
import { PacketManager } from "../Packets/PacketManager";
import { ByteStream } from "../ByteStream/ByteStream";
import { ByteStreamWriter } from "../ByteStream/ByteStreamWriter";
import { ByteStreamReader } from "../ByteStream/ByteStreamReader";
import { BeginCallback, CallbackHandler, CallbackHandlerCb, CallbackHandlerElement, CallbackHandlerKey, CallbacksHandlerCb, RequestContext, RequestHandler, iRequestContext } from "./RequestHandler";
import { ResponsePacket } from "../Packets/NetworkingPackets/ResponsePacket";
import { RequestPacket } from "../Packets/NetworkingPackets/RequestPacket";
import { Observable } from "rxjs";
import { ErrorCallback, FinalCallback, StreamCallback, StreamCallbackHandler, StreamHandler } from "./StreamHandler";
import { NullPacket } from "../Packets/NetworkingPackets/NullPacket";

/**
 * Manages and track the state of each connection,
 * as well as managing the fragmentation and buffering
 * of packets. Exposes request and stream methods, and 
 * provides callback for outbound data.
 */
export class NetworkConnection{
    //Settings variables
    private readonly logger: Logger<ILogObj>;
    readonly id: number | string; //Connection ID / client ID
    readonly maxPacketSize: number; //Max size for an outbound message (including the wrapper)
    readonly sendRate: number; //Amount of time to wait between sending packets. 0 to disable
    readonly packetsPerAck: number; //Number of consecutive packets after which an ACK is required
    readonly requestQueueSize: number; // in & out bound request queue size
    readonly streamQueueSize: number; //in & out bound stream queue size
    readonly outboundCb: Callback;
    readonly packetManager: PacketManager;

    //Private states
    private lastSentAt: number; //time of last sent packet
    private packetsDeltaAck: number; //number of sent packets since a received ACK
    private maxSinglePacketPayload: number; //max allowed payload length for unchuhnked packets
    private maxChunkedPacketPayload: number; //max allowed payload length for chunked packets
    private maxChunkedPacketPayloadContinuous: number; //max allowed payload length for chunked packets after initial packet
    private nextSequence: number; //uint8, next sequence ID for outgoing chunked packets
    private outboundQueue: Array<TransferWrapper>; //stores packets when cannot be immediately sent out
    private sendTimeout: NodeJS.Timeout | undefined;

    private buffer: ByteStream; //buffers the incoming data to form a complete packet (NOTE: the program supposes that fragments of a packet arrives in order, just like in case of TCP/IP or websockets. However, the complete packets can be out of order to allow multiple requests at a time)
    private requiredPacketLength: number; //required bytes to create a packet, if -1 then it cannot be determined
    private packetBuffers: Array<PacketBuffer>; //Buffers packets for each individual chunk, but not for a fragmented incoming data.
    private requestHandler: RequestHandler; //handler class for managing request and events
    private streamHandler: StreamHandler; //handler class for managing streams

    constructor(
        logger: Logger<ILogObj>,
        id: number | string,
        maxPacketSize: number,
        sendRate: number,
        packetsPerAck: number,
        requestQueueSize: number,
        streamQueueSize: number,
        outboundCb: Callback,
        packetManager: PacketManager,
        globalRequestHandlers: CallbackHandler<CallbackHandlerKey, CallbacksHandlerCb>,
        globalStreamHandlers: CallbackHandler<string, StreamCallbackHandler>,
        networkSettings?: NetworkSettings
    ){
        this.logger = logger;
        this.id = id;
        this.maxPacketSize = maxPacketSize;
        this.sendRate = sendRate;
        this.packetsPerAck = packetsPerAck;
        this.requestQueueSize = requestQueueSize;
        this.streamQueueSize = streamQueueSize;
        this.outboundCb = outboundCb;
        this.packetManager = packetManager;

        this.lastSentAt = 0;
        this.packetsDeltaAck = 0;
        this.maxSinglePacketPayload = this.calculatePayloadSize(false, false);
        this.maxChunkedPacketPayload = this.calculatePayloadSize(true, false);
        this.maxChunkedPacketPayloadContinuous = this.calculatePayloadSize(true, true);
        this.nextSequence = 0;
        this.outboundQueue = new Array<TransferWrapper>();
        this.sendTimeout = undefined;
        this.buffer = new ByteStream();
        this.requiredPacketLength = -1;
        this.packetBuffers = new Array<PacketBuffer>();
        this.requestHandler = new RequestHandler(
            this.logger,
            this.packetManager,
            this,
            globalRequestHandlers,
            { timeout: networkSettings?.requestTimeout }
        );
        this.streamHandler = new StreamHandler(
            this.logger,
            this.packetManager,
            this,
            globalStreamHandlers,
        );

        this.checkPayloadRestrictions();
    }

    //METHODS FOR OUTBOUND
    /**
     * Adds a packet to the outbound packet queue and split
     * into smaller chunks as necessary
     * @param packet Packet subclass of Serializable
     * @returns false if failed (e.g buffer is full)
     */
    public sendPacket(packet: Serializable, placeAtBeginning: boolean = false, flush: boolean = false): boolean{
        return this._sendPacket(packet, placeAtBeginning, flush, false);
    }
    private _sendPacket(packet: Serializable, placeAtBeginning: boolean = false, flush: boolean = false, ack: boolean): boolean{
        this.logger.trace("_sendPacket, id: ", this.id, " placeAtBeginning: ", placeAtBeginning, " flush: ", flush, " ack: ", ack);
        this.logger.trace("packet to send: ", packet.toJson());

        let data = packet.toBytes();
        let length = data.getLength();
        let packetId = this.packetManager.getIdByInstance(packet);
        this.logger.trace("packetId: ", packetId, " length: ", length);
        if (!packetId){
            console.error("Invalid outbound packet. Please set an ID inside PacketManager.ts or add the class using the Networking instance's addPacket method");
            return false;
        }

        if (length > this.maxSinglePacketPayload){
            //if packet is too long
            //then chop it into smaller pieces
            let sequence = this.nextSequence;
            this.incrementSequence();
            this.logger.trace("packet needs segmentation, sequence: ", sequence);

            let i = 0;
            while (data.getRemainingAmount() > 0){
                let allowedPayload = i == 0 ? this.maxChunkedPacketPayload : this.maxChunkedPacketPayloadContinuous;
                let isLastChunk = (data.getRemainingAmount() <= allowedPayload);
                let toRead = Math.min(allowedPayload, data.getRemainingAmount());
                let fragmentData = data.read(toRead);

                let wrapper = new TransferWrapper();
                wrapper.packetManager = this.packetManager;
                wrapper.flags.ack = ack;
                wrapper.flags.chunked_packet = true;
                wrapper.flags.last_chunk = isLastChunk;
                wrapper.packet_sequence = sequence;
                wrapper.chunk_id = i;
                wrapper.packet_id = packetId;
                wrapper.payload_length = toRead;
                wrapper.payload = fragmentData!;

                this.queuePacket(wrapper, placeAtBeginning);
                i++;
            }
        }
        else{
            //else just wrap it
            let wrapper = new TransferWrapper();
            wrapper.packetManager = this.packetManager;
            wrapper.flags.ack = ack;
            wrapper.packet_id = packetId;
            wrapper.payload_length = length;
            wrapper.payload = data.readAll()!;

            this.queuePacket(wrapper, placeAtBeginning);
        }
        this.flushOutboundQueue(flush);
        return true;
    }
    /**
     * Queues a given transfer wrapper
     * @param packet Transfer object
     */
    private queuePacket(packet: TransferWrapper, placeAtBeginning: boolean = false){
        this.logger.trace("queuePacket, id: ", this.id, " placeAtBeginning: ", placeAtBeginning, " packet: ", packet.toJson());
        if (placeAtBeginning)
            this.outboundQueue.unshift(packet);
        else
            this.outboundQueue.push(packet);
    }
    private flushOutboundQueue(flushImmediately: boolean = false){
        this.logger.trace("flushOutboundQueue, id: ", this.id, " flushImmediately: ", flushImmediately, " sendTimeout defined/active: ", !!this.sendTimeout, " outboundQueue length: ", this.outboundQueue.length, " waitingForAck: ", this.waitingForAck());
        if (this.sendTimeout) 
            return;
        if (this.outboundQueue.length == 0)
            return;
        if (this.waitingForAck() && !flushImmediately) //this will cause remaining messages to get stuck, but will be pushed out once the ACK arrives and delta is resetted
            return;
        
        this.packetsDeltaAck++;
        this.logger.trace("new deltaAck: ", this.packetsDeltaAck);
        let packet = this.outboundQueue.shift();
        packet!.flags.require_ack = this.waitingForAck();
        let packetData = packet!.toBytes().readAll()!;
        let ctx: CallbackContext = {
            original_packet: packet!,
            connection_id: this.id,
            last_sent_at: this.lastSentAt,
            packets_delta_ack: this.packetsDeltaAck,
            max_single_packet_payload: this.maxSinglePacketPayload,
            max_chunked_packet_payload: this.maxChunkedPacketPayload,
            next_sequence: this.nextSequence
        };
        this.logger.trace("Flushing the following packet: ", packet!.toJson());
        this.outboundCb(this.id, packetData, ctx);

        if (this.sendRate){
            if (!this.sendTimeout){
                this.logger.trace("Send rate is defined and sendTimeout is inactive, setting a new timeout");
                this.sendTimeout = setTimeout(() => {
                    this.logger.trace("timeout expired, id: ", this.id);
                    this.sendTimeout = undefined;
                    this.flushOutboundQueue();
                }, this.sendRate);
            }
        }else{
            this.logger.trace("No sendRate, trying to flush more");
            this.flushOutboundQueue();
        }
        return;

        if (this.sendRate){ //set a timeout
            if (this.sendTimeout && flushImmediately) //clear if there is a request must be flushed
                clearTimeout(this.sendTimeout);
            this.sendTimeout = setTimeout(() => {
                this.sendTimeout = undefined;
                this.flushOutboundQueue();
            }, this.sendRate);
        }else{ //try to process the next
            this.flushOutboundQueue();
        }
    }


    //METHODS FOR INBOUND
    public inboundData(data: Uint8Array): void{
        this.logger.trace("Inbound data received by connection with ID: ", this.id);
        this.buffer.write(data);
        this._processBuffer();
    }
    private _processBuffer(){
        //NOTE: When testing locally (server and client code in the same
        //      piece of code), it won't crash despite it may look like this
        //      method is called recursively. The promises used for requests
        //      and streams are resolved in the event loop, hence it won't exceed
        //      the max callstack size

        this.logger.trace("Processing buffer for connection with ID: ", this.id);

        //if the total size is known but there isn't enough data
        //wait for more to arrive
        if (this.requiredPacketLength && this.buffer.getBytesWritten() < this.requiredPacketLength)
            return;
        if (this.buffer.getBytesWritten() == 0)
            return;
        
        //If the total required size is unknown or there is enough data
        //try to create a packet
        let stream = this.buffer.toStreamReader();
        let packet = new TransferWrapper();
        packet.packetManager = this.packetManager;
        let success = packet.fromBytes(stream);
        this.logger.trace("Tried parsing packet, success: ", success);

        //if success, reset buffer, handle packet
        //and try to read the remaining
        if (success){
            //Reset buffer
            let newBuffer = stream.getRemainingAmount() ? stream.readRemaining() : new Uint8Array();
            this.buffer = new ByteStream(newBuffer);
            this.requiredPacketLength = -1;

            //Handle ACK
            this.handleAck(packet);

            //Handle packet
            if (!packet.flags.chunked_packet)
                this.onPacket(this.extractPacket(packet));
            else
                this.onPacketChunk(packet);
            
            //Process remaining if any
            this._processBuffer();
        }
        //else modify the minimum required data if can
        //be determined and wait for the next fragment
        //to arrive
        else{
            this.requiredPacketLength = packet.getTotalLength();
        }
    }
    private onPacket(packet: Serializable){
        this.requestHandler.inboundPacket(packet);
        this.streamHandler.inboundPacket(packet);
    }
    private onPacketChunk(packet: TransferWrapper){
        //Find existing
        let sequence = packet.packet_sequence;
        let initialChunk = packet.chunk_id == 0;
        let lastChunk = packet.flags.last_chunk;
        let buffer = this.packetBuffers.find(x => x.sequence == sequence);

        //If there is a packet stuck with the same sequence ID, drop it
        if (buffer && initialChunk){
            this.packetBuffers.splice(this.packetBuffers.findIndex(x => x.sequence == sequence), 1);
            buffer = undefined;
        }

        //If there is buffer for the given sequence
        if (buffer){
            buffer.onChunk(packet);
            if (lastChunk){
                this.onPacket(buffer.toPacket());
            }
        }
        //If this is a new packet
        else if (initialChunk){
            buffer = new PacketBuffer(packet, this.packetManager);
            this.packetBuffers.push(buffer);
        }else
            throw new Error("Invalid packet. Chunk ID, sequence and flags are incorrect");
    }


    //HELPERS
    /**
     * Determines the maximum allowed payload length
     * @param chunked
     * @param continuous If true, the initial packet info is omitted
     * @returns The maximum allowed payload length
     */
    private calculatePayloadSize(chunked: boolean, continuous: boolean): number{
        //Find the length of a zero payload packet
        let size = this.calculateEmptyPacketSize(chunked, continuous);

        //then find the max allowed payload length
        let maxPayload = this.maxPacketSize - size;
        return maxPayload;
    }
    /**
     * Returns the number of bytes for an empty packet
     * @param chunked 
     */
    private calculateEmptyPacketSize(chunked: boolean, continuous: boolean): number{
        //Create a zero payload packet
        let wrapper = new TransferWrapper();
        wrapper.flags.chunked_packet = chunked;
        wrapper.chunk_id = continuous ? 1 : 0;
        let size = wrapper.toBytes().readAll()!.length;

        return size;
    }
    /**
     * Throws error if the max payload size is too small
     * due to incorrect max packet size
     */
    private checkPayloadRestrictions(){
        const minPayload = 8; //at least 8 bytes is needed
        const payloadSize = Math.min(this.maxSinglePacketPayload, this.maxChunkedPacketPayload);
        if (payloadSize < minPayload){
            throw new Error(`The available payload size is too small (being ${payloadSize} bytes). A minimum of ${minPayload} bytes of payload is required. Try adjusting the maxPacketSize to ${this.maxPacketSize + (minPayload - payloadSize)} `);
        }
    }
    private extractPacket(wrapper: TransferWrapper): Serializable{
        let data = wrapper.payload;
        let cls = this.packetManager.getClsById(wrapper.packet_id);
        if (!cls)
            throw new Error(`Extracting packet failed. Packet with ID: ${wrapper.packet_id} does not exist`);
        
        //A few networking packets need access to packet manager instance
        let packet: Serializable = new cls();
        if (packet.requirePacketManager)
            packet.packetManager = this.packetManager;
        packet.fromBytes(new ByteStreamReader(data));

        return packet;
    }

    //ACK RELATIED METHODS
    private handleAck(packet: TransferWrapper){
        this.logger.trace("Handling ACK for connection with ID: ", this.id);
        //This method handles the inbound requests
        //and resets the number of packets sent
        //since the last request.

        //If the inbound packet is an ACK packet
        //reset delta and start flushing the (stuck)
        //outbound queue
        if (packet.flags.ack){
            this.logger.trace("Packet is ACK packet");
            this.packetsDeltaAck = 0;
            this.flushOutboundQueue();
        }

        //If the inbound packet requires ACK and this
        //client is also waiting for ACK, then the conflict
        //must be resolved
        if (packet.flags.require_ack && this.waitingForAck()) {
            this.logger.trace("Server and client both waiting for ACK");
            this.sendAck(true);
        }
        else if (packet.flags.require_ack && !this.waitingForAck()) {
            this.logger.trace("Only the other party is waiting for ACK");
            this.sendAck(false);        
        }
    }
    private sendAck(forceSend: boolean){
        this.logger.trace("Sending ACK from connection with ID: ", this.id, " forceSend: ", forceSend);
        //If forceSend, then create the ACK, place it at
        //the front of the queue (if there is), and send it
        //no matter if waitingForAck() is true
        if (forceSend){
            this.logger.trace("Sending an empty new packet");
            //let ack = TransferWrapper.ACK;
            this._sendPacket(new NullPacket(), true, true, true); //place at the beginning and flush
        }

        //If forceSend is false, then mark the first
        //element in the queue as an ACK, or create an ACK
        //and queue it
        if (!forceSend){
            this.logger.trace("Modifying the first element in the queue to be an ACK");
            let packet = this.outboundQueue[0];
            if (packet)
                packet.flags.ack = true;
            else
                this._sendPacket(new NullPacket(), true, false, true); //place at the beginning but do not flush immediately
        }
    }

    /**
     * Increments the outgoing chunked packet
     * sequence by 1 and handles roll overs
     */
    private incrementSequence(){ this.nextSequence = (this.nextSequence + 1) % 255; }
    private waitingForAck(): boolean{ return this.packetsDeltaAck >= this.packetsPerAck; }
    private waitingForDelay(): boolean{ return (Date.now() - this.lastSentAt) > this.sendRate; }

    //CONNECTION
    public disconnect(){
        this.logger.trace("connection disconnect with ID: ", this.id);
        this.requestHandler.onDisconnect();
        this.streamHandler.onDisconnect();
    }

    //PUBLIC METHODS
    public request(packet: Serializable, expectResponse: boolean, endpointUrl?: string): Promise<iRequestContext>{
        return this.requestHandler.request(packet, expectResponse, endpointUrl);
    }
    public onRequest(handler: CallbackHandlerElement<CallbackHandlerKey, CallbacksHandlerCb>): CallbackHandlerElement<CallbackHandlerKey, CallbacksHandlerCb>{
        return this.requestHandler.onRequest(handler);
    }
    public eventRequest(endpointUrl: string, payload: Serializable | undefined, onBeginCb?: BeginCallback): Observable<iRequestContext>{
        return this.requestHandler.eventRequest(endpointUrl, payload, onBeginCb);
    }
    public onEvent(handler: CallbackHandlerElement<CallbackHandlerKey, CallbacksHandlerCb>): CallbackHandlerElement<CallbackHandlerKey, CallbacksHandlerCb>{
        return this.requestHandler.onEvent(handler);
    }
    public stream(endpoint: string, callback: StreamCallback, errorCallback?: ErrorCallback, finalCallback?: FinalCallback): void{
        return this.streamHandler.stream(endpoint, callback, errorCallback, finalCallback);
    }
    public onStream(handler: CallbackHandlerElement<string, StreamCallbackHandler>): CallbackHandlerElement<string, StreamCallbackHandler>{
        return this.streamHandler.onStream(handler);
    }
}

/**
 * The class handles the processing of
 * chunked packets. It stores packets for
 * a given sequence, once all the data is
 * arrived, it is sent for further processing
 */
class PacketBuffer{
    sequence: number;
    packetId: number;
    chunks: ByteStreamWriter;
    private readonly packetManager: PacketManager;

    constructor(packet: TransferWrapper, packetManager: PacketManager){
        this.packetManager = packetManager;

        this.sequence = packet.packet_sequence;
        this.packetId = packet.packet_id;
        this.chunks = new ByteStreamWriter();
        this.onChunk(packet);
    }

    public onChunk(packet: TransferWrapper){
        this.chunks.write(packet.payload);
    }

    public toPacket(): Serializable{
        let cls = this.packetManager.getClsById(this.packetId);
        if (!cls)
            throw new Error(`Extracting packet failed. Packet with ID: ${this.packetId} does not exist`);

        let packet = new cls();
        packet.packetManager = this.packetManager;
        packet.fromBytes(this.chunks.toStreamReader());
        return packet;
    }
}