import { ByteStreamReader } from "../../ByteStream/ByteStreamReader";
import { ByteUtils } from "../../ByteUtils/ByteUtils";
import { Flags } from "../../ByteUtils/Flags";
import { Serializable } from "../../Serialization/Serializable";
import { PacketManager } from "../PacketManager";
import { Payload } from "./Payload";

/**
 * This packet is sent as a response for requests
 * containing a payload or error.
 */
export class ResponsePacket extends Serializable{
    flags: ResponsePacketFlags = new ResponsePacketFlags();
    request_id: number = 0;
    code: number = 0; //a code indicating status
    payload: Payload = new Payload();

    private readonly packetManager: PacketManager;
    private payloadType: string | undefined;

    constructor(data?: ByteStreamReader | string | undefined, packetManager?: PacketManager){
        super(data);
        if (packetManager)
            this.packetManager = packetManager;
        else
            throw new Error("Please set a packet manager instance through the constructor");
    }

    setPayload(packet: Serializable){
        this.payloadType = packet.constructor.name;
        let packetId = this.packetManager.getIdByInstance(packet);
        let data = packet.toBytes();
        let length = data.getRemainingAmount();
        if (!packetId)
            throw new Error(`Could not get ID for instance of type ${packet.constructor.name}`);
        
        this.payload.packetId = packetId;
        this.payload.payloadLength = length;
        this.payload.payload = data.readRemaining()!;
    }

    toJson(): object{
        const obj = {
            flags: {
                raw: this.flags.getByte(),
                close_connection: this.flags.close_connection,
                error_response: this.flags.error_response,
            },
            request_id: this.request_id,
            code: this.code,
            payload: {
                payloadType: this.payloadType,
                packetId: this.payload.packetId,
                payloadLength: this.payload.payloadLength,
                payload: this.payload.payload,
            },
        };
        return obj;
    }
    fromJson(data: string): boolean{
        throw new Error("Not implemented");
    }
    toBytes(): ByteStreamReader{
        this.initSerializer();

        this.addNumber(this.flags.getByte(), 1);
        this.addNumber(this.request_id, 2);
        this.addNumber(this.code, 2);
        this.addPacket(this.payload);


        return this.getSerialized();
    }
    fromBytes(stream: ByteStreamReader): boolean{
        this.initDeserializer(stream);

        this.flags.fromByte(this.getNumber(1));
        this.request_id = this.getNumber(2);
        this.code = this.getNumber(2);
        this.payload = this.getPacket(Payload);


        return true;
    }

}

export class ResponsePacketFlags extends Flags{
    close_connection: boolean = false;
    error_response: boolean = false;

    constructor(initial?: number){ super(initial); }

    public getByte(): number{
        this.flagsByte = ByteUtils.setBit(this.flagsByte, 0, this.close_connection);
        this.flagsByte = ByteUtils.setBit(this.flagsByte, 1, this.error_response);

        return this.flagsByte;
    }

    public fromByte(byte: number): void {
        this.close_connection = ByteUtils.getBit(byte, 0);
        this.error_response = ByteUtils.getBit(byte, 1);
    }
}