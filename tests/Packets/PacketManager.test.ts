import { ByteStream } from "../../src/ByteExpress/ByteStream/ByteStream";
import { ByteStreamReader } from "../../src/ByteExpress/ByteStream/ByteStreamReader";
import { PacketManager } from "../../src/ByteExpress/Packets/PacketManager";
import { Serializable } from "../../src/ByteExpress/Serialization/Serializable";

describe('Testing PacketManager class', () => {
    class TestCls1 extends Serializable{
        constructor(){super(undefined);}
        toJson(): string{ throw new Error("Not implemented"); }
        fromJson(data: string): boolean{ throw new Error("Not implemented"); }
        toBytes(): ByteStreamReader{ throw new Error("Not implemented"); }
        fromBytes(stream: ByteStreamReader): boolean{ throw new Error("Not implemented"); }
    }
    class TestCls2 extends Serializable{
        constructor(){super(undefined);}
        toJson(): string{ throw new Error("Not implemented"); }
        fromJson(data: string): boolean{ throw new Error("Not implemented"); }
        toBytes(): ByteStreamReader{ throw new Error("Not implemented"); }
        fromBytes(stream: ByteStreamReader): boolean{ throw new Error("Not implemented"); }
    }
    class TestCls3 extends Serializable{
        constructor(){super(undefined);}
        toJson(): string{ throw new Error("Not implemented"); }
        fromJson(data: string): boolean{ throw new Error("Not implemented"); }
        toBytes(): ByteStreamReader{ throw new Error("Not implemented"); }
        fromBytes(stream: ByteStreamReader): boolean{ throw new Error("Not implemented"); }
    }
    let instance1 = new TestCls1();
    let instance2 = new TestCls2();
    let instance3 = new TestCls3();

    let packetManager = new PacketManager();

    test('Adding packets', () => {
        packetManager.addPacket(TestCls1, 1);
        packetManager.addPackets([
            {cls: TestCls2, id: 2},
            {cls: TestCls3, id: 3},
        ]);
        let packets = packetManager.getPacketList();
        expect(packets).toContainEqual({cls: TestCls1, id: 1});
        expect(packets).toContainEqual({cls: TestCls2, id: 2});
        expect(packets).toContainEqual({cls: TestCls3, id: 3});
    });

    test('Get class by ID', () => {
        expect(packetManager.getClsById(1)).toBe(TestCls1);
    });
    test('Get class by instance', () => {
        expect(packetManager.getClsByInstance(instance1)).toBe(TestCls1);
    });
    test('Get ID by class', () => {
        expect(packetManager.getIdByCls(TestCls1)).toBe(1);
    });
    test('Get ID by instance', () => {
        expect(packetManager.getIdByInstance(instance1)).toBe(1);
    });
});