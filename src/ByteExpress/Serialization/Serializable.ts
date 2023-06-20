import { ByteStream } from "../ByteStream/ByteStream";
import { ByteStreamReader } from "../ByteStream/ByteStreamReader";
import { ByteStreamWriter } from "../ByteStream/ByteStreamWriter";
import { ByteUtils } from "../ByteUtils/ByteUtils";

export abstract class Serializable{
    stream: ByteStream | undefined = undefined; //for serializing
    streamReader: ByteStreamReader | undefined = undefined; //for deserializing

    constructor(data: ByteStreamReader | string | undefined){
        if (data instanceof ByteStreamReader){
            this.streamReader = data;
            this.fromBytes(data);
        }
        else if (typeof data === "string")
            this.fromJson(data);
    }
    public abstract toJson(): object;
    public abstract fromJson(data: string): boolean;
    public abstract toBytes(): ByteStreamReader;
    public abstract fromBytes(stream: ByteStreamReader): boolean;

    protected initSerializer(){
        if (this.stream){
            console.error("Serializer already initialized");
        }
        this.stream = new ByteStream();
    }
    protected initDeserializer(stream: ByteStreamReader){
        this.streamReader = stream;
    }
    protected getSerialized(): ByteStreamReader{
        if (!this.stream)
            throw new Error("Serializer must exists. Call initSerializer");
        return this.stream.toStreamReader();
    }
    private checkInit(){
        if (this.stream == undefined)
            console.error("Packet must call initSerializer() before trying to serialize or deserialize data");
    }

    public addNumber(number: number, length: number, isBigEndian: boolean = true){
        this.checkInit();
        let data = ByteUtils.numberToBytes(number, length, isBigEndian);
        this.stream?.write(data);
    }
    public addString(text: string){
        this.checkInit();
        let data = ByteUtils.stringToBytes(text);
        this.stream?.write(data);
    }
    public addPacket(packet: Serializable){
        this.checkInit();
        let data = packet.toBytes().readAll();
        this.stream?.write(data!);
    }
    public addBytes(bytes: Uint8Array){
        this.checkInit();
        this.stream?.write(bytes);
    }

    public getNumber(length: number, isBigEndian: boolean = true): number{
        if (!this.streamReader)
            throw new Error("stream is empty");
        let number = ByteUtils.bytesToNumber(this.streamReader.read(length)!, isBigEndian);
        return number;
    }

    public getString(length: number): string{
        if (!this.streamReader)
            throw new Error("stream is empty");
        let text = ByteUtils.bytesToString(this.streamReader.read(length)!);
        return text;
    }

    public getPacket<T extends Serializable>(packetType: new () => T): T{
        if (!this.streamReader)
            throw new Error("stream is empty");
        let packet = new packetType();
        packet.fromBytes(this.streamReader);
        return packet;
    }
    public getBytes(amount: number){
        if (!this.streamReader)
            throw new Error("stream is empty");
        return this.streamReader.read(amount);
    }

    public isAvailable(amount: number): boolean{
        if (!this.streamReader)
            throw new Error("stream is empty");
        return this.streamReader.getRemainingAmount() >= amount;
    }
}