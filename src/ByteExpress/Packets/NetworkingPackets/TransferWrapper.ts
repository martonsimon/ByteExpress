import { Serializable } from "../../Serialization/Serializable";
import { ByteStreamReader } from "../../ByteStream/ByteStreamReader";
import { ByteUtils } from "../../ByteUtils/ByteUtils";
import { Flags } from "../../ByteUtils/Flags";

/**
 * The class wraps other communication packets inside. The purpose
 * is to handle chunking a response into smaller fragments and to
 * deliver a packet in a whole to other processing classes,
 * like RequestHandler and StreamHandler
 * 
 * Packet overview:
 *      flags:
 *          ack
 *          require_ack
 *          chunked_packet
 *      packet_serial (if chunked)
 *      chunk_id (if chunked)
 *      packet_id (if !chunked || (chunked && chunk_id is 0))
 *      payload_length
 *      payload
 */
export class TransferWrapper extends Serializable{
    //Flags
    flags: TransferWrapperFlags;
    //Sequence is present on chunked packets. Tells
    //the receiver to which packet buffer a new fragment of
    //data should be appended
    packet_sequence: number; //1 byte
    //Chunk ID is present on chunked packets and are auto incremented. Receiver
    //can drop the packet if a chunk is missing
    chunk_id: number; //2 byte
    //Packet ID is present when (if !chunked || (chunked && chunk_id is 0))
    //and tells the ID of packet being sent in the payload. No need to append
    //it to every chunk.
    packet_id: number; //2 byte
    //payload length indicates the size of the payload in this
    //packet (fragment), not the assembled chunk total payload size
    payload_length: number; //2 byte
    //payload
    payload: Uint8Array; //payload_length

    private totalPacketLength: number;

    constructor(){
        super(); 
        this.requirePacketManager = true; 
        this.flags = new TransferWrapperFlags();
        this.packet_sequence = 0;
        this.chunk_id = 0;
        this.packet_id = 0;
        this.payload_length = 0;
        this.payload = new Uint8Array(0);
        this.totalPacketLength = -1;
    }
    toJson(): object{
        let payloadTypeCls: string | undefined = this.hasPacketManager && !this.flags.chunked_packet ? this.packetManager.getClsById(this.packet_id, true)?.name : undefined;
        let payloadObjText: string | object = "<undefined>";
        if (this.hasPacketManager && !this.flags.chunked_packet){
            const payloadObj: Serializable = new (this.packetManager.getClsById(this.packet_id, true)!)();
            payloadObj.packetManager = payloadObj.requirePacketManager ? this.packetManager : undefined;
            payloadObj.fromBytes(new ByteStreamReader(this.payload));
            payloadObjText = payloadObj.toJson();
        }

        const obj = {
            __name: "TransferWrapper",
            flags: {
                raw: this.flags.getByte(),
                ack: this.flags.ack,
                require_ack: this.flags.require_ack,
                chunked_packet: this.flags.chunked_packet,
                last_chunk: this.flags.last_chunk,
            },
            packet_sequence: this.packet_sequence,
            chunk_id: this.chunk_id,
            packet_id: this.packet_id,
            payload_length: this.payload_length,
            payload: this.payload.toString(),
            __payloadNote: this.flags.chunked_packet ? "The payload is just a chunk, cannot obtain cls and obj information" : undefined,
            __payloadCls: payloadTypeCls,
            __payloadObj: payloadObjText,
        };
        return obj;
    }
    fromJson(data: string): boolean{
        throw new Error("Not implemented");
    }
    toBytes(): ByteStreamReader{
        this.initSerializer();
        this.addNumber(this.flags.getByte(), 1);
        if (this.flags.chunked_packet){
            this.addNumber(this.packet_sequence, 1);
            this.addNumber(this.chunk_id, 2);
        }
        if (
            !this.flags.chunked_packet ||
            (this.flags.chunked_packet && this.chunk_id == 0)
        ){
            this.addNumber(this.packet_id, 2);
        }
        this.addNumber(this.payload_length, 2);
        this.addBytes(this.payload);

        return this.getSerialized();
    }
    fromBytes(stream: ByteStreamReader): boolean{
        this.initDeserializer(stream);
        let totalPacketSize = 0;
        //Read the flag to get information about packet structure
        if (!this.isAvailable(1))
            return false;
        this.flags.fromByte(this.getBytes(1)![0]);
        totalPacketSize += 1;

        //If the packet is chunked
        if (this.flags.chunked_packet){
            //Sequence and chunk id
            if (!this.isAvailable(3)) //1 byte for sequence and 2 byte for chunk id
                return false;
            this.packet_sequence = this.getNumber(1);
            this.chunk_id = this.getNumber(2);
            totalPacketSize += 3;
        }

        //Read the packet ID (for chunked and unchunked)
        if (this.chunk_id == 0){
            if (!this.isAvailable(2))
                return false;
            this.packet_id = this.getNumber(2);
            totalPacketSize += 2;
        }
        
        //Find payload length
        if (!this.isAvailable(2))
            return false;
        this.payload_length = this.getNumber(2);
        totalPacketSize += 2;
        totalPacketSize += this.payload_length;
        this.totalPacketLength = totalPacketSize;

        //Read payload
        if (!this.isAvailable(this.payload_length))
            return false;
        this.payload = this.getBytes(this.payload_length)!;

        return true;
    }
    public getTotalLength(): number { return this.totalPacketLength; }

    public static get ACK(): TransferWrapper{
        let ack = new TransferWrapper();
        ack.flags.ack = true;
        return ack;
    }
}

export class TransferWrapperFlags extends Flags{
    //Indicates that the receiver have processed the packets inside its buffer
    ack: boolean = false;
    //Indicates that the sender is awaiting ack before sending new data
    //to avoid overloading the receiver's buffer
    require_ack: boolean = false;
    //If the packet is chunked, it gets an ID and the payload
    //is delivered in chunks
    chunked_packet: boolean = false;
    //Indicates the last segment for a packet
    last_chunk: boolean = false;

    constructor(initial?: number){ super(initial); }

    public getByte(): number{
        this.flagsByte = ByteUtils.setBit(this.flagsByte, 0, this.ack);
        this.flagsByte = ByteUtils.setBit(this.flagsByte, 1, this.require_ack);
        this.flagsByte = ByteUtils.setBit(this.flagsByte, 2, this.chunked_packet);
        this.flagsByte = ByteUtils.setBit(this.flagsByte, 3, this.last_chunk);

        return this.flagsByte;
    }

    public fromByte(byte: number): void {
        this.ack = ByteUtils.getBit(byte, 0);
        this.require_ack = ByteUtils.getBit(byte, 1);
        this.chunked_packet = ByteUtils.getBit(byte, 2);
        this.last_chunk = ByteUtils.getBit(byte, 3);
    }
}