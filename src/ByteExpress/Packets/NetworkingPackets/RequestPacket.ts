import { Serializable } from "../../Serialization/Serializable";
import { ByteStreamReader } from "../../ByteStream/ByteStreamReader";
import { ByteUtils } from "../../ByteUtils/ByteUtils";
import { Flags } from "../../ByteUtils/Flags";
import { PacketManager } from "../PacketManager";
import { Payload } from "./Payload";

/**
 * A packet that encapsulates payload, endpoint for a request.
 * The packet is used for request that do not require response,
 * as well as for those that require one or many.
 */
export class RequestPacket extends Serializable{
    //flags indicate the endpoint and response type
    flags: RequestPacketFlags = new RequestPacketFlags();
    //endpoint string or numeric representation is used
    //based on the endpoint_is_string flag
    endpoint_str: string = "";
    endpoint_id: number = 0;
    //id used when sending response(s)
    request_id: number = 0;
    //payload
    payload: Payload = new Payload();

    private payloadType: string | undefined;

    constructor(packetManager?: PacketManager){
        super();
        this.requirePacketManager = true;
        this.packetManager = packetManager;
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
            __name: "RequestPacket",
            flags: {
                raw: this.flags.getByte(),
                endpoint_is_string: this.flags.endpoint_is_string,
                require_response: this.flags.require_response,
                multiple_response: this.flags.multiple_response,
            },
            endpoint_str: this.endpoint_str,
            endpoint_id: this.endpoint_id,
            request_id: this.request_id,
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

        //flags
        this.addNumber(this.flags.getByte(), 1);
        //endpoints
        if (this.flags.endpoint_is_string)
            this.addString(this.endpoint_str);
        else
            this.addNumber(this.endpoint_id, 2);
        //request id
        this.addNumber(this.request_id, 2);
        //payload
        this.addPacket(this.payload);


        return this.getSerialized();
    }
    fromBytes(stream: ByteStreamReader): boolean{
        this.initDeserializer(stream);

        this.flags.fromByte(this.getNumber(1));
        if (this.flags.endpoint_is_string)
            this.endpoint_str = this.getString();
        else
            this.endpoint_id = this.getNumber(2);
        this.request_id = this.getNumber(2);
        this.payload = this.getPacket(Payload);


        return true;
    }

}

export class RequestPacketFlags extends Flags{
    endpoint_is_string: boolean = false;
    require_response: boolean = false; //there is an option where no response is necessary
    multiple_response: boolean = false;

    constructor(initial?: number){ super(initial); }

    public getByte(): number{
        this.flagsByte = ByteUtils.setBit(this.flagsByte, 0, this.endpoint_is_string);
        this.flagsByte = ByteUtils.setBit(this.flagsByte, 1, this.require_response);
        this.flagsByte = ByteUtils.setBit(this.flagsByte, 2, this.multiple_response);

        return this.flagsByte;
    }

    public fromByte(byte: number): void {
        this.endpoint_is_string = ByteUtils.getBit(byte, 0);
        this.require_response = ByteUtils.getBit(byte, 1);
        this.multiple_response = ByteUtils.getBit(byte, 2);
    }
}