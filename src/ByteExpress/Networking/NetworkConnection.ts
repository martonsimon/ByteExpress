import { Callback, NetworkHandler } from "./NetworkHandler";
import { TransferWrapper } from "../Packets/NetworkingPackets/TransferWrapper";
import { Serializable } from "../Serialization/Serializable";
import { PacketManager } from "../Packets/PacketManager";

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
    private maxSinglePacketPayload: number; //may allowed payload length for unchuhnked packets
    private maxChunkedPacketPayload: number; //may allowed payload length for chunked packets
    private nextSequence: number; //uint8, next sequence ID for outgoing chunked packets
    private outboundQueue: Array<TransferWrapper>;
    private sendTimeout: NodeJS.Timeout | undefined;

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
        this.maxSinglePacketPayload = this.calculatePayloadSize(false);
        this.maxChunkedPacketPayload = this.calculatePayloadSize(true);
        this.nextSequence = 0;
        this.outboundQueue = new Array<TransferWrapper>();
        this.sendTimeout = undefined;
    }

    /**
     * Adds a packet to the outbound packet queue and split
     * into smaller chunks as necessary
     * @param packet Packet subclass of Serializable
     * @returns false if failed (e.g buffer is full)
     */
    sendPacket(packet: Serializable): boolean{
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
                let toRead = Math.min(this.maxChunkedPacketPayload, data.getRemainingAmount());
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
        this.outboundCb(this.id, packetData);

        if (this.sendRate){ //set a timeout
            this.sendTimeout = setTimeout(() => {
                this.sendTimeout = undefined;
                this.flushOutboundQueue();
            }, this.sendRate);
        }else{ //try to process the next
            this.flushOutboundQueue();
        }
    }

    /**
     * Determines the maximum allowed payload length
     * @param chunked
     * @returns The maximum allowed payload length
     */
    private calculatePayloadSize(chunked: boolean): number{
        //Create a zero payload packet
        let wrapper = new TransferWrapper();
        wrapper.flags.chunked_packet = chunked;
        let size = wrapper.toBytes().readAll()!.length;

        //then find the max allowed payload length
        let maxPayload = this.maxPacketSize - size;
        return maxPayload;
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