import { of, pipe, from, Observable, Observer, Subject, Subscriber, concat, TeardownLogic, PartialObserver, Subscription } from 'rxjs';
import { tap, map } from 'rxjs/operators';
import { ByteExpressClient, ByteExpressServer, ByteStream, ByteStreamReader, NetworkHandler, NullPacket, Payload, StringPacket, SamplePacket, Serializable, CallbackContext, RequestContext, iRequestContext } from "./index"; 

const world = 'world';


export function hello(who: string = world): string {
    return `Hello ${who}! `;
}

console.log("----------------------------");
console.log("Application started!");

export function clientOutbound(id: number | string, data: Uint8Array, ctx?: CallbackContext){
    //server.inboundData(0, data);
    setImmediate(() => {
        server.inboundData(0, data);
    });
}
export function serverOutbound(id: number | string, data: Uint8Array, ctx?: CallbackContext){
    //client.inboundData(0, data);
    setImmediate(() => {
        client.inboundData(0, data);
    });
}

let client = new ByteExpressClient(clientOutbound, {debugPrefix: "client", logLevel: 4});
let server = new ByteExpressServer(serverOutbound, {debugPrefix: "server", logLevel: 4});

client.connect();
server.connectClient(0); 

client.packetManager.addPacket(SamplePacket, 0);

server.onRequest(StringPacket, ctx => {
    console.log("Request received");

    let packet = ctx.req.payload as StringPacket;
    console.log("content: ", packet.text); // logs "Payload"

    ctx.res.write(new StringPacket("Response"));
});
server.onRequest("ping", ctx => {
    console.log("got pinged");
    ctx.res.end(200);
});

/*client.request(new StringPacket("Payload"), true).then(ctx => {
    let response = ctx.res.payload as StringPacket;
    console.log("response: ", response.text); // logs "Response"
}).catch(ctx => {
    console.log("Error")
});*/

export function ping(nthTimes: number){
    if (nthTimes == 0)
        return;
    client.request(new NullPacket(), true, "ping").then(ctx => {
        console.log(ctx.res.code);
        ping(nthTimes - 1);
    }).catch(ctx => {
        console.log("Error")
    });
}
//ping(4);

server.onEvent("event", ctx => {
    console.log("[server] got an event request");
    ctx.res.write(new StringPacket("test1"));
    ctx.res.write(new StringPacket("test2"));
    setTimeout(() => {
        if (!ctx.completed)
            ctx.res.write(new StringPacket("test3")); 
    }, 200);
    //ctx.res.end(200);
}, (ctx) => {
    console.log("[server] event request closed");
});


let rawStr = "123asdsdklfjasdklfjasldkfj123asdsdklfjasdklfjasldkfj123asdsdklfjasdklfjasldkfj123asdsdklfjasdklfjasldkfj123asdsdklfjasdklfjasldkfj123asdsdklfjasdklfjasldkfj123asdsdklfjasdklfjasldkfj123asdsdklfjasdklfjasldkfj123asdsdklfjasdklfjasldkfj123asdsdklfjasdklfjasldkfj123asdsdklfjasdklfjasldkfj123asdsdklfjasdklfjasldkfj123asdsdklfjasdklfjasldkfj123asdsdklfjasdklfjasldkfj123asdsdklfjasdklfjasldkfj123asdsdklfjasdklfjasldkfj123asdsdklfjasdklfjasldkfj123asdsdklfjasdklfjasldkfj123asdsdklfjasdklfjasldkfj123asdsdklfjasdklfjasldkfj123asdsdklfjasdklfjasldkfj123asdsdklfjasdklfjasldkfj123asdsdklfjasdklfjasldkfj123asdsdklfjasdklfjasldkfj123asdsdklfjasdklfjasldkfj123asdsdklfjasdklfjasldkfj123asdsdklfjasdklfjasldkfj123asdsdklfjasdklfjasldkfj123asdsdklfjasdklfjasldkfj123asdsdklfjasdklfjasldkfj123asdsdklfjasdklfjasldkfj123asdsdklfjasdklfjasldkfj123asdsdklfjasdklfjasldkfj123asdsdklfjasdklfjasldkfj123asdsdklfjasdklfjasldkfj123asdsdklfjasdklfjasldkfj123asdsdklfjasdklfjasldkfj123asdsdklfjasdklfjasldkfj123asdsdklfjasdklfjasldkfj123asdsdklfjasdklfjasldkfj123asdsdklfjasdklfjasldkfj123asdsdklfjasdklfjasldkfj123asdsdklfjasdklfjasldkfj123asdsdklfjasdklfjasldkfj123asdsdklfjasdklfjasldkfj123asdsdklfjasdklfjasldkfj123asdsdklfjasdklfjasldkfj123asdsdklfjasdklfjasldkfj123asdsdklfjasdklfjasldkfj123asdsdklfjasdklfjasldkfj123asdsdklfjasdklfjasldkfj123asdsdklfjasdklfjasldkfj123asdsdklfjasdklfjasldkfj123asdsdklfjasdklfjasldkfj123asdsdklfjasdklfjasldkfj123asdsdklfjasdklfjasldkfj123asdsdklfjasdklfjasldkfj123asdsdklfjasdklfjasldkfj123asdsdklfjasdklfjasldkfj123asdsdklfjasdklfjasldkfj123asdsdklfjasdklfjasldkfj123asdsdklfjasdklfjasldkfj123asdsdklfjasdklfjasldkfj123asdsdklfjasdklfjasldkfj";
let packet = new StringPacket(rawStr);
let packetBytes = packet.toBytes().readAll();
console.log(packetBytes.length)
let packet2 = new StringPacket();
packet2.fromBytes(new ByteStreamReader(packetBytes));

