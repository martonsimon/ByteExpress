import { Controller, Get, Header } from '@nestjs/common';
import { AppService } from './app.service';
import { ByteExpress } from './websocket/websocket.gateway';
import { ByteExpressServer, Serializable, iStream, StringPacket, iRequestContext, BytesPacket } from 'byte-express';
import { ByteExpressEvent, ByteExpressRequest, ByteExpressStream, EVENT, EventReturnSignature, EventSignature, REQUEST, RequestReturnType, STREAM, StreamReturnSignature } from './byte-express/route.decorator';
import { Observable, of, concatMap, take } from 'rxjs';
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
}