# ByteExpress
**The library provides a way to send arbitrary byte packages over a networking medium.** It supports custom packets, sending and receiving packets, streams, requests in an async way.

- Works with TCP/IP, WebSockets and any protocol that is sequential
- Custom packets with serialization utility
- HTTP like requests, SSE and bidirectional async streams

# Table of content
- [Usage example](#usage-example)
- [Setup](#setup)
- [Custom packets](#custom-packets)
- [Send a request](#request)
- [Send bidirectional streams](#streams)

# Usage example <a id="usage-example"></a>
For full explanation, see Usage
### Custom packet
```typescript
export class CustomPacket extends Serializable{
    number1: number = 10;
    text1: string = "Custom!";

    toBytes(): ByteStreamReader{
        this.initSerializer();

        this.addNumber(this.number1, 2); //adds the first 2 bytes
        this.addString(this.text1); //UTF-8 encoded + length
        return this.getSerialized();
    }[... see: usage]
}
```

### Send request
```typescript
client.request(new StringPacket("Payload"), true).then(ctx => {
    console.log("Request sent");

    let response = ctx.res.payload as StringPacket;
    console.log(response.text); // logs "Response"
}).catch(ctx => {
    console.log("Error")
});
```

### Handle request
```typescript
server.onRequest(StringPacket, ctx => {
    console.log("Request received");

    let packet = ctx.req.payload as StringPacket;
    console.log(packet.text); // logs "Payload"

    ctx.res.write(new StringPacket("Response"));
});
```

### Bidirectional streams
```typescript
client.stream("api/test", async stream => {
    stream.sendString("First message");
    stream.sendString("Second message");

    let resp1 = await stream.readString();
    let resp2 = await stream.readString();
    [...]
});
```

# Setup <a id="setup"></a>
Note: ByteExpress is just a wrapper that encapsulates communication, so that it requires a channel to communicate,
like TCP/IP or WebSockets. For a full, working example, see: [link]
### For clients
```typescript
export function clientOutbound(id: number | string, data: Uint8Array, ctx?: CallbackContext){
    //Just send data over your TCP/IP connection directly to your server
    //Note: id is 0 in case of clients
}
//Create your instance and specify the outbound callback
let client = new ByteExpressClient(clientOutbound);

//Call it when the client is connected to the server over TCP/IP
client.connect();
```
### For servers
```typescript
export function serverOutbound(id: number | string, data: Uint8Array, ctx?: CallbackContext){
    //Just send data over your TCP/IP connection directly to your
    //client who is identified by "id"

    //Note: ID is defined by the user to identifiy the connection
}

//Create your instance and specify the outbound callback
let server = new ByteExpressServer(serverOutbound);

//When a new client is connected to the TCP/IP server, call connectionClient
//with an ID that uniquely identifies the connection
server.connectClient(0);
```

# Custom packets <a id="custom-packets"></a>
You can create your own custom packet that extends Serializable. Also, the subclass provides utilities that makes it easy to work with. To add a custom packet to the network:
```typescript
//ID in the range of 0 and 60 000
//Note: ID used for network transmission, serialization and deserialization
client.packetManager.addPacket(SamplePacket, 0);
server.packetManager.addPacket(SamplePacket, 0);
```
<details>
  <summary>Show/Hide CustomPacket example</summary>

  ```typescript
import { Serializable } from "../Serialization/Serializable";
import { ByteStreamReader } from "../ByteStream/ByteStreamReader";
import { ByteUtils } from "../ByteUtils/ByteUtils";
import { Flags } from "../ByteUtils/Flags";

export class SamplePacket extends Serializable{
    sampleFlags: SamplepacketFlags = new SamplepacketFlags();
    number1: number = 10;
    text1: string = "Hi!";
    bytes1: Uint8Array = new Uint8Array(0);

    constructor(){
        super();
    }
    toJson(): object{
        const obj = {
            flags: [
                {raw: this.sampleFlags.getByte()},
                {testVal: this.sampleFlags.testVal},
            ],
            number1: this.number1,
            text1: this.text1,
            bytes1: this.bytes1, 
        };
        return obj;
        throw new Error("Not implemented");
    }
    fromJson(data: string): boolean{
        throw new Error("Not implemented");
    }
    toBytes(): ByteStreamReader{
        this.initSerializer();

        this.addNumber(this.sampleFlags.getByte(), 1);
        this.addNumber(this.number1, 2, true);
        this.addString(this.text1);
        this.addBytes(this.bytes1);
        throw new Error("Not implemented");

        return this.getSerialized();
    }
    fromBytes(stream: ByteStreamReader): boolean{
        this.initDeserializer(stream);

        this.sampleFlags.fromByte(this.getNumber(1));
        this.number1 = this.getNumber(2);
        this.text1 = this.getString(3);
        this.bytes1 = this.getBytes(0)!;

        throw new Error("Not implemented");
        return true;
    }
}

export class SamplepacketFlags extends Flags{
    //PLACE FOR VARIABLES
    testVal: boolean = false;

    constructor(initial?: number){ super(initial); }

    public getByte(): number{
        //CONVERT VALUES TO BYTE
        this.flagsByte = ByteUtils.setBit(this.flagsByte, 0, this.testVal);

        return this.flagsByte;
    }

    public fromByte(byte: number): void {
        //CONVERT BYTE TO FLAGS
        this.testVal = ByteUtils.getBit(byte, 0);
    }
}
  ```
</details>

## Serializable utility
Use this utility function inside toBytes and fromBytes methods.
### For serializing
```typescript
//Must be called at the beginning of toBytes()
this.initSerializer();

//Returns the serialized data at the end of toBytes()
return this.getSerialized();

//Adds the first nth bytes of a number to the serializer byte stream
this.addNumber(255, 1); //1 byte from the number "255"
//Adds a UTF-8 encoded string with its length
this.addString("Hello world!");
//Adds bytes without length
this.addBytes(new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]));
//Adds a packet's serialized value (without length)
this.addPacket(new StringPacket());
```
### For deserializing
```typescript
//Call it at the beginning of fromBytes()
this.initDeserializer(stream);

//Gets a number with a given length
this.getNumber(2); //2 bytes
//Gets a string (size already included)
this.getString();
//Reads n amount of bytes
this.getBytes(8);
//Returns a packet of a given type
this.getPacket(StringPacket);
```
# Send a request <a id="request"></a>
```typescript
//Request handler for server
//Note: handlers can also be defined on the client
server.onRequest(StringPacket, ctx => {
    let packet = ctx.req.payload as StringPacket;
    console.log(packet.text); // "Payload"

    //Sends a response
    //Note: res.end(code) can also be used
    ctx.res.write(new StringPacket("Response"));
    //ctx.res.end(404);
});
server.onRequest("api/test", ctx => {/*code*/});

//Send the request
client.request(new StringPacket("Payload"), true).then(ctx => {
    let response = ctx.res.payload as StringPacket;
    console.log(response.text); // logs "Response"
}).catch(ctx => {
    console.log("Error")
});
client.request(new StringPacket("test"), true, "api/test").then(ctx => {/*code*/});
```

# Send bidirectional streams <a id="streams"></a>
```typescript
//Handle incoming stream
server.onStream("api/test", async stream => {
    console.log(await stream.readString()); //First message
    console.log(await stream.readString()); //Second message

    stream.sendString("response 1");
    stream.sendString("response 2");
});

//Initiate stream
client.stream("api/test", async stream => {
    stream.sendString("First message");
    stream.sendString("Second message");

    console.log(await stream.readString()); //response 1
    console.log(await stream.readString()); //response 2
});

//Error handling
//Note: onStream method also have error callback
client.stream("api/test", async stream => {
    //logic
}, (stream, err) => {
    //error
}, stream => {
    //complete
});
```
## Methods of stream
```typescript
//For sending
stream.sendPacket(new StringPacket("A packet"));
stream.sendNumber(255, 1);
stream.sendString("A string");
stream.sendBytes(new Uint8Array([1, 2, 3, 4, 5]));
stream.sendAck(); //acknowledgment (so the receiver is not overloaded with data

//For receiving
await stream.readPacket(StringPacket);
await stream.readNumber();
await stream.readString();
await stream.readBytes();
await stream.readAck();
```