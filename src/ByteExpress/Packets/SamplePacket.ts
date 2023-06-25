import { Serializable } from "../Serialization/Serializable";
import { ByteStreamReader } from "../ByteStream/ByteStreamReader";
import { ByteUtils } from "../ByteUtils/ByteUtils";
import { Flags } from "../ByteUtils/Flags";

export class SamplePacket extends Serializable{
    //sampleFlags: SamplepacketFlags = new SamplepacketFlags();
    //number1: number = 10;
    //text1: string = "Hi!";
    //bytes1: Uint8Array = new Uint8Array(0);

    constructor(){
        super();
    }
    toJson(): object{
        /*const obj = {
            flags: [
                {raw: this.sampleFlags.getByte()},
                {testVal: this.sampleFlags.testVal},
            ],
            number1: this.number1,
            text1: this.text1,
            bytes1: this.bytes1, 
        };
        return obj; */
        throw new Error("Not implemented");
    }
    fromJson(data: string): boolean{
        throw new Error("Not implemented");
    }
    toBytes(): ByteStreamReader{
        this.initSerializer();

        //this.addNumber(this.sampleFlags.getByte(), 1);
        //this.addNumber(this.number1, 2, true);
        //this.addString(this.text1);
        //this.addBytes(this.bytes1);
        throw new Error("Not implemented");

        return this.getSerialized();
    }
    fromBytes(stream: ByteStreamReader): boolean{
        this.initDeserializer(stream);

        //this.sampleFlags.fromByte(this.getNumber(1));
        //this.number1 = this.getNumber(2);
        //this.text1 = this.getString(3);
        //this.bytes1 = this.getBytes(0)!;

        throw new Error("Not implemented");
        return true;
    }
}
/*
export class SamplepacketFlags extends Flags{
    //PLACE FOR VARIABLES
    //testVal: boolean = false;

    constructor(initial?: number){ super(initial); }

    public getByte(): number{
        //CONVERT VALUES TO BYTE
        //this.flagsByte = ByteUtils.setBit(this.flagsByte, 0, this.testVal);

        return this.flagsByte;
    }

    public fromByte(byte: number): void {
        //CONVERT BYTE TO FLAGS
        //this.testVal = ByteUtils.getBit(byte, 0);
    }
}
*/