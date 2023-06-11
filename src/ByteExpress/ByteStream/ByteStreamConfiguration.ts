export class ByteStreamConfiguration {
    private static _initialBufferSize: number = 1024;
    private static _maxBufferSize: number = 8192;
    private static _bufferIncreaseStep = 512;
  
    static get initialBufferSize(): number { return ByteStreamConfiguration._initialBufferSize; }
    static get maxBufferSize(): number { return ByteStreamConfiguration._maxBufferSize; }
    static get bufferIncreaseStep(): number { return ByteStreamConfiguration._bufferIncreaseStep; }

    static set initialBufferSize(value: number) { ByteStreamConfiguration._initialBufferSize = value; }
    static set maxBufferSize(value: number) { ByteStreamConfiguration._maxBufferSize = value; }
    static set bufferIncreaseStep(value: number) { ByteStreamConfiguration._bufferIncreaseStep = value; }
}