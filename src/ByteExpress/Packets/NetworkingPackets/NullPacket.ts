import { ByteStreamReader } from "../../ByteStream/ByteStreamReader";
import { Serializable } from "../../Serialization/Serializable";
import { PacketManager } from "../PacketManager";

export class NullPacket extends Serializable{

    constructor(data?: ByteStreamReader | string | undefined){
        super(data);
    }
    toJson(): object{
        return {msg: "<null packet>"};
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