import { ByteStream } from "./src/ByteExpress/ByteStream/ByteStream";
import { TransferWrapper } from "./src/ByteExpress/Packets/NetworkingPackets/TransferWrapper";

const world = 'world';

export function hello(who: string = world): string {
    return `Hello ${who}! `;
}

console.log("----------------------------");
console.log("Application started!");

let wrapper = new TransferWrapper();
wrapper.flags.ack = true;
wrapper.flags.chunked_packet = true;
wrapper.packet_sequence = 2;
wrapper.chunk_id = 0;
wrapper.packet_id = 10;
wrapper.payload_length = 2;
wrapper.payload = new Uint8Array([255, 255]);

//console.log(wrapper.toJson());
//console.log(wrapper.toBytes().readAll());