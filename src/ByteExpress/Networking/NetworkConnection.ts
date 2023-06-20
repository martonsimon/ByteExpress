import { Callback, NetworkHandler, CallbackContext } from "./NetworkHandler";
import { TransferWrapper } from "../Packets/NetworkingPackets/TransferWrapper";
import { Serializable } from "../Serialization/Serializable";
import { PacketManager } from "../Packets/PacketManager";
import { ByteStream } from "../ByteStream/ByteStream";
import { ByteStreamWriter } from "../ByteStream/ByteStreamWriter";
import { TestPacket1 } from "../Packets/TestPackets/TestPacket1";

/**
 * Manages and track the state of each connection,
 * as well as managing the fragmentation and buffering
 * of packets. Exposes request and stream methods, and 
 * provides callback for outbound data.
 */
export class NetworkConnection{
    //Settings variables
    readonly id: number; //Connection ID / client ID
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

    constructor(
        id: number,
        maxPacketSize: number,
        sendRate: number,
        packetsPerAck: number,
        requestQueueSize: number,
        streamQueueSize: number,
        outboundCb: Callback,
        packetManager: PacketManager,
    ){
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

        this.checkPayloadRestrictions();
    }

    /**
     * Adds a packet to the outbound packet queue and split
     * into smaller chunks as necessary
     * @param packet Packet subclass of Serializable
     * @returns false if failed (e.g buffer is full)
     */
    public sendPacket(packet: Serializable): boolean{
         let data = packet.toBytes();
         let length = data.getLength();
         let packetId = this.packetManager.getIdByInstance(packet);
         if (!packetId){
            console.error("Invalid outbound packet. Please set an ID inside PacketManager.ts or add the class using the Networking instance's addPacket method");
            return false;
         }

         if (length > this.maxSinglePacketPayload){
            //if packet is too long
            //then chop it into smaller pieces
            let sequence = this.nextSequence;
            this.incrementSequence();

            let fragments = Math.ceil(length / this.maxSinglePacketPayload);
            for (let i = 0; i < fragments; i++){
                let allowedPayload = i == 0 ? this.maxChunkedPacketPayload : this.maxChunkedPacketPayloadContinuous;
                let toRead = Math.min(allowedPayload, data.getRemainingAmount());
                let fragmentData = data.read(toRead);
                let wrapper = new TransferWrapper();
                wrapper.flags.chunked_packet = true;
                wrapper.packet_sequence = sequence;
                wrapper.chunk_id = i;
                wrapper.packet_id = packetId;
                wrapper.payload_length = toRead;
                wrapper.payload = fragmentData!;

                this.queuePacket(wrapper);
            }
         }
         else{
            //else just wrap it
            let wrapper = new TransferWrapper();
            wrapper.packet_id = packetId;
            wrapper.payload_length = length;
            wrapper.payload = data.readAll()!;

            this.queuePacket(wrapper);
         }
         this.flushOutboundQueue();
         return true;
    }

    /**
     * Queues a given transfer wrapper
     * @param packet Transfer object
     */
    private queuePacket(packet: TransferWrapper){
        this.outboundQueue.push(packet);
    }

    private flushOutboundQueue(){
        if (this.sendTimeout)
            return;
        if (this.outboundQueue.length == 0)
            return;
        if (this.waitingForAck())
            return;
        
        this.packetsDeltaAck++;
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
        this.outboundCb(this.id, packetData, ctx);

        if (this.sendRate){ //set a timeout
            this.sendTimeout = setTimeout(() => {
                this.sendTimeout = undefined;
                this.flushOutboundQueue();
            }, this.sendRate);
        }else{ //try to process the next
            this.flushOutboundQueue();
        }
    }

    public inboundData(data: Uint8Array): void{
        this.buffer.write(data);
        this._processBuffer();
    }
    private _processBuffer(){
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
        let success = packet.fromBytes(stream);

        //if success, reset buffer, handle packet
        //and try to read the remaining
        if (success){
            let newBuffer = stream.getRemainingAmount() ? stream.readRemaining() : new Uint8Array();
            this.buffer = new ByteStream(newBuffer);
            this.requiredPacketLength = -1;

            //Handle packet
            if (!packet.flags.chunked_packet)
                this.onPacket(this.extractPacket(packet));
            else
                this.onPacketChunk(packet);
            

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
        console.log("a packet arrived");
        console.log(packet.toJson());
    }
    private onPacketChunk(packet: TransferWrapper){

    }

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
        
        //let packet = new cls();
        return new TestPacket1();
    }
    /**
     * Increments the outgoing chunked packet
     * sequence by 1 and handles roll overs
     */
    private incrementSequence(){ this.nextSequence = (this.nextSequence + 1) % 255; }
    private waitingForAck(): boolean{ return this.packetsDeltaAck == this.packetsPerAck; }
    private waitingForDelay(): boolean{
        return (Date.now() - this.lastSentAt) > this.sendRate;
        
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

    constructor(packet: TransferWrapper){
        this.sequence = packet.packet_sequence;
        this.packetId = packet.packet_id;
        this.chunks = new ByteStreamWriter();
        this.onChunk(packet);
    }

    public onChunk(packet: TransferWrapper){
        this.chunks.write(packet.payload);
    }
}