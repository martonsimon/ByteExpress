import { PacketManager } from "../Packets/PacketManager";
import { NetworkConnection } from "./NetworkConnection";
import { RequestPacket } from "../Packets/NetworkingPackets/RequestPacket";
import { Serializable } from "../Serialization/Serializable";
import { ResponsePacket } from "../Packets/NetworkingPackets/ResponsePacket";
import { Payload } from "../Packets/NetworkingPackets/Payload";
import { NullPacket } from "../Packets/NetworkingPackets/NullPacket";
import { Subject, Observable, of, pipe, from, Observer } from 'rxjs';

export type HandlerSettings = { //Optional settings for requests
    timeout: number, //timeout in ms
};
export type CallbackHandlerKey = (number | string); //key used when sending and receiving requests
export type CallbackHandlerCb = ((ctx: RequestContext) => void); //type to be returned when a request / response arrives
/**
 * Request Handler keeps track of inbound
 * and outbound requests and manages the 
 * process of sending and receiving requests.
 */
export class RequestHandler{
    private readonly packetManager: PacketManager;
    private readonly connection: NetworkConnection;

    private nextSequence: number; //the ID used for the next outbound request
    private outboundRequests: Array<RequestContext>;
    private inboundRequests: Array<RequestContext>;
    private requestHandlers: CallbackHandler<CallbackHandlerKey, CallbackHandlerCb>;

    private readonly timeout: number;

    constructor(
        packetManager: PacketManager,
        networkConnection: NetworkConnection, //the connection where this handler is used
        requestSettings?: HandlerSettings //optional settings
    )
    {
        this.packetManager = packetManager;
        this.connection = networkConnection;

        this.nextSequence = 0;
        this.outboundRequests = new Array<RequestContext>();
        this.inboundRequests = new Array<RequestContext>();
        this.requestHandlers = new CallbackHandler<(number | string), ((ctx: RequestContext) => void)>();

        this.timeout = requestSettings?.timeout ?? 10_000;
    }


    //METHODS FOR OUTBOUND REQUESTS
    public request(packet: Serializable, expectResponse: boolean, endpointUrl?: string){
        //Get the next sequence and remove if there is an existing one
        let sequence = this.incrementSequence();

        //Create request and context objects
        let req = new Request(
            this.packetManager,
            true,
            { timeout: this.timeout },
            {
                endpointUrl: endpointUrl ? endpointUrl : undefined,
                endpointNumeric: endpointUrl ? undefined : this.packetManager.getIdByInstance(packet, true),
                requireResponse: expectResponse,
                multipleResponse: false,
                sequence: sequence,
                payload: packet,
            },
            undefined
        );
        let ctx = new RequestContext( this.connection, this.packetManager, req, { timeout: this.timeout } );


        //Add to array
        this.outboundRequests.push(ctx);

        //Return promise and flush packet
        this.flushRequest(req.generatePacket());
        return ctx.res.outboundPromise;
    }
    public eventRequest(endpointUrl: string, payload: Serializable | undefined): Observable<iRequestContext>{
        //Get the next sequence and remove if there is an existing one
        let sequence = this.incrementSequence();

        //Create request and context objects
        let req = new Request(
            this.packetManager,
            true,
            { timeout: this.timeout },
            {
                endpointUrl: endpointUrl,
                endpointNumeric: undefined,
                requireResponse: true,
                multipleResponse: true,
                sequence: sequence,
                payload: payload ? payload : new NullPacket(),
            },
            undefined
        );
        let ctx = new RequestContext( this.connection, this.packetManager, req, { timeout: this.timeout } );

        //Add to array
        this.outboundRequests.push(ctx);

        //Return observable and flush
        //Note: flush after the the observable is subscribed
        //      as it is completed immediately when locally testing
        //      and the emitted values are not stored (not a replaysubject)
        return ctx.res.getObservable(() => {
            this.flushRequest(req.generatePacket()); //callback
        });
    }
    private flushRequest(packet: RequestPacket){
        this.connection.sendPacket(packet);
    }

