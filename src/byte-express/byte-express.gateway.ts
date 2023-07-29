import { SubscribeMessage, WebSocketGateway, WebSocketServer } from '@nestjs/websockets';
import { OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect } from '@nestjs/websockets';
import { ByteExpressServer, CallbackContext } from 'byte-express';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({
  cors: true,
  pingInterval: 1000,
  pingTimeout: 5000,
})
export class ByteExpressGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  server: Server;
  networkServer: ByteExpressServer;
  sockets: Array<Socket>;

  constructor() {
    this.networkServer = new ByteExpressServer(this.outboundCallback.bind(this), {
      logLevel: 4,
      connectionPacketsPerAck: 32,
      maxPacketSize: 8192
    });
  }

  //Gateway WS connection related functionalities
  afterInit(server: Server){ this.server = server; }
  handleConnection(client: any, ...args: any[]) {
    console.log("Client connected with id: " + client.id);
  }
  handleDisconnect(client: any) {
    console.log("Client disconnected with id: " + client.id);
  }

  //ByteExpress related functionalities
  @SubscribeMessage('byteexpress')
  handleInboundData(client: any, payload: any): void{
    let id = client.id;
    this.networkServer.inboundData(id, payload);
  }

  outboundCallback(id: number | string, data: Uint8Array, ctx?: CallbackContext){
    let socket = this.sockets.find(x => x.id === id);
    socket.emit('byteexpress', data);
  }
}
