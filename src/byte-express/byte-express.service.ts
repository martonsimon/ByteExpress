import { Injectable, Logger } from '@nestjs/common';
import { Observable, of, Subscription } from 'rxjs';
import { ByteExpressGateway } from './byte-express.gateway';
import { ByteExpressServer, Serializable, iRequestContext, iStream } from 'byte-express';
import { ModulesContainer } from '@nestjs/core';
import { EventReturnSignature, EventSignature, MetaConstants, RequestSignature, RouteTypes, StreamReturnSignature, StreamSignature, Transport } from './route.decorator';

@Injectable()
export class ByteExpressService {
  private readonly logger = new Logger(ByteExpressService.name);
  private readonly wsNetwork: ByteExpressServer;

  constructor(private readonly gateway: ByteExpressGateway, private readonly modulesContainer: ModulesContainer) {
    this.logger.log("Initializing ByteExpressService");
    this.wsNetwork = gateway.networkServer;
    this.registerRoutes();
  }

  //Find ByteExpress Routes from controllers
  private findRoutes(): Array<Function>{
    const routes: Array<Function> = [];

    //Iterate through all modules and controllers
    this.modulesContainer.forEach(module => { module.controllers.forEach(controller => {
      //Inspect metadata and fine routes
      const target = controller.metatype;
      for (const key of Reflect.ownKeys(target.prototype)) {
        const method = target.prototype[key];
        if (typeof method === 'function' &&Reflect.getMetadata(MetaConstants.ROUTE, method)) {
          //console.log(`Method ${String(key)} has metadata value: ${Reflect.getMetadata(MetaConstants.ROUTE, method)}`);
          routes.push(method);
        }
      }
    });});

    this.logger.log(`Found ${routes.length} routes`);
    return routes;
  }

  private findHandler(transport: Transport): ByteExpressServer{
    switch(transport){
      case Transport.WEBSOCKET:
        return this.wsNetwork;
      default:
        throw new Error("Unknown transport type");
    }
  }

  private registerRequest(func: Function): void{
    const method: RequestSignature = func as RequestSignature;
    const endpoint: string | (new () => Serializable) = Reflect.getMetadata(MetaConstants.ENDPOINT, method);
    const server = this.findHandler(Reflect.getMetadata(MetaConstants.TRANSPORT, method));
    
    server.onRequest(endpoint, async (ctx) => {
      const payload: Serializable = ctx.req.payload;
      const result = await method(payload, ctx);
      ctx.res.write(result);
    });
  }

  private registerEvent(func: Function): void{
    const method: EventSignature = func as EventSignature;
    const methodResult: EventReturnSignature = method();
    const endpoint: string = Reflect.getMetadata(MetaConstants.ENDPOINT, method);
    const server = this.findHandler(Reflect.getMetadata(MetaConstants.TRANSPORT, method));

    let subscription: Subscription | undefined;
    
    server.onEvent(endpoint, (ctx: iRequestContext) => {
      //When inbound request arrives
      const payload: Serializable = ctx.req.payload;
      
      //onEvent supports async operations, so the promise should be resolved
      methodResult.onEvent(payload, ctx).then((source: Observable<Serializable>) => {
        //Supply values into the event
        //Stop event if the observable ends
        //or completes
        subscription = source.subscribe({
          next: (value: Serializable) => {
            console.log("sending: ", value.toJson());
            ctx.res.write(value);
          },
          error: (err: Error) => {
            this.logger.error(`Event request for path: ${endpoint} failed with error: ${err.message} returned by the onEvent observable. Terminating request`);
            ctx.res.end(404);
          },
          complete: () => {
            console.log("done");
            ctx.res.end(200);
          },
        });
      })
    }, (ctx: iRequestContext) => {
          //Closed
          //Note: closed is always called, another option will be added

          if (subscription && !subscription.closed) { subscription.unsubscribe(); }
          methodResult.onError(ctx).then(() => {
            //Error is handled by the controller
          });
    });
  }

  private registerStream(func: Function): void{
    const method: StreamSignature = func as StreamSignature;
    const methodResult: StreamReturnSignature = method();
    const endpoint: string = Reflect.getMetadata(MetaConstants.ENDPOINT, method);
    const server = this.findHandler(Reflect.getMetadata(MetaConstants.TRANSPORT, method));

    server.onStream(endpoint, async (ctx: iStream) => {
      //On stream cb
      return await methodResult.onStream(ctx);
    }, async (ctx: iStream, err: Error) => {
      //Error cb
      return await methodResult.onError(ctx, err);
    }, async (ctx: iStream) => {
      //Final cb
      return await methodResult.final(ctx);
    });
  }

  private registerRoutes(): void {
    let routes = this.findRoutes();
    let requests = routes.filter(x => Reflect.getMetadata(MetaConstants.ROUTE_TYPE, x) === RouteTypes.REQUEST);
    let streams = routes.filter(x => Reflect.getMetadata(MetaConstants.ROUTE_TYPE, x) === RouteTypes.STREAM);
    let events = routes.filter(x => Reflect.getMetadata(MetaConstants.ROUTE_TYPE, x) === RouteTypes.EVENT);

    requests.forEach(x => {this.registerRequest(x)});
    events.forEach(x => {this.registerEvent(x)});
    streams.forEach(x => {this.registerStream(x)});
  }
}
