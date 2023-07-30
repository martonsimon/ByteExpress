import { Controller } from '@nestjs/common';
import { Observable, of, concatMap, take, delay, interval, repeat, map } from 'rxjs';
import { NullPacket, NumberPacket, Serializable, StringPacket, iRequestContext, iStream } from 'byte-express';
import { ByteExpressEvent, ByteExpressRequest, ByteExpressStream, EventReturnSignature, StreamReturnSignature } from './route.decorator';

@Controller('byte-express')
export class ByteExpressController {
    // -----------------------------------
    //examples
    // -----------------------------------
    @ByteExpressRequest("test/request")
    async testRequest(payload: StringPacket, ctx: iRequestContext): Promise<Serializable>{
      console.log(payload);
      return new StringPacket("response");
    }
  
    @ByteExpressEvent("test/event")
    testEvent(): EventReturnSignature{
      return {
        onEvent: async (payload: StringPacket, ctx: iRequestContext): Promise<Observable<Serializable>> => {
          console.log(payload.text);
          let obs = of(
            new StringPacket('msg 1'),
            new StringPacket('msg 2'),
            new StringPacket('msg 3')).pipe(
            concatMap((value) => of(value).pipe(delay(1000))),take(3)) as Observable<Serializable>;
          return obs;
        },
        onError: async (ctx: iRequestContext) => {}
      }
    }
  
    @ByteExpressStream("test/stream")
    testStream(): StreamReturnSignature{
      return {
        onStream: async (stream: iStream) => {
          stream.sendString("first message");
          stream.sendString("second message");
          let response = await stream.readString();
          console.log(response);
        },
        onError: async (stream: iStream, err: Error) => {
          console.log("Stream error");
        },
        final: async (stream: iStream) => {
          console.log("Stream final");
        }
      };
    }

    // -----------------------------------

    //example 1
    @ByteExpressRequest("ping")
    async handlePing(payload: Serializable, ctx: iRequestContext): Promise<Serializable>{
        console.log("Received ping request");
        return new NullPacket();
    }

    //example 2
    @ByteExpressRequest("example2")
    async handleStringRequest(payload: StringPacket, ctx: iRequestContext): Promise<Serializable>{
        console.log("Received example2 request");
        let reqObj = JSON.parse(payload.text);
        let response = `Received your message with a random number of ${reqObj.rnd} and message of: ${reqObj.msg}`;
        return new StringPacket(response);
    }

    //example 3
    @ByteExpressStream("stream")
    handleStream(): StreamReturnSignature{
      return {
        onStream: async (stream: iStream) => {
            const bytesAmount = await stream.readNumber();
            const bytesPerAck = await stream.readNumber();
            console.log(`Received stream request with ${bytesAmount} bytes and ${bytesPerAck} bytes per ack`);

            //Receive the data
            for (let i = 0; i < Math.ceil(bytesAmount / bytesPerAck); i++) {
                const data = await stream.readBytes();
                stream.sendAck();
            }
        },
        onError: async (stream: iStream, err: Error) => { },
        final: async (stream: iStream) => { }
      };
    }

    //example 4
    @ByteExpressEvent("events")
    handleEvent(): EventReturnSignature{
      return {
        onEvent: async (payload: StringPacket, ctx: iRequestContext): Promise<Observable<Serializable>> => {
            let data = JSON.parse(payload.text);
            const startFrom = data.startFrom;
            const intervals = data.intervals;
            let num = startFrom;
            console.log(`Received event request with startFrom: ${startFrom} and intervals: ${intervals}`);

            return interval(intervals).pipe(
                take(100), 
                map(val => new NumberPacket(num++)),
                repeat()
            );
        },
        onError: async (ctx: iRequestContext) => {}
      }
    }
}
