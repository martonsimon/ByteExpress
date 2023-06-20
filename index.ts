import { ByteStream } from "./src/ByteExpress/ByteStream/ByteStream";
import { CallbackContext, NetworkHandler } from "./src/ByteExpress/Networking/NetworkHandler";
import { TransferWrapper } from "./src/ByteExpress/Packets/NetworkingPackets/TransferWrapper";
import { TestPacket1 } from "./src/ByteExpress/Packets/TestPackets/TestPacket1";

const world = 'world';

export function hello(who: string = world): string {
    return `Hello ${who}! `;
}

console.log("----------------------------");
console.log("Application started!");

/*let wrapper = new TransferWrapper();
wrapper.flags.ack = true;
wrapper.flags.chunked_packet = true;
wrapper.packet_sequence = 2;
wrapper.chunk_id = 0;
wrapper.packet_id = 10;
wrapper.payload_length = 2;
wrapper.payload = new Uint8Array([255, 255]);*/

//console.log(wrapper.toJson());
//console.log(wrapper.toBytes().readAll());

export function outboundCb(id: number, data: Uint8Array, ctx?: CallbackContext){
    console.log(`Received data for connection ID = ${id}, data (${data.length}): ${data}`);
    //console.log(ctx?.original_packet.toJson());
    network.inboundData(0, data);
}

let network = new NetworkHandler(outboundCb, {
    maxPacketSize: 255,
    connectionSendRate: 0,
});
network.connectClient(0);

let testPacket = new TestPacket1();
testPacket.number1 = 2;
testPacket.number2 = 3;
testPacket.text1 = "Hello, this is longer and longer text";
console.log(testPacket.toBytes().readAll());

network.debugSendRaw(0, testPacket);