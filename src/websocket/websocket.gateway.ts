import { OnGatewayConnection, OnGatewayDisconnect, OnGatewayInit, SubscribeMessage, WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { ByteExpressServer, NullPacket, RequestContext, CallbackContext, StringPacket, NumberPacket } from 'byte-express';
import { Server, Socket } from 'socket.io';
import { CustomDecorator, Inject } from '@nestjs/common/decorators';
import { AppService } from 'src/app.service';
import { SetMetadata } from '@nestjs/common/decorators';

@WebSocketGateway({
  cors: true,
  pingInterval: 1000,
  pingTimeout: 5000,
})
export class WebsocketGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;
  sockets: Map<Socket, number> = new Map<Socket, number>();
  nthSocket: number = 0;
  networkServer: ByteExpressServer;

  constructor(){
    this.networkServer = new ByteExpressServer(this.outboundCallback.bind(this), {logLevel: 4, connectionPacketsPerAck: 32, maxPacketSize: 8192});

    this.networkServer.onRequest("ping", ctx => {
      console.log("Received ping request");
      ctx.res.end(200);
    });
    this.networkServer.onRequest("example2", ctx => {
      console.log("Received example2 request");
      let reqObj = JSON.parse((ctx.req.payload as StringPacket).text);
      let response = `Received your message with a random number of ${reqObj.rnd} and message of: ${reqObj.msg}`;
      ctx.res.write(new StringPacket(response));
    });
    this.networkServer.onStream("stream", async stream => {
      const bytesAmount = await stream.readNumber();
      const bytesPerAck = await stream.readNumber();
      console.log(`Received stream request with ${bytesAmount} bytes and ${bytesPerAck} bytes per ack`);

      //Receive the data
      for (let i = 0; i < Math.ceil(bytesAmount / bytesPerAck); i++) {
        const data = await stream.readBytes();
        stream.sendAck();
      }
    });
    this.networkServer.onEvent("events", ctx => {
      let data = JSON.parse((ctx.req.payload as StringPacket).text);
      const startFrom = data.startFrom;
      const intervals = data.intervals;
      let num = startFrom;
      console.log(`Received event request with startFrom: ${startFrom} and intervals: ${intervals}`);
      let intervalId = setInterval(() => {
        if (!ctx.completed){
          ctx.res.write(new NumberPacket(num++));
        }
        else
          clearInterval(intervalId);
      }, intervals);
    });
  }
  afterInit() {

  }

  handleConnection(client: any, ...args: any[]) {
    console.log("Client connected with id: " + client.id);
    let id = this.nthSocket++;
    this.sockets.set(client, id);
    this.networkServer.connectClient(id);
  }
  handleDisconnect(client: any) {
    console.log("Client disconnected with id: " + client.id);
    let id = this.sockets.get(client);
    this.networkServer.disconnectClient(id);
    this.sockets.delete(client);
  }

  @SubscribeMessage('byteexpress')
  handleInboundData(client: any, payload: any): void{
    let id = this.sockets.get(client);
    this.networkServer.inboundData(id, payload);
  }

  private outboundCallback(id: number | string, data: Uint8Array, ctx?: CallbackContext){
    let socket = [...this.sockets.keys()].find(socket => this.sockets.get(socket) == id);
    socket.emit('byteexpress', data);
  }
}

export const ByteExpress = (path: string): MethodDecorator => {
  console.log("ByteExpress decorator eval");
  return SetMetadata("byteexpress", path);

  


  const injectService = Inject(AppService);

  return (target: object, key: string | symbol, descriptor: PropertyDescriptor) => {
    console.log("ByteExpress decorator called");
    console.log(path);
    console.log(key.toString());

    

    const originalMethod = descriptor.value; //save a reference to the original method

    //redefine descriptor value within own function block
    descriptor.value = async function(...args: any[]) {
      console.log("overriden function");
      try {
        const result = await originalMethod.apply(this, args);
        const appService: AppService = this.service;
        console.log("appService: " + appService.getHello());
        return result;
      } catch (error) {
          const appService: AppService = this.service;
          console.log("appService: " + appService.getHello());
    
          // rethrow error, so it can bubble up
          throw error;
      }
    };
    return descriptor;
  };
};