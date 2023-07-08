import { Callback, NetworkHandler, NetworkSettings } from "./Networking/NetworkHandler";

export class ByteExpressServer extends NetworkHandler{
    constructor(
        outboundCallback: Callback,
        networkSettings?: NetworkSettings,
    ){
        super(outboundCallback, networkSettings);
    }
}