import { ByteStream } from "../../src/ByteExpress/ByteStream/ByteStream";
import { ByteStreamReader } from "../../src/ByteExpress/ByteStream/ByteStreamReader";
import { Serializable } from "../../src/ByteExpress/Serialization/Serializable";

describe('Testing Serialization class', () => {
    class SerializationTestPacket1 extends Serializable{
        number: number = 0;
        constructor(){ super(); }
        toJson(): object{ throw new Error(""); }
        fromJson(data: string): boolean{ throw new Error(""); }
        toBytes(): ByteStreamReader{
            this.initSerializer();
            this.addNumber(this.number, 2);
            return this.getSerialized();
        }
        fromBytes(stream: ByteStreamReader): boolean{
            this.initDeserializer(stream);
            this.number = this.getNumber(2);

            return true;
        }
    }
    class SerializationTestPacket2 extends Serializable{
        number1: number = 0;
        text1: string = "";
        packet1: SerializationTestPacket1 | undefined;
        constructor(){ super(); }
        toJson(): object{ throw new Error(""); }
        fromJson(data: string): boolean{ throw new Error(""); }
        toBytes(): ByteStreamReader{
            this.initSerializer();
            this.addNumber(this.number1, 2);
            this.addString(this.text1);
            if (this.packet1)
                this.addPacket(this.packet1);
            
            return this.getSerialized();
        }
        fromBytes(stream: ByteStreamReader): boolean{
            this.initDeserializer(stream);
            //stream.printDebug();
            this.number1 = this.getNumber(2);
            console.log(this.number1);
            //stream.printDebug();
            this.text1 = this.getString();
            console.log(this.text1);
            //stream.printDebug();
            this.packet1 = this.getPacket(SerializationTestPacket1);
            //stream.printDebug();

            return true;
        }
        setPacket(packet: SerializationTestPacket1){
            this.packet1 = packet;
        }
    }
    
    test('[serialize] addNumber() and addString()', () => {
        let packet = new SerializationTestPacket2();
        packet.number1 = 100;
        packet.text1 = "Hello";
        let data = packet.toBytes().readAll();
        expect(data).toEqual(new Uint8Array([
            0, 100, //number 1
            0, 5, //text 1 length
            72, 101, 108, 108, 111, //text 1
        ]));
    });

    test('[serialize] add nested packet()', () => {
        let packet1 = new SerializationTestPacket1();
        let packet2 = new SerializationTestPacket2();
        packet1.number = 2;
        packet2.number1 = 100;
        packet2.text1 = "Hello";
        packet2.packet1 = packet1;
        let data = packet2.toBytes().readAll();
        expect(data).toEqual(new Uint8Array([
            0, 100, //number 1
            0, 5, //text 1 length
            72, 101, 108, 108, 111, //text 1
            0, 2, //nested packets data
        ]));
    });

    test('[deserialize] packet', () => {
        let packet1 = new SerializationTestPacket1();
        let packet2 = new SerializationTestPacket2();
        packet1.number = 2;
        packet2.number1 = 100;
        packet2.text1 = "Hello";
        packet2.packet1 = packet1;
        let data = packet2.toBytes().readAll();
        expect(data).toEqual(new Uint8Array([
            0, 100, //number 1
            0, 5, //text 1 length
            72, 101, 108, 108, 111, //text 1
            0, 2, //nested packets data
        ]));

        let stream = new ByteStreamReader(data);
        let newPacket = new SerializationTestPacket2();
        newPacket.fromBytes(new ByteStreamReader(data));
        expect(newPacket.toBytes().readAll()).toEqual(new Uint8Array([
            0, 100, //number 1
            0, 5, //text 1 length
            72, 101, 108, 108, 111, //text 1
            0, 2, //nested packets data
        ]));
    });
});