import { PacketManager } from "../Packets/PacketManager";
import { NetworkConnection } from "./NetworkConnection";
import { Serializable } from "../Serialization/Serializable";
import { Payload } from "../Packets/NetworkingPackets/Payload";
import { NullPacket } from "../Packets/NetworkingPackets/NullPacket";
import { Subject, Observable, of, pipe, from, Observer } from 'rxjs';
import { StreamRequest } from "../Packets/NetworkingPackets/StreamRequest";
import { StreamData } from "../Packets/NetworkingPackets/StreamData";
import { CallbackHandler, CallbackHandlerElement } from "./RequestHandler";
import { AckPacket } from "../Packets/NetworkingPackets/AckPacket";
import { NumberPacket } from "../Packets/NetworkingPackets/NumberPacket";
import { StringPacket } from "../Packets/NetworkingPackets/StringPacket";
import { BytesPacket } from "../Packets/NetworkingPackets/BytesPacket";

export type StreamSettings = { //Optional settings for requests
    testSetting: number,
};
export type StreamCallback = (ctx: iStream) => Promise<void>; //Callback function for stream requests
export type ErrorCallback = (stream: iStream, err: Error) => Promise<void> | void; //Callback function for stream errors
export type FinalCallback = (stream: iStream) => Promise<void> | void; //Callback function for stream close
export type StreamCallbackHandler = {cb: StreamCallback, err?: ErrorCallback, final?: FinalCallback};
/**
 * Stream Handler keeps track of inbound and outbound
 * bidirectional streams and provides a way to manage
 * them in an async manner with error handling.
 */
export class StreamHandler{
    private readonly packetManager: PacketManager;
    private readonly connection: NetworkConnection;

    private readonly testSetting: number;

    private nextStreamId: number;
    private outboundStreams: Array<Stream>;
    private inboundStreams: Array<Stream>;
    private streamHandlers: CallbackHandler<string, StreamCallbackHandler>;

    constructor(
        packetManager: PacketManager,
        connection: NetworkConnection,
        streamSettings?: StreamSettings, //optional settings
    ){
        this.packetManager = packetManager;
        this.connection = connection;

        this.testSetting = streamSettings?.testSetting ?? 0;

        this.nextStreamId = 0;
        this.outboundStreams = new Array<Stream>();
        this.inboundStreams = new Array<Stream>();
        this.streamHandlers = new CallbackHandler<string, StreamCallbackHandler>();
    }

    //METHODS FOR INITIATING STREAMS (OUTBOUND)
    stream(endpoint: string, callback: StreamCallback, errorCallback?: ErrorCallback, finalCallback?: FinalCallback): void{
        //Create new ID and abort existing stream if any
        let id = this.incrementSequence();

        //Create the stream
        let stream = new Stream(
            this.packetManager,
            this.connection,
            true,
            callback,
            errorCallback,
            finalCallback,
            {testSetting: this.testSetting},
            {
                endpoint: endpoint,
                sequence: id,
            },
            undefined,
        );
        this.outboundStreams.push(stream);
        stream.sendStreamRequest();
        stream.callCb();
    }

    //METHODS FOR INCOMING STREAM REQUESTS
    public onStream(endpoint: string, callback: StreamCallback, errorCallback?: ErrorCallback, finalCallback?: FinalCallback): CallbackHandlerElement<string, StreamCallbackHandler>{
        return this.streamHandlers.addCallback(endpoint, {
            cb: callback,
            err: errorCallback,
            final: finalCallback,
        });
    }
    public inboundPacket(packet: Serializable){
        //Handle stream requests
        if (packet instanceof StreamRequest){
            this.inboundStream(packet);
        }

        //Handle stream data
        if (packet instanceof StreamData){
            let id = packet.streamId;
            let outbound = !(packet.flags.sender_initiated_stream);
            let arr = outbound ? this.outboundStreams : this.inboundStreams;
            let stream = arr.find(x => x.sequence == id);
            if (stream)
                stream.inboundDataPacket(packet);
        }

        //Clear up
        this.clearClosed(this.outboundStreams);
        this.clearClosed(this.inboundStreams);
    }
    private inboundStream(packet: StreamRequest){
        //Callback handlers
        let handler = this.streamHandlers.find(packet.endpoint);
        if (!handler)
            throw new Error("StreamContext: No handler for endpoint: " + packet.endpoint);

        //Create new ID and abort existing stream if any
        let id = this.incrementSequence();

        //Create the stream
        let stream = new Stream(
            this.packetManager,
            this.connection,
            false,
            handler.getCallback().cb,
            handler.getCallback().err,
            handler.getCallback().final,
            {testSetting: this.testSetting},
            undefined,
            packet
        );
        this.inboundStreams.push(stream);
        stream.callCb();
    }

