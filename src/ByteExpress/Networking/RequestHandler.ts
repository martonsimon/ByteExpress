export class RequestHandler{
    private readonly outboundCb: new () => any; //outbound stream sent to connection instance for further processing

    constructor(
        outboundCb: new () => any)
    {
        this.outboundCb = outboundCb;
    }
}