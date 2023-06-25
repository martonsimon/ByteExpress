import { ByteStream } from "./src/ByteExpress/ByteStream/ByteStream";
import { ByteStreamReader } from "./src/ByteExpress/ByteStream/ByteStreamReader";
import { CallbackContext, NetworkHandler } from "./src/ByteExpress/Networking/NetworkHandler";
import { ErrorCause } from "./src/ByteExpress/Packets/NetworkingPackets/ErrorCause.enum";
import { Payload } from "./src/ByteExpress/Packets/NetworkingPackets/Payload";
import { RequestError } from "./src/ByteExpress/Packets/NetworkingPackets/RequestError";
import { RequestPacket } from "./src/ByteExpress/Packets/NetworkingPackets/RequestPacket";
import { ResponsePacket } from "./src/ByteExpress/Packets/NetworkingPackets/ResponsePacket";
import { TransferWrapper } from "./src/ByteExpress/Packets/NetworkingPackets/TransferWrapper";
import { PacketManager } from "./src/ByteExpress/Packets/PacketManager";
import { SamplePacket } from "./src/ByteExpress/Packets/SamplePacket";
import { TestPacket1 } from "./src/ByteExpress/Packets/TestPackets/TestPacket1";
import { Serializable } from "./src/ByteExpress/Serialization/Serializable";

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

export function outboundCb1(id: number, data: Uint8Array, ctx?: CallbackContext){
    console.log(`[client]: Received data to be sent for connection ID = ${id}, data (${data.length}): ${data}`);
    //console.log(ctx?.original_packet.toJson());
    networkServer.inboundData(0, data);
}
export function outboundCb2(id: number, data: Uint8Array, ctx?: CallbackContext){
    console.log(`[server]: Received data to be sent for connection ID = ${id}, data (${data.length}): ${data}`);
    //console.log(ctx?.original_packet.toJson());
    networkClient.inboundData(0, data);
}

let networkClient = new NetworkHandler(outboundCb1, {
    maxPacketSize: 255,
    connectionSendRate: 0,
});
networkClient.connectClient(0);
let networkServer = new NetworkHandler(outboundCb2, {
    maxPacketSize: 255,
    connectionSendRate: 0,
});
networkServer.connectClient(0);

let testPacket1 = new TestPacket1();
testPacket1.number1 = 2;
testPacket1.number2 = 3;
testPacket1.text1 = "packet to send by client";

let testPacket2 = new TestPacket1();
testPacket2.number1 = 2;
testPacket2.number2 = 3;
testPacket2.text1 = "packet to send by server";

/*let pm = new PacketManager();
let req = new RequestPacket(undefined, pm);
req.flags.require_response = true;
req.endpoint_id = 2;
req.request_id = 2;
req.setPayload(testPacket1);

let data = req.toBytes().readAll();
console.log(data);

let req2 = new RequestPacket(undefined, pm);
req2.fromBytes(new ByteStreamReader(data));
console.log(req2.toJson());

let res = new ResponsePacket(undefined, pm);
res.flags.close_connection = true;
res.request_id = 3;
res.code = 200;
res.setPayload(testPacket1);

console.log(res.toJson());
console.log(res.toBytes().readAll());

let res2 = new ResponsePacket(undefined, pm);
res2.fromBytes(res.toBytes());
console.log(res2.toJson());*/


let handler = networkServer.onRequest(0, TestPacket1, ctx => {
    console.log("[server] got a request for TestPacket1");
    let data = ctx.req.payload as TestPacket1;
    console.log(data.toJson());
    ctx.res.end(200);
});

console.log("[client]: sennding request");
networkClient.request(0, testPacket1, true).then(ctx => {
    console.log("[client]: resolved request ");
    console.log(ctx.res.payload!.toJson());
}).catch(ctx => {
    console.log("[client] request errored");
});
