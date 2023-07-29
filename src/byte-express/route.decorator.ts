import { applyDecorators, SetMetadata } from '@nestjs/common';
import { Observable } from 'rxjs';
import { iRequestContext, iStream, Serializable } from 'byte-express';

export const enum RouteTypes { REQUEST, STREAM, EVENT }; //Type of the request
export const enum Transport { WEBSOCKET }; //Which gateway to use

export const REQUEST: RouteTypes = RouteTypes.REQUEST;
export const STREAM: RouteTypes = RouteTypes.STREAM;
export const EVENT: RouteTypes = RouteTypes.EVENT;

//Constants used for settings and retrieving metadata
export const MetaConstants = {
    ROUTE: 'ByteExpressRoute',
    ENDPOINT: 'ByteExpressEndpoint',
    ROUTE_TYPE: 'ByteExpressRouteType',
    TRANSPORT: 'ByteExpressTransport',
};

//Sets metadata for the route
export const ByteExpressRouteMeta = (endpoint: string | (new() => Serializable), routeType: RouteTypes, transport: Transport = Transport.WEBSOCKET) => applyDecorators(
    SetMetadata(MetaConstants.ROUTE, true),
    SetMetadata(MetaConstants.ENDPOINT, endpoint),
    SetMetadata(MetaConstants.ROUTE_TYPE, routeType),
    SetMetadata(MetaConstants.TRANSPORT, transport),
);


//Signatures of the functions inside the controllers
export type RequestSignature = (payload: Serializable, ctx?: iRequestContext) => Promise<Serializable>;
export type StreamSignature = () => Promise<StreamReturnSignature>;
export type EventSignature = () => (EventReturnSignature | Observable<Serializable>);

export type RequestReturnType = Promise<Serializable> | Serializable;
export type StreamReturnSignature = {
    onStream: (stream: iStream) => void | Promise<void>,
    onError: (stream: iStream, err: Error) => void | Promise<void>,
    final: (stream: iStream) => void | Promise<void>,
};
export type EventReturnSignature = {
    onEvent: (payload: Serializable, ctx?: iRequestContext) => Promise<Observable<Serializable>>,
    onError: (ctx: iRequestContext) => Promise<void>,
};


//Descriptors for the method decorators in conjunction with the
//appropriate signatures to enforce type safety inside controllers
export type RequestDescriptor = (
    target: object,
    key: string,
    descriptor: TypedPropertyDescriptor<RequestSignature>
) => TypedPropertyDescriptor<RequestSignature>;

export type StreamDescriptor = (
    target: object,
    key: string,
    descriptor: TypedPropertyDescriptor<StreamSignature>
) => TypedPropertyDescriptor<StreamSignature>;

export type EventDescriptor = (
    target: object,
    key: string,
    descriptor: TypedPropertyDescriptor<() => EventReturnSignature | string>
) => TypedPropertyDescriptor<() => EventReturnSignature | string>;

export const ByteExpressRequest = (endpoint: string | (new() => Serializable), transport: Transport = Transport.WEBSOCKET): RequestDescriptor => {
    return ByteExpressRouteMeta(endpoint, REQUEST, transport) as RequestDescriptor;
};
export const ByteExpressStream = (endpoint: string | (new() => Serializable), transport: Transport = Transport.WEBSOCKET): StreamDescriptor => {
    return ByteExpressRouteMeta(endpoint, STREAM, transport) as StreamDescriptor;
};
export const ByteExpressEvent = (endpoint: string | (new() => Serializable), transport: Transport = Transport.WEBSOCKET): EventDescriptor => {
    return ByteExpressRouteMeta(endpoint, EVENT, transport) as EventDescriptor;
};


type testTType<T> = (...args: any[]) => T;
export const testT = () => {
    return (
        target: object,
        key: string,
        descriptor: TypedPropertyDescriptor<testTType2<number | string>>
    ) => {
        return descriptor;
    };
}

type MyType = {
    // Define the properties and methods of MyType here
  };
  
type testTType2<T> = T extends number ? (...args: any[]) => number : (...args: any[]) => string;