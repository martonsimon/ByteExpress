import { ByteStream } from "../ByteStream/ByteStream";

/**
 * ByteUtils provide utilities for working with
 * bytes and data types, such as number and string
 * conversion.
 */
export class ByteUtils{
    private static readonly encoder = new TextEncoder();
    private static readonly decoder = new TextDecoder();

    /**
     * Takes a number and returns a given number of bytes from
     * that.
     * @param number - Number to convert
     * @param bytesLength - Number of bytes to get
     * @param isBigEndian - IsBigEndian
     * @returns - Uint8Array
     */
    static numberToBytes(number: number, bytesLength: number, isBigEndian: boolean): Uint8Array {
        const arr = new Uint8Array(bytesLength);
        for (let i = 0; i < bytesLength; i++) {
            const shift = isBigEndian ? (bytesLength - 1 - i) * 8 : i * 8;
            arr[i] = (number >>> shift) & 0xff;
        }
        return arr;
    }
    
    /**
     * Takes a Uint8Array and returns a number
     * @param bytes - bytes array
     * @param isBigEndian - IsBigEndian
     * @returns Number
     */
    static bytesToNumber(bytes: Uint8Array, isBigEndian: boolean): number {
        let number = 0;
        const length = bytes.length;
        for (let i = 0; i < length; i++)
            number += bytes[isBigEndian ? length - i - 1 : i] << (8 * i);
        return number;
    }
    
    /**
     * Takes a string and converts it into bytes
     * @param string - String to convert
     * @returns - Uint8Array
     */
    static stringToBytes(string: string): Uint8Array { return this.encoder.encode(string); }
      
    /**
     * Takes a bytes array and returns a string
     * @param bytes - Bytes array
     * @returns - String
     */
    static bytesToString(bytes: Uint8Array): string { return this.decoder.decode(bytes); }

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

    /**
     * Sets a given bit in a number to a given value
     * and returns the new number. Position at index
     * 0 is the LSB bit in the number (the smallest bit)
     * @param byte A number
     * @param position nth bit (where 0 is the smallest bit/LSB)
     * @param value logical value
     * @returns The new number
     */
    static setBit(byte: number, position: number, value: boolean): number{
        const mask = 1 << position;
        if (value)
            return byte | mask;
        else
            return byte & ~mask;
    }

    /**
     * Gets a given bit in a number and returns the
     * logical value. Position at index 0 is the LSB
     * bit in the number (the smallest bit)
     * @param byte A number
     * @param position nth bit (where 0 is the smallest bit/LSB)
     * @returns Logical value
     */
    static getBit(byte: number, position: number): boolean{
        const mask = 1 << position;
        return !!(byte & mask);
    }
}