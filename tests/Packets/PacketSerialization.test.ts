import { ByteStream } from "../../src/ByteExpress/ByteStream/ByteStream";
import { ByteStreamReader } from "../../src/ByteExpress/ByteStream/ByteStreamReader";
import { NullPacket } from "../../src/ByteExpress/Packets/NetworkingPackets/NullPacket";
import { TransferWrapper } from "../../src/ByteExpress/Packets/NetworkingPackets/TransferWrapper";
import { PacketManager } from "../../src/ByteExpress/Packets/PacketManager";
import { Serializable } from "../../src/ByteExpress/Serialization/Serializable";

describe('Testing packet serialization class', () => {
    test('TransferWrapper (unchunked)', () => {
        let original = new TransferWrapper();
        original.flags.chunked_packet = false;
        original.packet_id = 10;
        original.payload_length = 2;
        original.payload = new Uint8Array([1, 2]);

        let bytes = original.toBytes().readAll();
        let deserialized = new TransferWrapper();
        deserialized.fromBytes(new ByteStreamReader(bytes));
        
        expect(deserialized.flags.chunked_packet).toBe(false);
        expect(deserialized.packet_id).toBe(10);
        expect(deserialized.payload_length).toBe(2);
        expect(deserialized.payload).toEqual(new Uint8Array([1, 2]));
    });
    test('TransferWrapper (chunked)', () => {
        let original = new TransferWrapper();
        original.flags.chunked_packet = true;
        original.packet_sequence = 11;
        original.chunk_id = 12;
        original.packet_id = 10;
        original.payload_length = 2;
        original.payload = new Uint8Array([1, 2]);

        let bytes = original.toBytes().readAll();
        let deserialized = new TransferWrapper();
        deserialized.fromBytes(new ByteStreamReader(bytes));
        
        expect(deserialized.flags.chunked_packet).toBe(true);
        expect(deserialized.packet_sequence).toBe(11);
        expect(deserialized.chunk_id).toBe(12);
        expect(deserialized.payload_length).toBe(2);
        expect(deserialized.payload).toEqual(new Uint8Array([1, 2]));
    });
});