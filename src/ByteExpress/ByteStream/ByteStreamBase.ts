import { ByteStreamConfiguration } from "./ByteStreamConfiguration";

/**
 * Protected base class for using ByteStreams. Use ByteStream, ByteStreamReader or ByteStremWriter instead.
 */
export class ByteStreamBase {
    private buffer_: Uint8Array;
    private bufferSize_: number;
    private maxBufferSize_: number;
    private bufferIncreaseStep_: number;
    private head_: number;
    private bytesWritten_: number;
  
    protected constructor(buffer?: Uint8Array, initialBufferSize?: number, maxBufferSize?: number, bufferIncreaseStep?: number) {
        this.bufferSize_ = initialBufferSize || ByteStreamConfiguration.initialBufferSize;
        this.maxBufferSize_ = maxBufferSize || ByteStreamConfiguration.maxBufferSize;
        this.bufferIncreaseStep_ = bufferIncreaseStep || ByteStreamConfiguration.bufferIncreaseStep;
        this.head_ = 0;
        this.bytesWritten_ = 0;
        this.buffer_ = new Uint8Array(this.bufferSize_);
        if (buffer)
            this.write(buffer, false);
    }
  
    /**
     * Write data into the internal buffer
     * @description The function copies the given array into
     *              its internal buffer. If the internal buffer size is too
     *              small, it is increased until the maximum size is reached.
     *              The function keeps track of the bytes written, and moves the head accordingly.
     * @param array - Array to be copied
     * @param throwError - Throws an error instead of returning
     * @returns 
     */
    protected write(array: Uint8Array, throwError: boolean): boolean {
        const size = array.length;

        //if array have more data than available
        if (this.head_ + size > this.bufferSize_) {
            const additionalSize = this.head_ + size - this.bufferSize_; //required minimum new length
            const newSize = this.bufferSize_ + Math.ceil(additionalSize / this.bufferIncreaseStep_) * this.bufferIncreaseStep_; //increase size by the step size
  
            if (newSize > this.maxBufferSize_) {
                if (throwError)
                    throw new BufferSizeExceeded();
                return false;
            }
            this.increaseBufferSize(newSize);
        }
  
        //set the bytes, move head and increment bytes written
        this.buffer_.set(array, this.head_);
        //if the head have been set back, but there is data
        //written, we do not want to increase the size
        let written = size - (this.bytesWritten_ - this.head_);
        this.bytesWritten_ += size > 0 ? written : 0;
        this.head_ += size; //Move the head after bytesWritten
        return true;
    }
  
    /**
     * Read a given number of bytes strting from the current head position
     * 
     * @description The function reads the given number of bytes and returns a reference or deep copy as specified.
     *              Returns undefined if there is nothing to read from the buffer and print an error
     *              If there isn't enough data, the remaining is returned and a warning is logged
     * @param amount - number of bytes to read
     * @param copyArray - return by reference or deep copy
     * @param throwError - Throws an error instead of returning undefined
     * @returns - Uint8Array for the amount or undefined in case of error
     */
    protected read(amount: number, copyArray: boolean = true, throwError: boolean): Uint8Array | undefined {
        //Make sure to do not read more data than is available to read
        //If the head have been moved forward without writing data, then there is nothing left to read
        let newAmount = Math.min(amount, this.bytesWritten_ - this.head_);
  
        //return undefined if there is not enough data to read or throw an error
        if ((newAmount != newAmount || newAmount <= 0) && throwError)
            throw new NotEnoughData();
        if (newAmount <= 0 || newAmount != amount)
            return undefined;

        //Move head and return buffer
        let startIndex = this.head_;
        this.head_ += newAmount;
        if (copyArray)
            return this.buffer_.slice(startIndex, startIndex + newAmount);
        else
            return this.buffer_.subarray(startIndex, startIndex + newAmount);
    }
    protected readRemaining(copyArray: boolean = true): Uint8Array {
        let data = this.read(this.getRemainingAmount(), copyArray, false);
        if (data)
            return data;
        else
            return new Uint8Array(0);
    }
    protected readAll(copyArray: boolean = true): Uint8Array {
        this.setHead(0);
        return this.readRemaining(copyArray);
    }
  
    protected getHead(): number { return this.head_; }
    protected getBufferSize(): number { return this.bufferSize_; }
    protected getMaxBufferSize(): number { return this.maxBufferSize_; }
    protected getBytesWritten(): number { return this.bytesWritten_; }
    protected getBuffer(): Uint8Array { return this.buffer_; }
    protected getRemainingAmount(): number { return this.bytesWritten_ - this.head_; }

    protected setHead(newHead: number): void {
        if (newHead > this.bufferSize_)
            throw new Error("The head is outside of the buffer range");
        this.head_ = Math.min(newHead, this.bufferSize_);
    }
    protected setBufferSize(newBufferSize: number): void {
        if (newBufferSize > this.maxBufferSize_)
            throw new Error("Buffer size exceeds the maximum limit");

        if (newBufferSize < this.head_)
            throw new Error("Error: New buffer size is smaller than the current head position");
  
        this.increaseBufferSize(newBufferSize);
    }
    protected setMaxBufferSize(newBufferSize: number): void {
        if (! (newBufferSize < this.bufferSize_))
            this.maxBufferSize_ = newBufferSize;
        else
            throw new Error("Max buffer size cannot be smaller then the current buffer size");
    }

    protected printDebug(): void{
        console.log("ByteStream debug information - - - - - - - - - - - -")
        console.log(`bufferSize_: ${this.bufferSize_}`);
        console.log(`maxBufferSize_: ${this.maxBufferSize_}`);
        console.log(`bufferIncreaseStep_: ${this.bufferIncreaseStep_}`);
        console.log(`head_: ${this.head_}`);
        console.log(`bytesWritten_: ${this.bytesWritten_}`);
        console.log(`buffer_: ${this.buffer_}`);
        console.log("- - - - - - - - - - - - - - - - - - - - - - - - - -")
    }
  
    //Increase the buffer size to be newSize
    private increaseBufferSize(newSize: number): void {
        const newBuffer = new Uint8Array(newSize);
        newBuffer.set(this.buffer_);
        this.buffer_ = newBuffer;
        this.bufferSize_ = newSize;
    }
  }

class BufferSizeExceeded extends Error{
    constructor(){
        const msg = "The buffer size could not be extended to accomodate new data";
        super(msg);
        this.name = "BufferSizeExceeded";
    }
}
class NotEnoughData extends Error{
    constructor(){
        const msg = "The buffer does not have enough data to read the specified amount";
        super(msg);
        this.name = "NotEnoughData";
    }
}