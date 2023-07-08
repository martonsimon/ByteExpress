import { Serializable } from "../Serialization/Serializable";

import { TestPacket1 } from "./TestPackets/TestPacket1";
import { TransferWrapper } from "./NetworkingPackets/TransferWrapper";
import { NullPacket } from "./NetworkingPackets/NullPacket";
import { RequestPacket } from "./NetworkingPackets/RequestPacket";
import { ResponsePacket } from "./NetworkingPackets/ResponsePacket";
import { RequestError } from "./NetworkingPackets/RequestError";
import { Payload } from "./NetworkingPackets/Payload";
import { StringPacket } from "./NetworkingPackets/StringPacket";
import { StreamRequest } from "./NetworkingPackets/StreamRequest";
import { StreamData } from "./NetworkingPackets/StreamData";
import { AckPacket } from "./NetworkingPackets/AckPacket";
import { NumberPacket } from "./NetworkingPackets/NumberPacket";
import { BytesPacket } from "./NetworkingPackets/BytesPacket";

type ClassIdPair = {
    cls: new () => Serializable,
    id: number
}
/**
 * Responsible for storing packets and their IDs
 * for a given instance. Used when transmitting packets
 * over a network that needs to be serialized and deserialized
 */
export class PacketManager{
    //Stores the packets that can be filled up through the networking instance
    private packetList: Array<ClassIdPair> = [];

    constructor() {
        //Set up packets required for networking (in the range of 60001 -> 65536 both inclusive)
        this._addPacket(TestPacket1,            60_001);
        this._addPacket(TransferWrapper,        60_002);
        this._addPacket(NullPacket,             60_003);
        this._addPacket(RequestPacket,          60_004);
        this._addPacket(ResponsePacket,         60_005);
        this._addPacket(RequestError,           60_006);
        this._addPacket(Payload,                60_007);
        this._addPacket(StringPacket,           60_008);
        this._addPacket(StreamRequest,          60_009);
        this._addPacket(StreamData,             60_010);
        this._addPacket(AckPacket,              60_011);
        this._addPacket(NumberPacket,           60_012);
        this._addPacket(BytesPacket,            60_013);

        this.checkRepeatedIndices();
    }

    /**
     * Adds a packet to the list with a given ID
     * @param packet - Constructor of a packet class extending Serializable
     * @param id - ID used for transmission from 0 - 60 000 (inclusive)
     */
    public addPacket(packet: new () => Serializable, id: number){ this._addPacket(packet, id, true); }
    private _addPacket(packet: new () => Serializable, id: number, rangeCheck: boolean = false){  
        if (rangeCheck && (id < 0 || id > 60000))
            throw new Error("The packet ID must be in the range of 0 and 60 000");
        this.packetList.push({cls: packet, id: id});
    }
    /**
     * Adds a list of packets to the list with a given ID
     * @param packets - An array of ClassIdPairs
     */
    public addPackets(packets: Array<ClassIdPair>){
        for (const {cls, id} of packets){
            this.addPacket(cls, id);
        }
    }

    /**
     * Returns the constructor for a packet with a given ID
     * @param id - ID of a packet
     * @param throwError - Throws error if a given packet is not present instead of returning undefined
     * @returns - constructor | undefined
     */
    public getClsById(id: number, throwError: boolean = false): (new () => Serializable) | undefined{
        const pair = this.packetList.find(pair => pair.id === id);
        if (!pair && throwError)
            throw new PacketNotFound(id);
        return pair ? pair.cls : undefined;
    }

    /**
     * Returns the constructor for an instance
     * @param packet - A packet instance
     * @param throwError - Throws error if a given packet is not present instead of returning undefined
     * @returns - constructor | undefined
     */
    public getClsByInstance(packet: Serializable, throwError: boolean = false): (new () => Serializable) | undefined{
        const pair = this.packetList.find(pair => packet instanceof pair.cls);
        if (!pair && throwError)
            throw new PacketNotFound(packet);
        return pair ? pair.cls : undefined;
    }

    /**
     * Returns the ID for a given class constructor
     * @param cls - class constructor
     * @param throwError - Throws error if a given packet is not present instead of returning undefined
     * @returns ID | undefined
     */ 
    public getIdByCls(cls: new () => Serializable, throwError: boolean = false): number | undefined{
        const pair = this.packetList.find(pair => pair.cls === cls);
        if (!pair && throwError)
            throw new PacketNotFound(cls);
        return pair ? pair.id : undefined;
    }

    /**
     * Returns the ID for a given class instance
     * @param packet - packet instance
     * @param throwError - Throws error if a given packet is not present instead of returning undefined
     * @returns ID | undefined
     */
    public getIdByInstance(packet: Serializable, throwError: boolean = false): number | undefined{
        const pair = this.packetList.find(pair => packet instanceof pair.cls);
        if (!pair && throwError)
            throw new PacketNotFound(packet);
        return pair ? pair.id : undefined;
    }

    /**
     * Checks if there are repeated indices in the
     * list and raises an error if so
     */
    public checkRepeatedIndices(): void{
        //Set to store checked keys
        const keys = new Set<number>();
        for (const obj of this.packetList){
            if (!keys.has(obj.id))
                keys.add(obj.id);
            else
                throw new Error(`Duplicate key in PacketManager with ID: ${obj.id}`);
        }
    }

    public getPacketList(): Array<ClassIdPair>{
        return this.packetList;
    }
}

class PacketNotFound extends Error{
    constructor(key: number | Serializable | (new () => Serializable)){
        let msg: string;
        if (typeof key == "number")
            msg = "Packet not found with the following ID: " + key.toString();
        else if (typeof key == "function")
            msg = "Packet not found for the following constructor: " + key.name.toString();
        else
            msg = "Packet not found for instance of the class: " + key.constructor.name;
        super(msg);
        this.name = "PacketNotFound";
    }
}