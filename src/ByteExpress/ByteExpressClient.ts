import { TransferWrapper } from "./Packets/NetworkingPackets/TransferWrapper";
import { PacketManager } from "./Packets/PacketManager";
import { Serializable } from "./Serialization/Serializable";
import { NetworkConnection } from "./Networking/NetworkConnection";
import { CallbackHandler, CallbackHandlerCb, CallbackHandlerElement, CallbackHandlerKey, RequestContext, iRequestContext } from "./Networking/RequestHandler";
import { Observable } from "rxjs";
import { ErrorCallback, FinalCallback, StreamCallback, StreamCallbackHandler } from "./Networking/StreamHandler";
import { Callback, NetworkHandler, NetworkSettings } from "./Networking/NetworkHandler";

export class ByteExpressClient{
    private readonly network: NetworkHandler;
    private readonly connectionId: number = 0;

    public get packetManager(): PacketManager { return this.network.packetManager; }

    constructor(
        outboundCallback: Callback,
        networkSettings?: NetworkSettings,
    ){
        this.network = new NetworkHandler(outboundCallback, networkSettings);
    }

    public connect(): void{ this.network.connectClient(this.connectionId); }
    public disconnect(): void{ this.network.disconnectClient(this.connectionId); }
    public inboundData(id: number, data: Uint8Array | string){ return this.network.inboundData(id, data);}

    public request(packet: Serializable, expectResponse: boolean, endpointUrl?: string): Promise<iRequestContext>{ return this.network.request(this.connectionId, packet, expectResponse, endpointUrl); }
    public onRequest(endpoint: (new () => Serializable) | string, callback: CallbackHandlerCb, connectionId?: number): CallbackHandlerElement<CallbackHandlerKey, CallbackHandlerCb>{ return this.network.onRequest(endpoint, callback, connectionId); }
    public eventRequest(endpointUrl: string, payload: Serializable | undefined): Observable<iRequestContext>{ return this.network.eventRequest(this.connectionId, endpointUrl, payload); }
    public onEvent(endpoint: string, callback: CallbackHandlerCb, connectionId?: number): CallbackHandlerElement<CallbackHandlerKey, CallbackHandlerCb>{ return this.network.onEvent(endpoint, callback, connectionId); }
    public stream(endpoint: string, callback: StreamCallback, errorCallback?: ErrorCallback, finalCallback?: FinalCallback): void{ this.network.stream(this.connectionId, endpoint, callback, errorCallback, finalCallback); }
    public onStream(endpoint: string, callback: StreamCallback, errorCallback?: ErrorCallback, finalCallback?: FinalCallback, connectionId?: number): CallbackHandlerElement<string, StreamCallbackHandler>{ return this.network.onStream(endpoint, callback, errorCallback, finalCallback, connectionId); }
}