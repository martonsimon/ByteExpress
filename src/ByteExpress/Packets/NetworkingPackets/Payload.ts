import { ByteStreamReader } from "../../ByteStream/ByteStreamReader";
import { Serializable } from "../../Serialization/Serializable";
import { PacketManager } from "../PacketManager";

/**
 * Makes easier to encode and decode payloads
 */
export class Payload extends Serializable{
    packetId: number = 0;
    payloadLength: number = 0;
    payload: Uint8Array = new Uint8Array();

    constructor(data?: ByteStreamReader | string | undefined){
        super(data);
    }
    set(packetId: number, payloadLength: number, payload: Uint8Array){
        this.packetId = packetId;
        this.payloadLength = payloadLength;
        this.payload = payload;
    }
    toJson(): object{
        const obj = {
            packetId: this.packetId,
            payloadLength: this.payloadLength,
            payload: this.payload,
        };
        return obj;
    }
    fromJson(data: string): boolean{
        throw new Error("Not implemented");
    }
    toBytes(): ByteStreamReader{
        this.initSerializer();

        this.addNumber(this.packetId, 2);
        this.addNumber(this.payloadLength, 2);
        this.addBytes(this.payload);

        return this.getSerialized();
    }
    fromBytes(stream: ByteStreamReader): boolean{
        this.initDeserializer(stream);

        this.packetId = this.getNumber(2);
        this.payloadLength = this.getNumber(2);
        this.payload = this.getBytes(this.payloadLength)!;

        return true;
    }

    /**
     * Returns a packet created from the given payload
     * informations
     * @param packetManager Packet Manager for getting the class based on the ID
     */
    public toPacket(packetManager: PacketManager): Serializable{
        let cls = packetManager.getClsById(this.packetId);
        if (!cls)
            throw new Error(`Packet with ID ${this.packetId} doesn't exists.`);
        let packet = new cls();
        packet.fromBytes(new ByteStreamReader(this.payload));

        return packet;
    }
}