    //METHODS FOR INBOUND REQUESTS
    public onRequest(endpoint: (new () => Serializable) | string, callback: CallbackHandlerCb): CallbackHandlerElement<CallbackHandlerKey, CallbackHandlerCb>{
        let endpointVal: number | string | undefined = Serializable.prototype.isPrototypeOf((endpoint as any).prototype) ? this.packetManager.getIdByCls(endpoint as (new () => Serializable)) : endpoint as string;
        if (!endpointVal)
            throw new Error("Packet must be added to packet manager");
        return this.requestHandlers.addCallback(endpointVal, callback);
    }
    public onEvent(endpoint: string, callback: CallbackHandlerCb): CallbackHandlerElement<CallbackHandlerKey, CallbackHandlerCb>{
        return this.requestHandlers.addCallback(endpoint, callback);
    }
    private inboundRequest(packet: RequestPacket){
        let sequence = packet.request_id;
        this.abortRequest(sequence);

        //Create request and context objects
        let req = new Request(
            this.packetManager,
            false,
            {timeout: this.timeout},
            undefined,
            packet,
        );
        let ctx = new RequestContext(
            this.connection,
            this.packetManager,
            req,
            {timeout: this.timeout},
        );

        //Add to array
        this.inboundRequests.push(ctx);

        //handle
        let key = packet.flags.endpoint_is_string ? packet.endpoint_str : packet.endpoint_id;
        let handler = this.requestHandlers.find(key);
        if (handler){
            handler.getCallback()(ctx);
        }
    }


