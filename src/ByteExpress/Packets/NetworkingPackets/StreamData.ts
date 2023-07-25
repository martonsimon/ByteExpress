import { Serializable } from "../../Serialization/Serializable";
import { ByteStreamReader } from "../../ByteStream/ByteStreamReader";
import { Flags } from "../../ByteUtils/Flags";
import { ByteUtils } from "../../ByteUtils/ByteUtils";
import { Payload } from "./Payload";
import { PacketManager } from "../PacketManager";

export class StreamData extends Serializable{
    flags: StreamDataFlags = new StreamDataFlags();
    streamId: number = 0; //2 bytes
    payload: Payload = new Payload();

    constructor(packetManager?: PacketManager){
        super();
        this.requirePacketManager = true;
        this.packetManager = packetManager;
    }
    setPayload(packet: Serializable){ this.payload.fromPacket(this.packetManager, packet); }
    toJson(): object{
        let obj = {
            __name: "StreamData",
            flags: {
                raw: this.flags.getByte(),
                sender_initiated_stream: this.flags.sender_initiated_stream,
                close_connection: this.flags.close_connection,
                error_response: this.flags.error_response,
            },
            streamId: this.streamId,
            payload: this.payload.toJson(),
        };
        return obj;
    }
    fromJson(data: string): boolean{
        throw new Error("Not implemented");
    }
    toBytes(): ByteStreamReader{
        this.initSerializer();
        
        this.addNumber(this.flags.getByte(), 1);
        this.addNumber(this.streamId, 2);
        this.addPacket(this.payload);

        return this.getSerialized();
    }
    fromBytes(stream: ByteStreamReader): boolean{
        this.initDeserializer(stream);
    
        this.flags.fromByte(this.getNumber(1));
        this.streamId = this.getNumber(2);
        this.payload = this.getPacket(Payload);

        return true;
    }
}

export class StreamDataFlags extends Flags{
    //indicates who initiated the stream, as the receiving
    //side needs to distinquish inbound and outbound streams
    sender_initiated_stream: boolean = false;
    //Indicates the last packet of the stream
    close_connection: boolean = false;
    //indicates an error
    error_response: boolean = false;

    constructor(initial?: number){ super(initial); }

    public getByte(): number{
        this.flagsByte = ByteUtils.setBit(this.flagsByte, 0, this.sender_initiated_stream);
        this.flagsByte = ByteUtils.setBit(this.flagsByte, 1, this.close_connection);
        this.flagsByte = ByteUtils.setBit(this.flagsByte, 2, this.error_response);

        return this.flagsByte;
    }

    public fromByte(byte: number): void {
        this.sender_initiated_stream = ByteUtils.getBit(byte, 0);
        this.close_connection = ByteUtils.getBit(byte, 1);
        this.error_response = ByteUtils.getBit(byte, 2);
    }
}