/*
server.onStream("api/test", async stream => {

});

server.onStream("api/test", async stream => {
    console.log(await stream.readString());
    console.log(await stream.readString());

    stream.sendString("response 1");
    stream.sendString("response 2");
});
client.stream("api/test", async stream => {
    stream.sendString("First message");
    stream.sendString("Second message");
    stream.sendPacket(new StringPacket("A packet"));
    stream.sendNumber(255, 1);
    stream.sendString("A string");
    stream.sendBytes(new Uint8Array([1, 2, 3, 4, 5]));
    stream.sendAck();
    await stream.readPacket(StringPacket);
    await stream.readNumber();
    await stream.readString();
    await stream.readBytes();
    await stream.readAck();

    console.log(await stream.readString());
    console.log(await stream.readString());
});
client.stream("api/test", async stream => {
    //logic
}, (stream, err) => {
    //error
}, stream => {
    //complete
});
*/





/*
export function outboundCb1(id: number, data: Uint8Array, ctx?: CallbackContext){
    //console.log(`[client]: Received data to be sent for connection ID = ${id}, data (${data.length}): ${data}`);
    //console.log(ctx?.original_packet.toJson());
    networkServer.inboundData(0, data);
}
export function outboundCb2(id: number, data: Uint8Array, ctx?: CallbackContext){
    //console.log(`[server]: Received data to be sent for connection ID = ${id}, data (${data.length}): ${data}`);
    //console.log(ctx?.original_packet.toJson());
    networkClient.inboundData(0, data);
}*/
/*
let networkClient = new NetworkHandler(outboundCb1, {
    maxPacketSize: 255,
    connectionSendRate: 0,
});
networkClient.connectClient(0);
let networkServer = new NetworkHandler(outboundCb2, {
    maxPacketSize: 255,
    connectionSendRate: 0,
});*/
/*networkServer.connectClient(0);

let testPacket1 = new TestPacket1();
testPacket1.number1 = 2;
testPacket1.number2 = 3;
testPacket1.text1 = "packet to send by client";

let testPacket2 = new TestPacket1();
testPacket2.number1 = 2;
testPacket2.number2 = 3;
testPacket2.text1 = "packet to send by server";*/


/*
let handler = networkServer.onRequest(TestPacket1, ctx => {
    console.log("[server] got a request for TestPacket1");
    //networkServer.disconnectClient(0);
    //networkClient.disconnectClient(0);
    let data = ctx.req.payload as TestPacket1;
    console.log(data.toJson());
    ctx.res.end(200);
});*/
/*let handler2 = networkServer.onEvent("api/test", ctx => {
    console.log("[server] got an event request");
    ctx.res.write(new StringPacket("test1"));
    ctx.res.write(new StringPacket("test2"));
    ctx.res.end(200);
});*/
/*
console.log("[client]: sennding request");
networkClient.request(0, testPacket1, true).then(ctx => {
    console.log("[client]: resolved request..");
    console.log(ctx.res.code);
    console.log(ctx.res.payload!.toJson());
}).catch(ctx => {
    console.log("[client] request errored");
});
*/
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

/*
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

const startTime = process.hrtime.bigint();*/
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