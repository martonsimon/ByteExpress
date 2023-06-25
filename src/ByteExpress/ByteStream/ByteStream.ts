import { ByteStreamBase } from "./ByteStreamBase";
import { ByteStreamReader } from "./ByteStreamReader";
import { ByteStreamWriter } from "./ByteStreamWriter";

export class ByteStream extends ByteStreamBase{
    constructor(buffer?: Uint8Array, initialBufferSize?: number, maxBufferSize?: number, bufferIncreaseStep?: number) {
        super(buffer, initialBufferSize, maxBufferSize, bufferIncreaseStep);
    }

    public write(array: Uint8Array): boolean { return super.write(array); }
    public read(amount: number, copyArray: boolean = true): Uint8Array | undefined { return super.read(amount, copyArray); }
    public readRemaining(copyArray: boolean = true): Uint8Array { return super.readRemaining(); }
    public readAll(copyArray: boolean = true): Uint8Array { return super.readAll(); }
  
    public getHead(): number { return super.getHead(); }
    public getBufferSize(): number { return super.getBufferSize(); }
    public getMaxBufferSize(): number { return super.getMaxBufferSize(); }
    public getBytesWritten(): number { return super.getBytesWritten(); }
    public getBuffer(): Uint8Array { return super.getBuffer(); }
    public getRemainingAmount(): number { return super.getRemainingAmount(); }

    public setHead(newHead: number): void { super.setHead(newHead); }
    public setBufferSize(newBufferSize: number): void { super.setBufferSize(newBufferSize); }
    public setMaxBufferSize(newBufferSize: number): void { super.setMaxBufferSize(newBufferSize); }

    public toStreamReader(): ByteStreamReader{
        let streamReader = new ByteStreamReader(this.readAll()); //head is set to 0 in constructor
        return streamReader;
    }
    public toStreamWriter(): ByteStreamWriter{
        let streamWriter = new ByteStreamWriter(this.readAll());
        return streamWriter;
    }

    public printDebug(): void { super.printDebug(); }
}