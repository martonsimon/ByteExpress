import { Serializable } from "../../Serialization/Serializable";
import { ByteStreamReader } from "../../ByteStream/ByteStreamReader";

/**
 * A packet for sending bytes encapsulated
 * in a packet (used especially in streams).
 */
export class BytesPacket extends Serializable{
    public bytes: Uint8Array = new Uint8Array(0);

    constructor(bytes?: Uint8Array){
        super();
        this.bytes = bytes ? bytes : new Uint8Array(0);
    }
    toJson(): object{
        return {bytes: this.bytes};
    }
    fromJson(data: string): boolean{
        throw new Error("Not implemented");
    }
    toBytes(): ByteStreamReader{
        this.initSerializer();
        this.addNumber(this.bytes.length, 4);
        this.addBytes(this.bytes);
        return this.getSerialized();
    }
    fromBytes(stream: ByteStreamReader): boolean{
        this.initDeserializer(stream);
        let length = this.getNumber(4);
        this.bytes = this.getBytes(length);
        return true;
    }
}