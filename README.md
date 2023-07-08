# ByteExpress
**The library provides a way to send arbitrary byte packages over a networking medium.** It supports custom packets, sending and receiving packets, streams, requests in an async way.

- Works with TCP/IP, WebSockets and any protocol that is sequential
- Custom packets with serialization utility
- HTTP like requests, SSE and bidirectional async streams

# Table of content
- [Usage example](#usage-example)

# Usage example <a id="usage-example"></a>
For full explanation, see Usage
### Custom packet
```
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
```
client.request(new StringPacket("Payload"), true).then(ctx => {
    console.log("Request sent");

    let response = ctx.res.payload as StringPacket;
    console.log(response.text); // logs "Response"
}).catch(ctx => {
    console.log("Error")
});
```

### Handle request
```
server.onRequest(StringPacket, ctx => {
    console.log("Request received");

    let packet = ctx.req.payload as StringPacket;
    console.log(packet.text); // logs "Payload"

    ctx.res.write(new StringPacket("Response"));
});
```

### Bidirectional streams
```
client.stream("api/test", async stream => {
    stream.sendString("First message");
    stream.sendString("Second message");

    let resp1 = await stream.readString();
    let resp2 = await stream.readString();
    [...]
});
```