    //COMMON METHODS
    private clearClosed(arr: Array<Stream>){
        for (let i = arr.length - 1; i >= 0; i--){
            let stream = arr[i];
            if (stream.closed)
                arr.splice(i, 1);
        }
    }
    private abortStream(streamId: number, outbound: boolean){
        let arr = outbound ? this.outboundStreams : this.inboundStreams;
        let sIndex = arr.findIndex(x => x.sequence == streamId);
        let stream = arr[sIndex];
        if (stream){
            stream.abort();
            arr.splice(sIndex, 1);
        }
    }
    /**
     * Increments the nextSequence counter, aborts
     * stuck/pending streams if any, then
     * returns the nextSequence that can be used
     * @returns Next sequence ID to use
     */
    private incrementSequence(): number{
        let sequence = this.nextStreamId;
        this.nextStreamId = (this.nextStreamId + 1) % 65535;
        this.abortStream(this.nextStreamId, true);

        return sequence;
    }
}

/**
 * Information about an outbound stream requests
 */
export type StreamPacketInfo = {
    endpoint: string;
    sequence: number;
}
/**
 * The Stream Context interface exposes the public
 * API for to use when working with stream requests
 */
export interface iStream{
    endpoint: string;
    isOutbound: boolean;
    autoClose: boolean;
    closed: boolean;
    failed: boolean;

    sendPacket(packet: Serializable): void;
    sendNumber(num: number, size: number): void;
    sendString(str: string): void;
    sendBytes(bytes: Uint8Array): void;
    sendAck(): void;

    readPacket<T extends Serializable>(returnType?: new (...args: any[]) => T): Promise<T>;
    readNumber(): Promise<number>;
    readString(): Promise<string>;
    readBytes(): Promise<Uint8Array>;
    readAck(): Promise<void>;

    close(): void;
}

/**
 * Stream class to handle the communcation, inbound
 * and outbound data, requests and responses.
 */
class Stream implements iStream{
    //Members accessible by StreamContext
    public readonly endpoint: string; //destination endpoint
    public readonly isOutbound: boolean; //A stream is outbound if the stream is initiated by the client
    public readonly settings: StreamSettings; //settings for the stream
    public autoClose: boolean; //when the callback function finishes, the stream is automatically closed
    public closed: boolean;
    public aborted: boolean;
    public failed: boolean;

    //Internal members
    public readonly sequence: number; //stream sequence number, NOTE: both client and server determine their own sequence numbers, a sequnice is not unique for a connection
    public readonly packetManager: PacketManager;
    public readonly connection: NetworkConnection; //connection to send packets
    public readonly streamCallback: StreamCallback;
    public readonly errorCallback: ErrorCallback | undefined;
    public readonly finalCallback: FinalCallback | undefined;

    private inboundPacketQueue: Array<StreamData>; //stores inbound packets until processed (necessary when testing code as requests can be synchronously sent)
    private readInboundQueue: Array<Subject<Serializable>>; //stores subjects to be resolved when nextInbound is called or when data is available

    constructor(
        packetManager: PacketManager,
        connection: NetworkConnection,
        isOutbound: boolean,
        streamCallback: StreamCallback,
        errorCallback: ErrorCallback | undefined,
        finalCallback: FinalCallback | undefined,
        settings: StreamSettings,

        outboundPacketInfo?: StreamPacketInfo,
        inboundPacket?: StreamRequest,
    ){
        this.packetManager = packetManager;
        this.connection = connection;
        this.isOutbound = isOutbound;
        this.streamCallback = streamCallback;
        this.errorCallback = errorCallback;
        this.finalCallback = finalCallback;
        this.settings = settings;
        this.autoClose = true;
        this.closed = false;
        this.aborted = false;
        this.failed = false;
        this.inboundPacketQueue = new Array<StreamData>();
        this.readInboundQueue = new Array<Subject<Serializable>>();

        //Because of type checking
        this.endpoint = "";
        this.sequence = 0;

        //Extract information for outbound streams
        if (isOutbound && outboundPacketInfo){
            this.endpoint = outboundPacketInfo.endpoint;
            this.sequence = outboundPacketInfo.sequence;
        } else if (isOutbound)
            throw new Error("StreamContext: Outbound stream requires outboundPacketInfo");

        //Extract information for inbound streams
        if (!isOutbound && inboundPacket){
            this.endpoint = inboundPacket.endpoint;
            this.sequence = inboundPacket.streamId;
        } else if (!isOutbound)
            throw new Error("StreamContext: Inbound stream requires inboundPacket");
    }

