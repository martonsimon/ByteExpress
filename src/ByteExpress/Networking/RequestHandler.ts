import { PacketManager } from "../Packets/PacketManager";
import { NetworkConnection } from "./NetworkConnection";
import { RequestPacket } from "../Packets/NetworkingPackets/RequestPacket";
import { Serializable } from "../Serialization/Serializable";
import { ResponsePacket } from "../Packets/NetworkingPackets/ResponsePacket";
import { Payload } from "../Packets/NetworkingPackets/Payload";

export type RequestSettings = {
    timeout: number, //timeout in ms
};
export type CallbackHandlerKey = (number | string);
export type CallbackHandlerCb = ((ctx: RequestContext) => void);
export class RequestHandler{
    private readonly packetManager: PacketManager;
    private readonly connection: NetworkConnection;
    private readonly timeout: number;

    private nextSequence: number; //the ID used for the next outbound request
    private outboundRequests: Array<RequestContext>;
    //private requestHandlers: CallbackHandler<(number | string), ((ctx: RequestContext) => void)>;
    private requestHandlers: CallbackHandler<CallbackHandlerKey, CallbackHandlerCb>;

    constructor(
        packetManager: PacketManager,
        networkConnection: NetworkConnection,
        requestSettings?: RequestSettings
    )
    {
        this.packetManager = packetManager;
        this.connection = networkConnection;

        this.nextSequence = 0;
        this.outboundRequests = new Array<RequestContext>();
        this.requestHandlers = new CallbackHandler<(number | string), ((ctx: RequestContext) => void)>();

        this.timeout = requestSettings?.timeout ?? 10_000;
    }

    public request(packet: Serializable, expectResponse: boolean, endpointUrl?: string){
        //Get the next sequence and remove if there is an existing one
        let sequence = this.nextSequence;
        this.nextSequence = (this.nextSequence + 1) % 65535;
        this.abortRequest(sequence);

        //Create request and context objects
        let req = new Request(
          this.packetManager,
          sequence,
          packet,
          expectResponse,
          false,
          this.timeout,
          endpointUrl,
        );
        let ctx = new RequestContext(
            this.connection,
            this.packetManager,
            req,
            this.timeout
        );



        //Add to array
        this.outboundRequests.push(ctx);

        //Start timeout
        ctx.startTimeout();

        //Return promise and flush packet
        this.flushRequest(req.generatePacket(true));
        return ctx.promise;
    }
    public onRequest(endpoint: (new () => Serializable) | string, callback: CallbackHandlerCb): CallbackHandlerElement<CallbackHandlerKey, CallbackHandlerCb>{
        let endpointVal: number | string | undefined = endpoint instanceof Serializable ? this.packetManager.getIdByCls(endpoint as (new () => Serializable)) : endpoint as string;
        if (!endpointVal)
            throw new Error("Packet must be added to packet manager");
        return this.requestHandlers.addCallback(endpointVal, callback);
    }


    public inboundPacket(packet: Serializable){
        //Handle request
        if (packet instanceof RequestPacket){
            
        }

        //Handle response
        if (packet instanceof ResponsePacket){
            let id = packet.request_id;
            let req = this.outboundRequests.find(x => x.req.sequence == id);
            if (req && !req.completed)
                req.inboundResponse(packet);
        }

        //Clear up finished requests
        this.clearCompleted();
    }

    private clearCompleted(){
        for (let i = this.outboundRequests.length - 1; i >= 0; i--){
            let req = this.outboundRequests[i];
            if (req.completed)
                this.outboundRequests.splice(i, 1);
        }
    }

    private flushRequest(packet: RequestPacket){
        this.connection.sendPacket(packet);
    }

    private abortRequest(requestId: number, outbound: boolean = true){
        if (outbound){
            let reqIndex = this.outboundRequests.findIndex(x => x.req.sequence);
            let req = this.outboundRequests[reqIndex];
            if (req){
                req.abort();
                this.outboundRequests.splice(reqIndex, 1);
            }
        }
    }
}

/**
 * A class for managing callback functions
 * and methods
 */
export class CallbackHandler<K, V>{
    private readonly collection: Array<CallbackHandlerElement<K, V>>;

    constructor(){
        this.collection = new Array<CallbackHandlerElement<K, V>>();
    }

    public addCallback(key: K, cb: V): CallbackHandlerElement<K, V>{
        let handler = new CallbackHandlerElement(key, cb, this);
        this.collection.push(handler);
        return this.find(key)!;
    }
    public deleteCallback(key: CallbackHandlerElement<K, V>){
        let index = this.collection.indexOf(key);
        this.collection.splice(index, 1);
    }
    public clear(){
        this.collection.length = 0;
    }
    public find(key: K): CallbackHandlerElement<K, V> | undefined{
        return this.collection.find(x => x.getKey() == key);
    }
}

export class CallbackHandlerElement<K, V>{
    private readonly key: K;
    private readonly callback: V;
    private readonly handler: CallbackHandler<K, V>;

