import { Callback, NetworkHandler } from "./NetworkHandler";
import { TransferWrapper } from "../Packets/NetworkingPackets/TransferWrapper";
import { Serializable } from "../Serialization/Serializable";

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

    //Private states
    private lastSentAt: number; //time of last sent packet
    private packetsDeltaAck: number; //number of sent packets since a received ACK
    private maxSinglePacketPayload: number; //may allowed payload length for unchuhnked packets
    private maxChunkedPacketPayload: number; //may allowed payload length for chunked packets

    constructor(
        id: number,
        maxPacketSize: number,
        sendRate: number,
        packetsPerAck: number,
        requestQueueSize: number,
        streamQueueSize: number,
        outboundCb: Callback,
    ){
        this.id = id;
        this.maxPacketSize = maxPacketSize;
        this.sendRate = sendRate;
        this.packetsPerAck = packetsPerAck;
        this.requestQueueSize = requestQueueSize;
        this.streamQueueSize = streamQueueSize;
        this.outboundCb = outboundCb;

        this.lastSentAt = 0;
        this.packetsDeltaAck = 0;
        this.maxSinglePacketPayload = this.calculatePayloadSize(false);
        this.maxChunkedPacketPayload = this.calculatePayloadSize(true);
    }

    /**
     * Adds a packet to the outbound packet queue
     * @param packet Packet subclass of Serializable
     * @returns false if failed (e.g buffer is full)
     */
    queuePacket(packet: Serializable): boolean{
         let data = packet.toBytes();
         let length = data.getLength();

         if (length > this.maxSinglePacketPayload){ //if packet is too long
            //then chop it into smaller pieces
            let fragments = Math.ceil(length / this.maxSinglePacketPayload);
            for (let i = 0; i < fragments; i++){
                let toRead = Math.min(this.maxChunkedPacketPayload, data.getRemainingAmount());
                let fragmentData = data.read(toRead);
            }
         } else{
            //else just wrap it
            let wrapper = new TransferWrapper();

         }
         return true;
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
}