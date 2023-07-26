import { Serializable } from "../../Serialization/Serializable";
import { ByteStreamReader } from "../../ByteStream/ByteStreamReader";

export class AckPacket extends Serializable{
    constructor(){
        super();
    }
    toJson(): object{
        return {msg: "<ack>"};
    }
    fromJson(data: string): boolean{
        throw new Error("Not implemented");
    }
    toBytes(): ByteStreamReader{
        this.initSerializer();
        this.addNumber(0, 1);
        return this.getSerialized();
    }
    fromBytes(stream: ByteStreamReader): boolean{
        this.initDeserializer(stream);
        this.getNumber(1);
        return true;
    }
}