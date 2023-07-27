import { Injectable } from '@angular/core';
import { Socket } from 'ngx-socket-io';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ByteExpressClient, CallbackContext } from 'byte-express';

@Injectable({
  providedIn: 'root'
})
export class GatewayService {
  public get connected() { return this._connected; }
  public get closed() { return this._closed; }
  public get networkClient() { return this._networkClient; }

  socket: Socket;
  _connected: boolean = false;
  _closed: boolean = false;
  _networkClient: ByteExpressClient;
  iteration: number = 0;

  constructor(private webSocket: Socket) { 
    this.socket = webSocket;
    this.socket.on('connect', () => {
      this._connected = true;
      console.log("Connected");
    });
    this.socket.on('disconnect', () => {
      this._connected = false;
      console.log("Disconnected");
    });
    this.socket.on('byteexpress', this.inboundData.bind(this));

    this._networkClient = new ByteExpressClient(this.outboundCallback.bind(this), {connectionPacketsPerAck: 32, maxPacketSize: 8192, logLevel: 4});
    this.onConnect().subscribe(() => { this._networkClient.connect(); });
    this.onDisconnect().subscribe(() => { this._networkClient.disconnect(); });
  }

  public connect(){
    this._closed = false;
    this.socket.connect();
  }
  public disconnect(){
    this._closed = true;
    this.socket.disconnect();
  }

  public onConnect(): Observable<void>{ return this.socket.fromEvent<void>('connect'); }
  public onDisconnect(): Observable<void>{ return this.socket.fromEvent<void>('disconnect'); }

  private outboundCallback(id: number | string, data: Uint8Array, ctx?: CallbackContext){ this.socket.emit('byteexpress', data); }
  private inboundData(data: any){ this.networkClient.inboundData(0, new Uint8Array(data)); }
}
