import { ByteStream } from "../../ByteStream/ByteStream";
import { ByteStreamReader } from "../../ByteStream/ByteStreamReader";
import { Serializable } from "../../Serialization/Serializable";

export class TestPacket1 extends Serializable{
    number1: number = 0;
    number2: number = 0;
    text1: string = "";
    text2: string = "";

    constructor(){
        super();
    }
    toJson(): object{
        const obj = {
            number1: this.number1,
            number2: this.number2,
            text1: this.text1,
            text2: this.text2,
        };
        return obj;
    }
    fromJson(data: string): boolean{
        const obj = JSON.parse(data);
        this.number1 = obj.number1;
        this.number2 = obj.number2;
        this.text1 = obj.text1;
        this.text2 = obj.text2;
        return true;
    }
    toBytes(): ByteStreamReader{
        this.initSerializer();
        this.addNumber(this.number1, 2);
        this.addNumber(this.number2, 2);
        this.addString(this.text1);
        this.addString(this.text2);
        
        return this.getSerialized();
    }
    fromBytes(stream: ByteStreamReader): boolean{
        this.initDeserializer(stream);
        this.number1 = this.getNumber(2);
        this.number2 = this.getNumber(2);
        this.text1 = this.getString();
        this.text2 = this.getString();

        return true;
    }
}