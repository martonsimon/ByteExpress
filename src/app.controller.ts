import { Controller, Get, Header } from '@nestjs/common';
import { AppService } from './app.service';
import { ByteExpress } from './websocket/websocket.gateway';
import { ByteExpressServer, Serializable, iStream, StringPacket, iRequestContext } from 'byte-express';
import { ByteExpressEvent, ByteExpressRequest, ByteExpressStream, EVENT, EventReturnSignature, EventSignature, REQUEST, RequestReturnType, STREAM, testT } from './byte-express/route.decorator';
import { Observable, of } from 'rxjs';
import { tap, map, filter, delay } from 'rxjs/operators'

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  
  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get("test")
  getHelloTest(){
    return new StringPacket("test");
  }

  @ByteExpressRequest("test")
  async handlePing(payload: StringPacket, ctx: iRequestContext): Promise<Serializable>{
    return new StringPacket("test");
  }

  @testT()
  testtt(): number{
    return 1;
  }

  /*@ByteExpressEvent("test3")
  handleEvent() {
    return {
      onEvent: async (payload: StringPacket, ctx: iRequestContext) => {
        return of(new StringPacket("test2"), new StringPacket("test3"), new StringPacket("test3")).pipe(delay(1000)) as Observable<Serializable>;
      },
      onError: async (ctx: iRequestContext) => {},
    };
  }*/

  /*@ByteExpressStream("test4")
  async handleStream(){
    return {
      onStream: async (stream: iStream) => {

      },
      onError: async (stream: iStream, err: Error) => {

      },
      final: async (stream: iStream) => {

      }
    };
  }*/
}