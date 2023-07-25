import { Callback, NetworkHandler, NetworkSettings } from "./Networking/NetworkHandler";

export class ByteExpressServer extends NetworkHandler{
    constructor(
        outboundCallback: Callback,
        networkSettings?: NetworkSettings,
    ){
        networkSettings = networkSettings ?? {};
        networkSettings!.debugPrefix ??= "ByteExpressServer";

        super(outboundCallback, networkSettings);
    }
}