    /**
     * Calls the associated callback to start the stream
     */
    public async callCb(): Promise<void>{ 
        try{
            await this.streamCallback(this);
        } catch (err) {
            if (err instanceof StreamClosed){
                //If StreamClosed is thrown, it simply
                //means that an awaiting readPacket was
                //rejected, so no need to throw
                //NOTE: The error cb is called if given
            }
            else{
                console.log("An error occured inside the stream callback.");
                console.log(err);
            }
        }
    }

    /**
     * Generates and sends a stream request packet
     * to the connection
     */
    public sendStreamRequest(): void{
        let req = new StreamRequest();
        req.endpoint = this.endpoint;
        req.streamId = this.sequence;
        this.connection.sendPacket(req);
    }

    /**
     * Called when the connection receives an inbound packet
     * for streams
     * @param packet StreamData
     */
    public inboundDataPacket(packet: StreamData): void{
        //Do not process if the stream is closed
        if (this.closed)
            return;

        //Handle networking packets
        if (packet.flags.close_connection){
            this._close();
            return;
        }

        //Handle data packets
        this.inboundPacketQueue.push(packet);
        this.processInboundPackets();
    }
    private processInboundPackets(): void{
        while (this.readInboundQueue.length > 0 && this.inboundPacketQueue.length > 0){
            let subj = this.readInboundQueue.shift();
            let packet = this.inboundPacketQueue.shift();
            let payload = packet!.payload.toPacket(this.packetManager);

            subj!.next(payload);
            subj!.complete();
        }
    }
    public _close(): void{
        this.closed = true;

        //Make the pending reading throw an error if any
        //for both server and client side
        for (const subj of this.readInboundQueue){
            subj.error(new StreamClosed());
            //if the receiver have pending promises, the stream
            //is failed and the error cb is called
            this.failed = true;
        }
        this.readInboundQueue.splice(0, this.readInboundQueue.length);


        //If the stream is outbound, send a close packet
        if (this.isOutbound){
            let packet = new StreamData(this.packetManager);
            packet.flags.sender_initiated_stream = this.isOutbound;
            packet.flags.close_connection = true;
            packet.flags.error_response = false;
            packet.streamId = this.sequence;
            this.connection.sendPacket(packet);
        }

        if (this.failed || this.aborted)
            this.errorCallback?.(this, new Error());
        this.finalCallback?.(this);
    }

    public abort(): void{
        this.aborted = true;
        this.close();
    }

    //PUBLIC API
    sendPacket(packet: Serializable): void{
        let data = new StreamData(this.packetManager);
        data.flags.sender_initiated_stream = this.isOutbound;
        data.flags.close_connection = false;
        data.flags.error_response = false;
        data.streamId = this.sequence;
        data.setPayload(packet);

        this.connection.sendPacket(data);
    }
    sendNumber(num: number, size: number): void{
        let packet = new NumberPacket(num, size);
        this.sendPacket(packet);
    }
    sendString(str: string): void{
        let packet = new StringPacket(str);
        this.sendPacket(packet);
    }
    sendBytes(bytes: Uint8Array): void{
        let packet = new BytesPacket(bytes);
        this.sendPacket(packet);
    }
    sendAck(): void {
        this.sendPacket(new AckPacket());
    }

    readPacket<T extends Serializable>(returnType?: new (...args: any[]) => T): Promise<T> {
        let subj = new Subject<Serializable>();
        this.readInboundQueue.push(subj);
        return new Promise<T>((resolve, reject) => {
            subj.subscribe({
                next: (x) => {
                    if (returnType && !(x instanceof returnType))
                        throw new Error("StreamContext: nextInbound: Received packet of wrong type");
                    resolve(x as T);
                },
                error: (err) => {
                    reject(err);
                },
            });
            this.processInboundPackets();
        });
    }
    readNumber(): Promise<number>{
        return this.readPacket(NumberPacket).then(x => x.num);
    }
    readString(): Promise<string>{
        return this.readPacket(StringPacket).then(x => x.text);
    }
    readBytes(): Promise<Uint8Array>{
        return this.readPacket(BytesPacket).then(x => x.bytes);
    }
    readAck(): Promise<void> {
        return this.readPacket(AckPacket) as unknown as Promise<void>;
    }

    close(): void {
        this._close();
    }
}
export class StreamClosed extends Error{
    constructor(){
        super("Stream has been closed/aborted");
    }
}