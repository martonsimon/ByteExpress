import { Serializable } from "../Serialization/Serializable";
import { TestPacket1 } from "./TestPackets/TestPacket1";

type ClassIdPair = {
    cls: typeof Serializable,
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
        this._addPacket(TestPacket1,        6001);
    }

    /**
     * Adds a packet to the list with a given ID
     * @param packet - Constructor of a packet class extending Serializable
     * @param id - ID used for transmission from 0 - 60 000 (inclusive)
     */
    public addPacket(packet: typeof Serializable, id: number){ this._addPacket(packet, id, true); }
    private _addPacket(packet: typeof Serializable, id: number, rangeCheck: boolean = false){  
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
     * @returns - constructor | undefined
     */
    public getClsById(id: number): typeof Serializable | undefined{
        const pair = this.packetList.find(pair => pair.id === id);
        return pair ? pair.cls : undefined;
    }

    /**
     * Returns the constructor for an instance
     * @param packet - A packet instance
     * @returns - constructor | undefined
     */
    public getClsByInstance(packet: Serializable): typeof Serializable | undefined{
        const pair = this.packetList.find(pair => packet instanceof pair.cls);
        return pair ? pair.cls : undefined;
    }

    /**
     * Returns the ID for a given class constructor
     * @param cls - class constructor
     * @returns ID | undefined
     */ 
    public getIdByCls(cls: typeof Serializable): number | undefined{
        const pair = this.packetList.find(pair => pair.cls === cls);
        return pair ? pair.id : undefined;
    }

    /**
     * Returns the ID for a given class instance
     * @param packet - packet instance
     * @returns ID | undefined
     */
    public getIdByInstance(packet: Serializable): number | undefined{
        const pair = this.packetList.find(pair => packet instanceof pair.cls);
        return pair ? pair.id : undefined;
    }

    public getPacketList(): Array<ClassIdPair>{
        return this.packetList;
    }
}