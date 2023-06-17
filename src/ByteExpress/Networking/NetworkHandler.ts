import { NetworkConnection } from "./NetworkConnection";

//Callback type for outbound data
export type Callback = (id: number, data: Uint8Array) => void;
//Optional network settings
type NetworkSettings = {
    maxPacketSize?: number,
    connectionSendRate?: number,
    connectionPacketsPerAck?: number,
    requestQueueSize?: number,
    streamQueueSize?: number,
};

/**
 * Manages client connections and exposes request and
 * stream methods.
 */
export class NetworkHandler{
    //Settings for inbound
    private maxPacketSize: number;
    private connectionSendRate: number;
    private connectionPacketsPerAck: number;

    //Settings for outbound
    private outboundCallback: Callback;
    
    //common
    private requestQueueSize: number;
    private streamQueueSize: number;

    //
    private readonly connections: Array<NetworkConnection> = new Array<NetworkConnection>();
    private readonly encoder = new TextEncoder();
    private readonly decoder = new TextDecoder();


    constructor(
        outboundCallback: Callback,
        networkSettings?: NetworkSettings,
    ){
        this.outboundCallback = outboundCallback;
        this.maxPacketSize = networkSettings?.maxPacketSize ?? 255;
        this.connectionSendRate = networkSettings?.connectionSendRate ?? 0;
        this.connectionPacketsPerAck = networkSettings?.connectionPacketsPerAck ?? 4;
        this.requestQueueSize = networkSettings?.requestQueueSize ?? 128;
        this.streamQueueSize = networkSettings?.streamQueueSize ?? 128;
    }

    /**
     * Call this function with the corresponding connection ID
     * and pass the received data. The class handles receiving fragmented
     * information.
     * @param id ID for the connection
     * @param data Data received
     */
    public inboundData(id: number, data: Uint8Array | string){

    }
    /**
     * Sets the outbound callback that must be sent to the 
     * corresponding connection with given ID.
     * @param callback Callback function
     */
    public outboundDataCb(callback: Callback): void{
        this.outboundCallback = callback;
    }

    /**
     * Call when a new client is connected
     * @param id Client ID
     */
    public connectClient(id: number){
        let connection = new NetworkConnection(
            id, this.maxPacketSize, this.connectionSendRate, this.connectionPacketsPerAck,
            this.requestQueueSize, this.streamQueueSize,
            this.outboundCallback,
        );
        this.connections.push(connection);
    }
    /**
     * Call when a client is disconnected
     * @param id Client ID
     */
    public disconnectClient(id: number){

    }
}