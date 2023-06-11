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
            this.write(buffer);
    }
  
    /**
     * Write data into the internal buffer
     * @description The function copies the given array into
     *              its internal buffer. If the internal buffer size is too
     *              small, it is increased until the maximum size is reached.
     *              The function keeps track of the bytes written, and moves the head accordingly.
     * @param array - Array to be copied
     * @returns 
     */
    protected write(array: Uint8Array): boolean {
        const size = array.length;

        //if array have more data than available
        if (this.head_ + size > this.bufferSize_) {
            const additionalSize = this.head_ + size - this.bufferSize_; //required minimum new length
            const newSize = this.bufferSize_ + Math.ceil(additionalSize / this.bufferIncreaseStep_) * this.bufferIncreaseStep_; //increase size by the step size
  
            if (newSize > this.maxBufferSize_) {
                console.error('Error: Buffer size exceeded maximum limit.');
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
     * @returns - Uint8Array for the amount or undefined in case of error
     */
    protected read(amount: number, copyArray: boolean = true): Uint8Array | undefined {
        //Make sure to do not read more data than is available to read
        //If the head have been moved forward without writing data, then there is nothing left to read
        let newAmount = Math.min(amount, this.bytesWritten_ - this.head_);
  
        //return undefined if there is nothing to read
        if (newAmount <= 0) {
            console.error('Error: No more bytes to read.');
            return undefined;
        }
        //Warn if the function returns less than expected
        if (newAmount != amount)
            console.warn("Warn: The read function expected more data to be read, but less data is available");

        //Move head and return buffer
        let startIndex = this.head_;
        this.head_ += newAmount;
        if (copyArray)
            return this.buffer_.slice(startIndex, startIndex + newAmount);
        else
            return this.buffer_.subarray(startIndex, startIndex + newAmount);
    }
    protected readRemaining(copyArray: boolean = true): Uint8Array | undefined {
        return this.read(this.getRemainingAmount(), copyArray);
    }
    protected readAll(copyArray: boolean = true): Uint8Array | undefined {
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
            console.warn("The new head would be outside the range of buffer");
        this.head_ = Math.min(newHead, this.bufferSize_);
    }
    protected setBufferSize(newBufferSize: number): void {
        if (newBufferSize > this.maxBufferSize_) {
            console.error('Error: Buffer size exceeds the maximum limit.');
            return;
        }

        if (newBufferSize < this.head_) {
            console.error('Error: New buffer size is smaller than the current head position.');
            return;
        }
  
        this.increaseBufferSize(newBufferSize);
    }
    protected setMaxBufferSize(newBufferSize: number): void {
        if (! (newBufferSize < this.bufferSize_))
            this.maxBufferSize_ = newBufferSize;
        else
            console.error("Error: Max buffer size cannot be larger then the current buffer size");
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
  