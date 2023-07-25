import { Logger, ILogObj } from 'tslog';
import { TransferWrapper } from "../Packets/NetworkingPackets/TransferWrapper";
import { PacketManager } from "../Packets/PacketManager";
import { Serializable } from "../Serialization/Serializable";
import { NetworkConnection } from "./NetworkConnection";
import { BeginCallback, CallbackHandler, CallbackHandlerCb, CallbackHandlerElement, CallbackHandlerKey, CallbacksHandlerCb, RequestContext, iRequestContext } from "./RequestHandler";
import { Observable } from "rxjs";
import { ErrorCallback, FinalCallback, StreamCallback, StreamCallbackHandler } from "./StreamHandler";

//Callback type for outbound data
export type Callback = (id: number | string, data: Uint8Array, ctx?: CallbackContext) => void;
//For debug purposes
export type CallbackContext = {
    original_packet: TransferWrapper,

    connection_id: number | string,
    last_sent_at: number,
    packets_delta_ack: number,
    max_single_packet_payload: number,
    max_chunked_packet_payload: number,
    next_sequence: number,
};
//Optional network settings
export type NetworkSettings = {
    maxPacketSize?: number,
    connectionSendRate?: number,
    connectionPacketsPerAck?: number,
    requestTimeout?: number,
    /**
     * 0: silly, 1: trace, 2: debug, 3: info, 4: warn, 5: error, 6: fatal
     */
    logLevel?: number,
    debugPrefix?: string,
    logToFile?: boolean,
    requestQueueSize?: number,
    streamQueueSize?: number,
};

/**
 * Manages client connections and exposes request and
 * stream methods.
 */
export class NetworkHandler{
    //public props
    public get packetManager(): PacketManager { return this._packetManager; }

    //Settings for inbound
    private maxPacketSize: number;
    private connectionSendRate: number;
    private connectionPacketsPerAck: number;

    //Settings for outbound
    private outboundCallback: Callback;
    private requestTimeout: number;
    
    //Settings common
    private requestQueueSize: number;
    private streamQueueSize: number;
    private requestHandlers: CallbackHandler<CallbackHandlerKey, CallbacksHandlerCb>;
    private streamHandlers: CallbackHandler<string, StreamCallbackHandler>;

    //Private vars
    private readonly connections: Array<NetworkConnection> = new Array<NetworkConnection>(); //list of active connection
    private readonly _packetManager: PacketManager; //a packet manager instance passed along the entire execution of the network instance
    private readonly encoder = new TextEncoder();
    private readonly decoder = new TextDecoder();
    private readonly networkSettings: NetworkSettings | undefined;

    //Debugging
    private logLevel: number;
    private debugPrefix: string;
    private logtoFile: boolean;
    private readonly logger: Logger<ILogObj>;


    constructor(
        outboundCallback: Callback,
        networkSettings?: NetworkSettings, //can pass optional settings
    ){
        this.outboundCallback = outboundCallback;

        //set default settings values or whats defined
        this.maxPacketSize = networkSettings?.maxPacketSize ?? 255;
        this.connectionSendRate = networkSettings?.connectionSendRate ?? 0;
        this.connectionPacketsPerAck = networkSettings?.connectionPacketsPerAck ?? 4;
        this.requestQueueSize = networkSettings?.requestQueueSize ?? 128;
        this.streamQueueSize = networkSettings?.streamQueueSize ?? 128;
        this.requestTimeout = networkSettings?.requestTimeout ?? 5000;
        this.logLevel = networkSettings?.logLevel ?? 4;
        this.debugPrefix = networkSettings?.debugPrefix ?? "NetworkHandler";
        this.logtoFile = networkSettings?.logToFile ?? false;

        //Logging
        this.logger = new Logger({name: this.debugPrefix, minLevel: this.logLevel});
        this.logger.info("NetworkHandler init");

        //init internal variables
        this._packetManager = new PacketManager();
        //this.requestHandlers = new CallbackHandler<(number | string), ((ctx: RequestContext) => void)>();
        this.requestHandlers = new CallbackHandler<number | string, CallbacksHandlerCb>();
        this.streamHandlers = new CallbackHandler<string, StreamCallbackHandler>();
    }