    constructor(key: K, callback: V, handler: CallbackHandler<K, V>){
        this.key = key;
        this.callback = callback;
        this.handler = handler;
    }

    public getKey(): K { return this.key; }
    public getCallback(): V { return this.callback; }
    public canHandle(key: K): boolean{ return this.key == key; }
    public deleteCallback(): void { this.handler.deleteCallback(this); }
}

export class Request{
    public readonly sequence: number; //request ID for outbound / inbound
    public readonly endpointUrl: string | undefined;
    public readonly endpointNumeric: number | undefined;
    public readonly expectResponse: boolean;
    public readonly multipleResponse: boolean;
    public readonly payload: Serializable;
    public readonly packetManager: PacketManager;
    public readonly timeout: number;
    public readonly outbound: boolean;

    public outboundPacket: RequestPacket | undefined;
    public sent: boolean;
    public completed: boolean;

    constructor(packetManager: PacketManager, sequence: number, payload: Serializable, expectResponse: boolean, multipleResponse: boolean, timeout: number, outbound: boolean = false, endpointUrl?: string){
        this.packetManager = packetManager;
        this.sequence = sequence;
        this.endpointUrl = endpointUrl;
        this.endpointNumeric = this.packetManager.getIdByInstance(payload);
        this.expectResponse = expectResponse;
        this.multipleResponse = multipleResponse;
        this.payload = payload;
        this.outbound = outbound;
        this.sent = outbound ? false : true;
        this.completed = false;
        this.timeout = timeout;

        if (!outbound)
            this.extractRequest(undef
    }

    /**
     * Generates an outbound packet for sending
     * over the network, including all the necessary
     * information.
     */
    generatePacket(markAsSent: boolean): RequestPacket{
        this.sent = markAsSent;
        if (!this.expectResponse)
            this.completed = true;
        let packetId = this.packetManager.getIdByInstance(this.payload);
        if (!packetId)
            throw new Error("Packet is not added");

        let request = new RequestPacket(undefined, this.packetManager);
        request.flags.endpoint_is_string = !!this.endpointUrl;
        request.flags.require_response = this.expectResponse;
        request.flags.multiple_response = this.multipleResponse;
        request.endpoint_str = this.endpointUrl ? this.endpointUrl : "";
        request.endpoint_id = packetId ? packetId : 0;
        request.request_id = this.sequence;
        request.setPayload(this.payload);
        this.outboundPacket = request;

        return request;
    }
    extractRequest(packet: RequestPacket){
        this.endpointUrl = packet.endpoint_str;
    }
}

export class Response{
    public readonly sequence: number;
    public readonly multipleResponse: boolean;
    public readonly packetManager: PacketManager;

    public payload?: Serializable;

    constructor(
        packetManager: PacketManager,
        sequence: number,
        multipleResponse: boolean
    ){
        this.packetManager = packetManager;
        this.sequence = sequence;
        this.multipleResponse = multipleResponse;
    }
}

export class RequestContext{
    public readonly connectionId: number;
    public readonly connection: NetworkConnection;
    public readonly endpointStr: string | undefined;
    public readonly endpointNumeric;
    public readonly packetManager: PacketManager;

    public readonly req: Request;
    public readonly res: Response;
    private timeoutLength: number;
    private timeout: NodeJS.Timeout | undefined;

    //for single respones
    public readonly promise: Promise<RequestContext>;
    private promiseResolve?: (value: RequestContext) => void;
    private promiseReject?: (reason: RequestContext) => void;
    public completed: boolean;
    public rejected: boolean;

    constructor(
        connection: NetworkConnection,
        packetManager: PacketManager,
        request: Request,
        timeout: number,
    ){
        this.connectionId = connection.id;
        this.connection = connection;
        this.endpointStr = request.endpointUrl;
        this.endpointNumeric = request.endpointNumeric;
        this.packetManager = packetManager;
        this.timeoutLength = timeout;

        this.req = request;
        this.res = new Response(
            packetManager,
            request.sequence,
            request.multipleResponse,
        );

        this.promise = new Promise<RequestContext>((resolve, reject) => {
            this.promiseResolve = resolve;
            this.promiseReject = reject;
        });
        this.completed = false;
        this.rejected = false;
    }

    public abort(){
        this.stopTimeout();
        this.completed = true;
        this.rejected = true;
        this.promiseReject!(this);
    }
    public resolve(){
        this.stopTimeout();
        this.completed = true;
        this.rejected = false;
        this.promiseResolve!(this);
    }

    public startTimeout(){
        this.stopTimeout();
        this.timeout = setTimeout(() => {
            this.timeout = undefined;
            this.abort();
        }, this.timeoutLength);
    }
    public stopTimeout(){
        if (this.timeout){
            clearTimeout(this.timeout);
            this.timeout = undefined;
        }
    }

    public inboundResponse(packet: ResponsePacket){
        this.res.payload = packet.payload.toPacket(this.packetManager);

        //Handle a single response packet
        if (!this.req.multipleResponse){
            this.resolve();
        }
    }
}