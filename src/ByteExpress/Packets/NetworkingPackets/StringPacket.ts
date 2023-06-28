import { Serializable } from "../../Serialization/Serializable";
import { ByteStreamReader } from "../../ByteStream/ByteStreamReader";

/**
 * A simple packet that hold a string. Use it
 * for debugging purposes and tests. If a packet
 * needs a string field, use the serializer's
 * addString() method.
 */
export class StringPacket extends Serializable{
    public text: string = "<empty>"

    constructor(text?: string){
        super();
        this.text = text ? text : "<empty>";
    }
    toJson(): object{
        return {msg: this.text};
    }
    fromJson(data: string): boolean{
        throw new Error("Not implemented");
    }
    toBytes(): ByteStreamReader{
        this.initSerializer();
        this.addString(this.text);
        return this.getSerialized();
    }
    fromBytes(stream: ByteStreamReader): boolean{
        this.initDeserializer(stream);
        this.text = this.getString();
        return true;
    }
}