    /**
     * Call this function with the corresponding connection ID
     * and pass the received data. The class handles receiving fragmented
     * information.
     * @param id ID for the connection
     * @param data Data received
     */
    public inboundData(id: number, data: Uint8Array | string){
        let bytes: Uint8Array;
        if (typeof data === 'string')
            bytes = this.encoder.encode(data);
        else
            bytes = data;
        this.logger.trace("indboundData Handler received ", bytes.length, " bytes of inboundData (connection: ", id, " original type: ", typeof data, "), bytes: ", bytes.toString());
        let connection = this.connections.find(e => e.id === id);
        connection?.inboundData(bytes);
    }

    /**
     * Sets the outbound callback that must be sent to the 
     * corresponding connection with given ID.
     * @param callback Callback function
     */
    public outboundDataCb(callback: Callback): void{
        this.logger.trace("outboundDataCb");
        this.outboundCallback = callback;
    }

    /**
     * Call when a new client is connected
     * @param id Client ID
     */
    public connectClient(id: number | string){
        this.logger.trace("connectClient, id: ", id);
        let connection = new NetworkConnection(
            this.logger,
            id, this.maxPacketSize, this.connectionSendRate, this.connectionPacketsPerAck,
            this.requestQueueSize, this.streamQueueSize,
            this.outboundCallback, this.packetManager,
            this.requestHandlers, this.streamHandlers,
            this.networkSettings,
        );
        this.connections.push(connection);
    }
    /**
     * Call when a client is disconnected
     * @param id Client ID
     */
    public disconnectClient(id: number | string){
        this.logger.trace("disconnectClient, id: ", id);
        let connection = this.connections.find(e => e.id === id);
        this.connections.splice(this.connections.indexOf(connection!), 1);
        connection!.disconnect();
    }

    public request(connectionId: number | string, packet: Serializable, expectResponse: boolean, endpointUrl?: string): Promise<iRequestContext>{
        this.logger.trace("request, connectionId: ", connectionId, "expectResponse: ", expectResponse, ", endpointUrl: ", endpointUrl ?? "undefined");
        this.logger.trace("request, packet: ", packet.toJson());
        let connection = this.connections.find(e => e.id === connectionId);
        return connection!.request(packet, expectResponse, endpointUrl);
    }
    public onRequest(endpoint: (new () => Serializable) | string, callback: CallbackHandlerCb, connectionId?: number | string): CallbackHandlerElement<CallbackHandlerKey, CallbacksHandlerCb>{
        let endpointVal: number | string | undefined = Serializable.prototype.isPrototypeOf((endpoint as any).prototype) ? this.packetManager.getIdByCls(endpoint as (new () => Serializable)) : endpoint as string;
        if (!endpointVal)
            throw new Error("Packet must be added to packet manager");
        let handler = this.requestHandlers.addCallback(endpointVal, {cb: callback});
        if (connectionId){
            let connection = this.connections.find(e => e.id === connectionId);
            return connection!.onRequest(handler);
        }else
            return this.requestHandlers.addCallbackElement(handler);
    }
    public eventRequest(connectionId: number | string, endpointUrl: string, payload: Serializable | undefined, onBeginCb?: BeginCallback): Observable<iRequestContext>{
        let connection = this.connections.find(e => e.id === connectionId);
        return connection!.eventRequest(endpointUrl, payload, onBeginCb);
    }
    public onEvent(endpoint: string, callback: CallbackHandlerCb, closedCallback?: CallbackHandlerCb, connectionId?: number | string): CallbackHandlerElement<CallbackHandlerKey, CallbacksHandlerCb>{
        let handler = this.requestHandlers.addCallback(endpoint, { cb: callback, close: closedCallback });
        if (connectionId){
            let connection = this.connections.find(e => e.id === connectionId);
            return connection!.onEvent(handler);
        }
        else
            return handler;
    }
    public stream(connectionId: number | string, endpoint: string, callback: StreamCallback, errorCallback?: ErrorCallback, finalCallback?: FinalCallback): void{
        let connection = this.connections.find(e => e.id === connectionId);
        connection!.stream(endpoint, callback, errorCallback, finalCallback);
    }
    public onStream(endpoint: string, callback: StreamCallback, errorCallback?: ErrorCallback, finalCallback?: FinalCallback, connectionId?: number | string): CallbackHandlerElement<string, StreamCallbackHandler>{
        let handler = this.streamHandlers.addCallback(endpoint, {
            cb: callback,
            err: errorCallback,
            final: finalCallback,
        });
        if (connectionId){
            let connection = this.connections.find(e => e.id === connectionId);
            return connection!.onStream(handler);
        }
        else
            return handler;
    }
}