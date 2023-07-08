import { ByteStream } from "./src/ByteExpress/ByteStream/ByteStream";
import { ByteStreamReader } from "./src/ByteExpress/ByteStream/ByteStreamReader";
import { CallbackContext, NetworkHandler } from "./src/ByteExpress/Networking/NetworkHandler";
import { ErrorCause } from "./src/ByteExpress/Packets/NetworkingPackets/ErrorCause.enum";
import { NullPacket } from "./src/ByteExpress/Packets/NetworkingPackets/NullPacket";
import { Payload } from "./src/ByteExpress/Packets/NetworkingPackets/Payload";
import { RequestError } from "./src/ByteExpress/Packets/NetworkingPackets/RequestError";
import { RequestPacket } from "./src/ByteExpress/Packets/NetworkingPackets/RequestPacket";
import { ResponsePacket } from "./src/ByteExpress/Packets/NetworkingPackets/ResponsePacket";
import { StreamData } from "./src/ByteExpress/Packets/NetworkingPackets/StreamData";
import { StringPacket } from "./src/ByteExpress/Packets/NetworkingPackets/StringPacket";
import { TransferWrapper } from "./src/ByteExpress/Packets/NetworkingPackets/TransferWrapper";
import { PacketManager } from "./src/ByteExpress/Packets/PacketManager";
import { SamplePacket } from "./src/ByteExpress/Packets/SamplePacket";
import { TestPacket1 } from "./src/ByteExpress/Packets/TestPackets/TestPacket1";
import { Serializable } from "./src/ByteExpress/Serialization/Serializable";
import { of, pipe, from, Observable, Observer, Subject, Subscriber, concat, TeardownLogic, PartialObserver, Subscription } from 'rxjs';
import { tap, map } from 'rxjs/operators';

const world = 'world';

export function hello(who: string = world): string {
    return `Hello ${who}! `;
}

console.log("----------------------------");
console.log("Application started!");

export function outboundCb1(id: number, data: Uint8Array, ctx?: CallbackContext){
    //console.log(`[client]: Received data to be sent for connection ID = ${id}, data (${data.length}): ${data}`);
    //console.log(ctx?.original_packet.toJson());
    networkServer.inboundData(0, data);
}
export function outboundCb2(id: number, data: Uint8Array, ctx?: CallbackContext){
    //console.log(`[server]: Received data to be sent for connection ID = ${id}, data (${data.length}): ${data}`);
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



let handler = networkServer.onRequest(TestPacket1, ctx => {
    console.log("[server] got a request for TestPacket1");
    //networkServer.disconnectClient(0);
    //networkClient.disconnectClient(0);
    let data = ctx.req.payload as TestPacket1;
    console.log(data.toJson());
    ctx.res.end(200);
});
/*let handler2 = networkServer.onEvent("api/test", ctx => {
    console.log("[server] got an event request");
    ctx.res.write(new StringPacket("test1"));
    ctx.res.write(new StringPacket("test2"));
    ctx.res.end(200);
});*/

console.log("[client]: sennding request");
networkClient.request(0, testPacket1, true).then(ctx => {
    console.log("[client]: resolved request..");
    console.log(ctx.res.code);
    console.log(ctx.res.payload!.toJson());
}).catch(ctx => {
    console.log("[client] request errored");
});

/*networkClient.eventRequest(0, "api/test", undefined).subscribe({
    next: ctx => {
        console.log("[client]: event request");
        console.log(ctx.res.payload.toJson());  
        console.log(ctx.res.code);
    },
    error: err => {
        console.log("Error");
    },
    complete: () => console.log("complete")
});*/


networkServer.onStream("api/test", async stream => {
    console.log("[server]: got a stream request");
    let msg = await stream.readPacket(StringPacket);
    console.log("[server]: received message: " + msg.text);
    stream.sendAck();
    msg = await stream.readPacket(StringPacket);
    console.log("[server]: received message: " + msg.text);

    stream.sendPacket(new StringPacket(`response
    `));

    for (let i = 0; i < 1_000; i++){
        let msg = await stream.readPacket(StringPacket);
        if (i % 100 == 0)
            console.log(msg.toJson());
        stream.sendAck();
    }

    console.log("[server]: receiving a few data types");

    console.log(await stream.readNumber());
    console.log(await stream.readString());
    console.log(await stream.readBytes());
    stream.sendAck();

    console.log("[server]: waiting for packet when connection is aborted");
    //client won't send number
    //await stream.readNumber();
    stream.autoClose = false;

}, (stream, err) => {console.log("[server]: error"); console.log(err)}, () => console.log("[server]: stream done"));

const startTime = process.hrtime.bigint();
/*networkClient.stream(0, "api/test", async stream => {
    console.log("[client]: stream opened");
    stream.sendPacket(new StringPacket("first message"));
    await stream.readAck();
    stream.sendPacket(new StringPacket("second message"));

    let msg = await stream.readPacket(StringPacket);
    console.log("[client]: received message: " + msg.text);

    for (let i = 0; i < 1_000; i++){
        stream.sendPacket(new StringPacket("message " + i));
        await stream.readAck();
    }

    console.log("[client]: sending a few data types");
    console.log("aaaa");
    stream.sendNumber(10, 2);
    stream.sendString("Hello"); 
    stream.sendBytes(new Uint8Array([1, 2, 3, 4, 5]));
    await stream.readAck();

    console.log("[client]: intentionally closing connection and waiting for values to be read at the server");
    stream.autoClose = false;
    //stream.close();

}, (stream, err) => {
    console.log("[client]: stream error");
}, stream => {
    console.log("[client]: stream done");
    const endTime = process.hrtime.bigint();
    const executionTimeInMilliseconds = Number(endTime - startTime) / 1_000_000;
    console.log(`Task executed in ${executionTimeInMilliseconds} milliseconds`); 
});*/