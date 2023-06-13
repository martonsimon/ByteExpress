import { ByteStream } from "../ByteStream/ByteStream";

export class ByteUtils{
    static numberToBytes(number: number, bytesLength: number, isBigEndian: boolean): Uint8Array {
        const arr = new Uint8Array(bytesLength);
        for (let i = 0; i < bytesLength; i++) {
            const shift = isBigEndian ? (bytesLength - 1 - i) * 8 : i * 8;
            arr[i] = (number >>> shift) & 0xff;
        }
        return arr;
    }
      
    static bytesToNumber(bytes: Uint8Array, isBigEndian: boolean): number {
        let number = 0;
        const length = bytes.length;
        for (let i = 0; i < length; i++)
            number += bytes[isBigEndian ? length - i - 1 : i] << (8 * i);
        return number;
    }
      
    static stringToBytes(string: string): Uint8Array {
        const encoder = new TextEncoder();
        return encoder.encode(string);
    }
      
    static bytesToString(bytes: Uint8Array): string {
        const decoder = new TextDecoder();
        return decoder.decode(bytes);
    }

    /**
     * Find a given value in a byte array
     * @param bytes - Uint8Array
     * @param value - value to search for
     * @param startIndex - start index (inclusive)
     * @param endIndex  - end index (exclusive)
     * @returns - index or -1
     */
    static findByte(bytes: Uint8Array, value: number, startIndex: number = 0, endIndex: number = -1){
        if (endIndex == -1)
            endIndex = bytes.length;
        for (let i = startIndex; i < endIndex; i++)
            if (bytes[i] === value)
              return i;
        return -1;
    }

    /**
     * Find a given value in a ByteStream object
     * @param bytes - ByteStream object. After search, it is set back to its original position
     * @param value - value to search for
     * @param startIndex - index where the search starts (inclusive)
     * @param endIndex - index where the search ends (exclusive)
     * @returns the index of the first occurence of value or -1
     */
    static findByteInStream(bytes: ByteStream, value: number, startIndex: number = -1, endIndex: number = -1){
        if (startIndex == -1)
            startIndex = bytes.getHead();
        else
            bytes.setHead(startIndex);

        if (endIndex == -1)
            endIndex = bytes.getBytesWritten();
        let foundAt = -1;
        while (bytes.getRemainingAmount() > 0 && foundAt == -1 && bytes.getHead() < endIndex){
            let next = bytes.read(1);
            if (next![0] == value)
                foundAt = (bytes.getHead() - 1);
        }
        bytes.setHead(startIndex);
        
        return foundAt;
    }

    static setBit(byte: number, position: number, value: boolean): number{
        const mask = 1 << position;
        if (value)
            return byte | mask;
        else
            return byte & ~mask;
    }

    static getBit(byte: number, position: number): boolean{
        const mask = 1 << position;
        return !!(byte & mask);
    }
}