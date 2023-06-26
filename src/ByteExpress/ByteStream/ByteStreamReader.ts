import { ByteStream } from "./ByteStream";
import { ByteStreamBase } from "./ByteStreamBase";
import { ByteStreamWriter } from "./ByteStreamWriter";

export class ByteStreamReader extends ByteStreamBase{
    constructor(buffer?: Uint8Array, initialBufferSize?: number, maxBufferSize?: number, bufferIncreaseStep?: number) {
        super(buffer, initialBufferSize, maxBufferSize, bufferIncreaseStep);
        this.setHead(0);
    }

    public read(amount: number, copyArray: boolean = true, throwError: boolean = false): Uint8Array | undefined { return super.read(amount, copyArray, throwError); }
    public readAll(copyArray: boolean = true): Uint8Array { return super.readAll(); }
    public readRemaining(copyArray: boolean = true): Uint8Array { return super.readRemaining(); }
    public getRemainingAmount(): number { return super.getRemainingAmount(); }
    public getLength(): number { return super.getBytesWritten(); }

    public toStream(): ByteStream {
        let stream = new ByteStream();
        stream.write(this.readAll()!);
        return stream;
    }
    public toStreamWriter(): ByteStreamWriter{
        let streamWriter = new ByteStreamWriter(this.readAll());
        return streamWriter;
    }

    public printDebug(): void { super.printDebug(); }
}