import { ByteStream } from "./ByteStream";
import { ByteStreamBase } from "./ByteStreamBase";
import { ByteStreamReader } from "./ByteStreamReader";

export class ByteStreamWriter extends ByteStreamBase{
    constructor(buffer?: Uint8Array, initialBufferSize?: number, maxBufferSize?: number, bufferIncreaseStep?: number) {
        super(buffer, initialBufferSize, maxBufferSize, bufferIncreaseStep);
    }

    public write(array: Uint8Array): boolean { return super.write(array); }
    public toStream(): ByteStream {
        let stream = new ByteStream();
        stream.write(this.readAll()!);
        return stream;
    }
    public toStreamReader(): ByteStreamReader{
        let streamReader = new ByteStreamReader(this.readAll()); //head is set to 0 in constructor
        return streamReader;
    }

    public printDebug(): void { super.printDebug(); }
}