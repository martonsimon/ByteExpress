import { ByteStream } from "../../src/ByteExpress/ByteStream/ByteStream";
import { ByteUtils } from "../../src/ByteExpress/ByteUtils/ByteUtils";

describe('Testing ByteUtils class', () => {

    test('numberToBytes', () => {
        //number to bytes
        let bytes1 = ByteUtils.numberToBytes(0, 0, true);
        let bytes2 = ByteUtils.numberToBytes(0, 4, true);
        let bytes3 = ByteUtils.numberToBytes(128, 0, true);
        let bytes4 = ByteUtils.numberToBytes(128, 1, true);
        let bytes5 = ByteUtils.numberToBytes(128, 4, true);
        let bytes6 = ByteUtils.numberToBytes(256, 0, true);
        let bytes7 = ByteUtils.numberToBytes(256, 2, true);
        let bytes8 = ByteUtils.numberToBytes(255, 2, true);

        let bytes11 = ByteUtils.numberToBytes(0, 0, false);
        let bytes12 = ByteUtils.numberToBytes(0, 4, false);
        let bytes13 = ByteUtils.numberToBytes(128, 0, false);
        let bytes14 = ByteUtils.numberToBytes(128, 1, false);
        let bytes15 = ByteUtils.numberToBytes(128, 4, false);
        let bytes16 = ByteUtils.numberToBytes(256, 0, false);
        let bytes17 = ByteUtils.numberToBytes(256, 2, false);
        let bytes18 = ByteUtils.numberToBytes(255, 2, false);

        expect(bytes1).toEqual(new Uint8Array(0));
        expect(bytes2).toEqual(new Uint8Array([0, 0, 0, 0]));
        expect(bytes3).toEqual(new Uint8Array(0));
        expect(bytes4).toEqual(new Uint8Array([128]));
        expect(bytes5).toEqual(new Uint8Array([0, 0, 0, 128]));
        expect(bytes6).toEqual(new Uint8Array(0));
        expect(bytes7).toEqual(new Uint8Array([1,0]));
        expect(bytes8).toEqual(new Uint8Array([0, 255]));

        expect(bytes11).toEqual(new Uint8Array(0));
        expect(bytes12).toEqual(new Uint8Array([0, 0, 0, 0]));
        expect(bytes13).toEqual(new Uint8Array(0));
        expect(bytes14).toEqual(new Uint8Array([128]));
        expect(bytes15).toEqual(new Uint8Array([128, 0, 0, 0]));
        expect(bytes16).toEqual(new Uint8Array(0));
        expect(bytes17).toEqual(new Uint8Array([0, 1]));
        expect(bytes18).toEqual(new Uint8Array([255, 0]));
    });

    test('bytesToNumber', () => {
        //number to bytes
        let bytes1 = ByteUtils.numberToBytes(0, 0, true);
        let bytes2 = ByteUtils.numberToBytes(0, 4, true);
        let bytes3 = ByteUtils.numberToBytes(128, 0, true);
        let bytes4 = ByteUtils.numberToBytes(128, 1, true);
        let bytes5 = ByteUtils.numberToBytes(128, 4, true);
        let bytes6 = ByteUtils.numberToBytes(256, 0, true);
        let bytes7 = ByteUtils.numberToBytes(256, 2, true);
        let bytes8 = ByteUtils.numberToBytes(255, 2, true);

        let bytes11 = ByteUtils.numberToBytes(0, 0, false);
        let bytes12 = ByteUtils.numberToBytes(0, 4, false);
        let bytes13 = ByteUtils.numberToBytes(128, 0, false);
        let bytes14 = ByteUtils.numberToBytes(128, 1, false);
        let bytes15 = ByteUtils.numberToBytes(128, 4, false);
        let bytes16 = ByteUtils.numberToBytes(256, 0, false);
        let bytes17 = ByteUtils.numberToBytes(256, 2, false);
        let bytes18 = ByteUtils.numberToBytes(255, 2, false);

        let numFrombytes1 = ByteUtils.bytesToNumber(bytes1, true);
        let numFrombytes2 = ByteUtils.bytesToNumber(bytes2, true);
        let numFrombytes3 = ByteUtils.bytesToNumber(bytes3, true);
        let numFrombytes4 = ByteUtils.bytesToNumber(bytes4, true);
        let numFrombytes5 = ByteUtils.bytesToNumber(bytes5, true);
        let numFrombytes6 = ByteUtils.bytesToNumber(bytes6, true);
        let numFrombytes7 = ByteUtils.bytesToNumber(bytes7, true);
        let numFrombytes8 = ByteUtils.bytesToNumber(bytes8, true);

        let numFrombytes11 = ByteUtils.bytesToNumber(bytes11, false);
        let numFrombytes12 = ByteUtils.bytesToNumber(bytes12, false);
        let numFrombytes13 = ByteUtils.bytesToNumber(bytes13, false);
        let numFrombytes14 = ByteUtils.bytesToNumber(bytes14, false);
        let numFrombytes15 = ByteUtils.bytesToNumber(bytes15, false);
        let numFrombytes16 = ByteUtils.bytesToNumber(bytes16, false);
        let numFrombytes17 = ByteUtils.bytesToNumber(bytes17, false);
        let numFrombytes18 = ByteUtils.bytesToNumber(bytes18, false);

        expect(numFrombytes1).toBe(0);
        expect(numFrombytes2).toBe(0);
        expect(numFrombytes3).toBe(0);
        expect(numFrombytes4).toBe(128);
        expect(numFrombytes5).toBe(128);
        expect(numFrombytes6).toBe(0);
        expect(numFrombytes7).toBe(256);
        expect(numFrombytes8).toBe(255);
        
        expect(numFrombytes11).toBe(0);
        expect(numFrombytes12).toBe(0);
        expect(numFrombytes13).toBe(0);
        expect(numFrombytes14).toBe(128);
        expect(numFrombytes15).toBe(128);
        expect(numFrombytes16).toBe(0);
        expect(numFrombytes17).toBe(256);
        expect(numFrombytes18).toBe(255);
    });

    test('bytesToNumber', () => {
        let result1 = ByteUtils.stringToBytes("");
        let result2 = ByteUtils.stringToBytes("Hello");
        let result3 = ByteUtils.stringToBytes("Hello íéáűőúöóü");

        expect(ByteUtils.bytesToString(result1)).toBe("");
        expect(ByteUtils.bytesToString(result2)).toBe("Hello");
        expect(ByteUtils.bytesToString(result3)).toBe("Hello íéáűőúöóü");
    });

    test('findByte', () => {
        let result1 = ByteUtils.findByte(new Uint8Array([]), 255);
        let result2 = ByteUtils.findByte(new Uint8Array([10, 20, 30, 255]), 255);
        let result3 = ByteUtils.findByte(new Uint8Array([10, 20, 30, 255]), 10);
        let result4 = ByteUtils.findByte(new Uint8Array([10, 20, 30, 255]), 10, 1);
        let result5 = ByteUtils.findByte(new Uint8Array([10, 20, 30, 255]), 255, 1, 1);
        let result6 = ByteUtils.findByte(new Uint8Array([10, 20, 30, 255]), 255, 1, 2);

        expect(result1).toBe(-1);
        expect(result2).toBe(3);
        expect(result3).toBe(0);
        expect(result4).toBe(-1);
        expect(result5).toBe(-1);
        expect(result6).toBe(-1);
    });

    test('findByteInStream', () => {
        let stream1 = new ByteStream(new Uint8Array([10, 20, 30, 255]));
        stream1.setHead(0);

        let result1 = ByteUtils.findByteInStream(stream1, 255);
        let result2 = ByteUtils.findByteInStream(stream1, 10);
        let result3 = ByteUtils.findByteInStream(stream1, 11);

        let result4 = ByteUtils.findByteInStream(stream1, 255, 0, 4);
        let result5 = ByteUtils.findByteInStream(stream1, 255, 0, 3);
        let result6 = ByteUtils.findByteInStream(stream1, 10, 1, 4);

        expect(result1).toBe(3);
        expect(result2).toBe(0);
        expect(result3).toBe(-1);

        expect(result4).toBe(3);
        expect(result5).toBe(-1);
        expect(result6).toBe(-1);
    });

    test('setBit and getBit', () => {
        let num1 = ByteUtils.setBit(0, 0, true);
        let num2 = ByteUtils.setBit(0, 7, true);
        let num3 = ByteUtils.setBit(255, 0, false);

        expect(num1).toBe(1);
        expect(num2).toBe(128);
        expect(num3).toBe(254);

        let val1 = ByteUtils.getBit(num1, 0);
        let val2 = ByteUtils.getBit(num2, 7);
        let val3 = ByteUtils.getBit(num3, 0);

        expect(val1).toBe(true);
        expect(val2).toBe(true);
        expect(val3).toBe(false);
    });
});