    //METHODS FOR COMMON
    public inboundPacket(packet: Serializable){
        //Handle request
        if (packet instanceof RequestPacket){
            this.inboundRequest(packet);
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
        for (let i = this.inboundRequests.length - 1; i >= 0; i--){
            let req = this.inboundRequests[i];
            if (req.completed)
                this.inboundRequests.splice(i, 1);
        }
    }
    private abortRequest(requestId: number, outbound: boolean = true){
        if (outbound){
            let reqIndex = this.outboundRequests.findIndex(x => x.req.sequence);
            let req = this.outboundRequests[reqIndex];
            if (req){
                req.res.abort();
                this.outboundRequests.splice(reqIndex, 1);
            }
        } else{
            let reqIndex = this.inboundRequests.findIndex(x => x.req.sequence);
            let req = this.inboundRequests[reqIndex];
            if (req){
                req.res.abort();
                this.inboundRequests.splice(reqIndex, 1);
            }
        }
    }
    /**
     * Increments the nextSequence counter, aborts
     * stuck/pending requests if any, then
     * returns the nextSequence that can be used
     * @returns Next sequence ID to use
     */
    private incrementSequence(): number{
        let sequence = this.nextSequence;
        this.nextSequence = (this.nextSequence + 1) % 65535;
        this.abortRequest(sequence);

        return sequence;
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

export interface iRequest{
    readonly endpointUrl: string | undefined;
    readonly endpointNumeric: number | undefined;
    readonly expectResponse: boolean;
    readonly multipleResponse: boolean;
    readonly payload: Serializable;
    readonly settings: RequestSettings;
    readonly isOutbound: boolean;
}
export type RequestSettings = {
    timeout: number,
};
export type RequestPacketInformation = {
    sequence: number,
    requireResponse: boolean,
    multipleResponse: boolean,
    endpointUrl: string | undefined;
    endpointNumeric: number | undefined;
    payload: Serializable,
};
export class Request implements iRequest{
    //Interface members
    public readonly endpointUrl: string | undefined;
    public readonly endpointNumeric: number | undefined;
    public readonly expectResponse: boolean;
    public readonly multipleResponse: boolean;
    public readonly payload: Serializable;
    public readonly settings: RequestSettings;
    public readonly isOutbound: boolean;

    //Internal members
    public readonly sequence: number; //request ID for outbound / inbound
    public readonly packetManager: PacketManager;
    public networkPacket: RequestPacket | undefined; //stores the serialized packet sent over the network

    constructor(
        packetManager: PacketManager,
        isOutbound: boolean,
        settings: RequestSettings,

        outboundPacket: RequestPacketInformation | undefined, //for creating network packet for outbound
        inboundPacket: RequestPacket | undefined, //If the class is inbound
    ){
        this.packetManager = packetManager;
        this.isOutbound = isOutbound;
        this.settings = settings;

        //Because of type checking cannot detect when extracting the packet/information
        this.sequence = 0;
        this.expectResponse = false;
        this.multipleResponse = false;
        this.payload = new NullPacket();
        
        //Extract inbound packet if inbound
        if (!isOutbound && inboundPacket){
            let req = inboundPacket;
            this.networkPacket = req;

            this.expectResponse = req.flags.require_response;
            this.multipleResponse = req.flags.multiple_response;
            this.sequence = req.request_id;
            this.endpointUrl = req.flags.endpoint_is_string ? req.endpoint_str : undefined;
            this.endpointNumeric = req.flags.endpoint_is_string ? undefined : req.endpoint_id;
            this.payload = req.payload.toPacket(packetManager);
        } else if (!isOutbound)
            throw new Error("inboundPacket must be defined for inbound Requests");

        //Extract outbound packet information from settings
        if (isOutbound && outboundPacket){
            let info = outboundPacket;
            
            this.expectResponse = info.requireResponse;
            this.multipleResponse = info.multipleResponse;
            this.sequence = info.sequence;
            this.endpointUrl = info.endpointUrl;
            this.endpointNumeric = info.endpointNumeric;
            this.payload = info.payload;
        } else if (isOutbound)
            throw new Error("outboundInformation must be defined for outbound Requests");
    }

    /**
     * Generates an outbound packet for sending
     * over the network, including all the necessary
     * information.
     */
    generatePacket(): RequestPacket{
        let packetId = this.packetManager.getIdByInstance(this.payload, true);

        let request = new RequestPacket(this.packetManager);
        request.flags.endpoint_is_string = !!this.endpointUrl;
        request.flags.require_response = this.expectResponse;
        request.flags.multiple_response = this.multipleResponse;
        request.endpoint_str = this.endpointUrl ? this.endpointUrl : "";
        request.endpoint_id = packetId ? packetId : 0;
        request.request_id = this.sequence;
        request.setPayload(this.payload);
        this.networkPacket = request;

        return request;
    }
}

export interface iResponse{
    readonly endpointUrl: string | undefined;
    readonly endpointNumeric: number | undefined;
    readonly multipleResponse: boolean;
    readonly settings: RequestSettings;
    readonly isOutbound: boolean;
    payload: Serializable;
    code: number;

    //For sending response (outbound)
    write(packet: Serializable): void;
    end(code: number): void;
}
export class Response implements iResponse{
    public readonly endpointUrl: string | undefined;
    public readonly endpointNumeric: number | undefined;
    public readonly requireResponse: boolean;
    public readonly multipleResponse: boolean;
    public readonly settings: RequestSettings;
    public readonly isOutbound: boolean;
    public payload: Serializable;
    public code: number;
    
    public readonly sequence: number;
    public readonly packetManager: PacketManager;
    public readonly context: RequestContext;

    public nthResponse: number;
    public closedConnection: boolean;
    public rejected: boolean;
    public timeout: NodeJS.Timeout | undefined;

    //For single requests
    public outboundPromise: Promise<iRequestContext>; //deferred promise for outbound single responses
    public promiseResolveFn?: (value: iRequestContext) => void;
    public promiseRejectFn?: (value: iRequestContext) => void;

    //For event like requests (multiple respones)
    public outboundSubject: Subject<iRequestContext>;

    constructor(
        packetManager: PacketManager,
        isOutbound: boolean,
        context: RequestContext,
    ){
        this.packetManager = packetManager;
        this.isOutbound = isOutbound;
        this.context = context;

        this.requireResponse = context.req.expectResponse;
        this.multipleResponse = context.req.multipleResponse;
        this.settings = context.req.settings;
        this.sequence = context.req.sequence;
        this.payload = new NullPacket();
        this.code = 0;

        this.nthResponse = 0;
        this.closedConnection = false;
        this.rejected = false;
        this.outboundPromise = new Promise<iRequestContext>((resolve, reject) => {
            this.promiseResolveFn = resolve;
            this.promiseRejectFn = reject;
        });
        this.outboundSubject = new Subject<iRequestContext>();
        if (!isOutbound)
            this.startTimeout();
        if (!this.requireResponse){
            this.promiseResolveFn!(this.context);
            this.context.onResponseFinished();
        }
    }

    /**
     * Writes a packet to the connection and sends it. Note
     * that when the write method is used, the receiver must
     * cache the entire message, so this is not applicable for
     * large responses. Instead, read the docs for large responses
     * @param packet 
     */
    public write(packet: Serializable){ this._write(packet, 200, !this.multipleResponse); }
    /**
     * Terminates the requests and closes the connection
     * @param code 
     */
    public end(code: number){ this._write(undefined, code, true); }
    private _write(packet: Serializable | undefined, code: number, closeConnection: boolean){
        //Checks
        if (!this.isOutbound)
            throw new Error("Writing data to an inbound response object is not allowed");
        if (!this.requireResponse)
            throw new Error("Cannot write data if requireResponse is false");

        //Prepare data
        this.nthResponse++;
        this.code = code;
        this.closedConnection = closeConnection;
        let payload = new Payload();
        payload.fromPacket(this.packetManager, packet);

        //Create the response packet
        let res = new ResponsePacket(this.packetManager);
        res.flags.close_connection = closeConnection;
        res.request_id = this.sequence;
        res.code = code;
        res.payload = payload;

        //Send the packet and mark the request as completed if necessary
        this.context.connection.sendPacket(res);
        if (this.closedConnection) { this.context.onResponseFinished(); }
    }

    /**
     * Call the receive the process incoming packets
     * @param packet 
     */
    public receive(packet: ResponsePacket){
        //Checks
        if (this.isOutbound)
            throw new Error("Cannot receive data when using an outbound response");
        this.nthResponse++;

        //Get payload
        this.closedConnection = packet.flags.close_connection;
        this.code = packet.code;
        this.payload = packet.payload.toPacket(this.packetManager);

        //Timers
        //Note: Timers for event are disabled
        if (this.closedConnection)
            this.stopTimeout();
        else
            this.startTimeout(true);

        //Emit the message
        if (!this.multipleResponse){ //single response
            this.promiseResolveFn!(this.context);
            this.context.onResponseFinished();
        } else{ //multiple response
            if (this.closedConnection) { //do not emit data for the close connection packet
                this.outboundSubject.complete();
                this.context.onResponseFinished();
            }else
                this.outboundSubject.next(this.context);
        }
    }

    public startTimeout(restart: boolean = false){
        if (this.multipleResponse) //ignore it for event like requests
            return;
        if (restart)
            this.stopTimeout();
        if (!this.isOutbound && !this.timeout){
            this.timeout = setTimeout(() => {
                this.abort();
            }, this.settings.timeout);
        }
    }
    public stopTimeout(){
        if (this.timeout)
            clearTimeout(this.timeout);
        this.timeout = undefined;
    }
    /**
     * Aborts the request, notifies the subscriber
     * and marks the request context as compelted
     */
    public abort(){
        this.stopTimeout();
        if (!this.multipleResponse)
            this.promiseRejectFn!(this.context);
        else
            throw new Error("not implemented");
        
        this.closedConnection = true;
        this.rejected = true;

        this.context.onResponseAborted();
    }
    /**
     * Returns an observable and accepts a callback function to be
     * called after it is subscribed to. Note: used for testing internally,
     * when the flushed packets would get immediately processed when the 
     * consumer haven't subscribed yet.
     * @param onSubscribedCb Callback for flushing the packet to the connection
     * @returns 
     */
    public getObservable(onSubscribedCb: () => any): Observable<iRequestContext>{
        let observable = this.outboundSubject.asObservable();
        return this.subscriptionCallback(observable, onSubscribedCb);
    }
    /**
     * Takes an observable and a callback, and modifies the
     * subscribe method as such that the callback gets called
     * right after subscribing to the observable, and returns it.
     * @param observable Source observable
     * @param callback Callback to be called
     * @returns Observable
     */
    private subscriptionCallback<T>(observable: Observable<T>, callback: () => void): Observable<T> {
        const originalSubscribe = observable.subscribe.bind(observable);
        observable.subscribe = function(...subscribeArgs: any[]) {
            const subscription = originalSubscribe(...subscribeArgs);
            callback();
            return subscription;
        };
        return observable;
    }
}

export interface iRequestContext{
    readonly req: iRequest;
    readonly res: iResponse;
}
export class RequestContext implements iRequestContext{
    public readonly connection: NetworkConnection;
    public readonly packetManager: PacketManager;
    public readonly req: Request;
    public readonly res: Response;
    public completed: boolean;
    public settings: RequestSettings;

    constructor(
        connection: NetworkConnection,
        packetManager: PacketManager,
        request: Request,
        settings: RequestSettings,
    ){
        this.connection = connection;
        this.packetManager = packetManager;
        this.settings = settings;
        this.req = request;
        this.completed = false;

        this.res = new Response(
            packetManager,
            !(this.req.isOutbound),
            this,
        );
    }

    //Called by the response object for feedback
    public onResponseAborted(){ this.completed = true; }
    public onResponseFinished(){ this.completed = true; }

    //Called by the connection
    public inboundResponse(packet: ResponsePacket){ this.res.receive(packet); }
}