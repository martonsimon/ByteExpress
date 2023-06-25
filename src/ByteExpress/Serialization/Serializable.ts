import { ByteStream } from "../ByteStream/ByteStream";
import { ByteStreamReader } from "../ByteStream/ByteStreamReader";
import { ByteUtils } from "../ByteUtils/ByteUtils";
import { PacketManager } from "../Packets/PacketManager";

/**
 * The class serves as a base class for any packet
 * that needs to be sent over the network or
 * serialized/deserialized. Abstract methods for json
 * and byte ser/deser must be provided. It's methods
 * can be used to add numbers, string, bytes, packets when
 * serializing bytes and the other way around.
 */
export abstract class Serializable{
    stream: ByteStream | undefined = undefined; //for serializing
    streamReader: ByteStreamReader | undefined = undefined; //for deserializing

    //A few networking class needs access to a packet manager instance
    public requirePacketManager: boolean = false;
    public get packetManager(): PacketManager {if(!this._packetManager){throw new Error("A packet manager instance must be set before using it.");}return this._packetManager;}
    public set packetManager(value: PacketManager | undefined){this._packetManager = value;}
    private _packetManager: PacketManager | undefined;

    /**
     * Use the public properties and custom methods to modify
     * the state. Also, available abstract methods are:
     * - toJson
     * - fromJson
     * - toBytes
     * - fromBytes
     */
    constructor(){}

    public abstract toJson(): object;
    public abstract fromJson(data: string): boolean;
    public abstract toBytes(): ByteStreamReader;
    public abstract fromBytes(stream: ByteStreamReader): boolean;

    /**
     * Must be called inside the toBytes() method
     * to init the necessary properties
     */
    protected initSerializer(){ this.stream = new ByteStream(); }
    /**
     * Must be called inside the fromBytes() method
     * to init the necessary properties
     * @param stream StreamReader to use for reading
     */
    protected initDeserializer(stream: ByteStreamReader){ this.streamReader = stream; }
    /**
     * Use it inside the toBytes() method to return
     * the serialized packet in a ByteStreamReader
     * @returns The serialized packet wrapped in a stream
     */
    protected getSerialized(): ByteStreamReader{
        if (!this.stream)
            throw new Error("Call initSerializer() before returning");
        return this.stream.toStreamReader();
    }

    /**
     * Adds a new number to the serializer stream
     * @param number Number to add
     * @param length Number of bytes to add
     * @param isBigEndian IsBigEndian
     */
    public addNumber(number: number, length: number, isBigEndian: boolean = true){
        this.checkInit(true);
        let data = ByteUtils.numberToBytes(number, length, isBigEndian);
        this.stream!.write(data);
    }
    /**
     * Adds a new string to the serializer stream
     * @param text Text to add
     */
    public addString(text: string){
        this.checkInit(true);
        let data = ByteUtils.stringToBytes(text);
        let length = data.length;

        this.addNumber(length, 2);
        this.stream!.write(data);
    }
    /**
     * Adds a new packet to the serializer stream
     * @param packet Packet to be added
     */
    public addPacket(packet: Serializable){
        this.checkInit(true);
        let data = packet.toBytes().readAll();
        this.stream!.write(data!);
    }
    /**
     * Adds bytes to the serializer stream
     * @param bytes Bytes to add
     */
    public addBytes(bytes: Uint8Array){
        this.checkInit(true);
        this.stream!.write(bytes);
    }

    /**
     * Gets the next number from the deserializer stream
     * @param length Number of bytes to use
     * @param isBigEndian IsBigEndian
     * @returns The number
     */
    public getNumber(length: number, isBigEndian: boolean = true): number{
        this.checkInit(false);
        let number = ByteUtils.bytesToNumber(this.streamReader!.read(length)!, isBigEndian);
        return number;
    }

    /**
     * Gets the next string from the deserializer stream
     * @returns The string
     */
    public getString(): string{
        this.checkInit(false);
        let length = this.getNumber(2);
        let text = ByteUtils.bytesToString(this.streamReader!.read(length)!);
        return text;
    }

    /**
     * Gets the next packet from the deserializer stream
     * @param packetType Pass a class to choose the type
     * @returns The packet instance with it's properties in place
     */
    public getPacket<T extends Serializable>(packetType: new () => T): T{
        this.checkInit(false);
        let packet = new packetType();
        packet.packetManager = Object.getPrototypeOf(packet).requirePacketManager ? this.packetManager : undefined;
        packet.fromBytes(this.streamReader!);
        return packet;
    }
    /**
     * Gets the next n amount of bytes from the deserializer stream
     * @param amount Amount to read
     * @returns The bytes
     */
    public getBytes(amount: number): Uint8Array{
        this.checkInit(false);
        return this.streamReader!.read(amount)!;
    }

    /**
     * Checks if there is enough bytes available
     * to read
     * @param amount Amount to check
     * @returns boolean
     */
    public isAvailable(amount: number): boolean{
        this.checkInit(false);
        return this.streamReader!.getRemainingAmount() >= amount;
    }

    /**
     * Throws error if the serializer / deserializer
     * stream is undefined
     * @param forSerializing Indicates which stream to check
     */
    private checkInit(forSerializing: boolean){
        if (forSerializing && !this.stream)
            throw new Error("Packet must call initSerializer() before trying to serialize data");
        if (!forSerializing && !this.streamReader)
            throw new Error("Packet must call initDeserializer before trying to deserialize data.");
    }
}