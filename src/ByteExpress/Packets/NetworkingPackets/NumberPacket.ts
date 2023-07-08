import { Serializable } from "../../Serialization/Serializable";
import { ByteStreamReader } from "../../ByteStream/ByteStreamReader";

/**
 * Number Packet is used for sending integer
 * numbers. Used especially in streams where the 
 * user sends a single number
 */
export class NumberPacket extends Serializable{
    public num: number = 0;
    public length: number = 4;

    constructor(num?: number, lengtt?: number){
        super();
        this.num = num ? num : 0;
        this.length = lengtt ? lengtt : 4;
    }
    toJson(): object{
        return {number: this.num};
    }
    fromJson(data: string): boolean{
        throw new Error("Not implemented");
    }
    toBytes(): ByteStreamReader{
        this.initSerializer();
        this.addNumber(this.length, 2);
        this.addNumber(this.num, this.length);
        return this.getSerialized();
    }
    fromBytes(stream: ByteStreamReader): boolean{
        this.initDeserializer(stream);
        this.length = this.getNumber(2);
        this.num = this.getNumber(this.length);
        return true;
    }
}