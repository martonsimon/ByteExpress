import { hello } from "../..";
import { ByteStream } from "../../src/ByteExpress/ByteStream/ByteStream";
import { ByteStreamConfiguration } from "../../src/ByteExpress/ByteStream/ByteStreamConfiguration";
import { ByteStreamReader } from "../../src/ByteExpress/ByteStream/ByteStreamReader";
import { ByteStreamWriter } from "../../src/ByteExpress/ByteStream/ByteStreamWriter";

const testArr1 = new Uint8Array([1, 2, 3, 4]);
const testArr2 = new Uint8Array([5, 6, 7, 8, 9, 10, 11, 12]);

describe('Testing ByteStream class', () => {

    test('create empty ByteStream', () => {
        let stream = new ByteStream();

        expect(stream).toBeDefined();
        expect(stream.getHead()).toBe(0);
        expect(stream.getBufferSize()).toBe(ByteStreamConfiguration.initialBufferSize);
        expect(stream.getMaxBufferSize()).toBe(ByteStreamConfiguration.maxBufferSize);
        expect(stream.getBytesWritten()).toBe(0);
        expect(stream.getBuffer()).toBeDefined();
    });

    test('create empty ByteStream and move head', () => {
        let stream = new ByteStream();
        stream.setHead(10);
        expect(stream.getHead()).toBe(10);
    });

    test('create empty ByteStream and set buffer size', () => {
        let stream = new ByteStream();
        stream.setBufferSize(1025);
        expect(stream.getBufferSize()).toBe(1025);
        expect(stream.getBuffer().length).toBe(1025);

        expect(() => stream.setBufferSize(10000)).toThrow(); //should not happen as limit is reached
        expect(stream.getBufferSize()).toBe(1025);
        expect(stream.getBuffer().length).toBe(1025);
    });

    test('writing data', () => {
        //test simple writing
        let stream = new ByteStream();
        let writeResult = stream.write(testArr1);

        expect(writeResult).toBeTruthy();
        expect(stream.getHead()).toBe(4);
        expect(stream.getBytesWritten()).toBe(4);

        //test writing in place of other data
        stream.setHead(0);
        stream.write(testArr1);
        expect(stream.getHead()).toBe(4);
        expect(stream.getBytesWritten()).toBe(4);

        stream.setHead(0);
        stream.write(testArr2);
        expect(stream.getHead()).toBe(8);
        expect(stream.getBytesWritten()).toBe(8);

        //stream.setHead(0);
        stream.write(testArr1);
        expect(stream.getHead()).toBe(12);
        expect(stream.getBytesWritten()).toBe(12);
    });

    test('writing and reading data', () => {
        //simple read
        let stream = new ByteStream(testArr2);
        expect(stream.getHead()).toBe(8);
        expect(stream.getBytesWritten()).toBe(8);

        stream.setHead(0);
        expect(stream.getHead()).toBe(0);
        expect(stream.getBytesWritten()).toBe(8);

        let read1 = stream.read(2);
        console.log(read1);
        expect(read1).toEqual(testArr2.slice(0, 2));
        expect(stream.getHead()).toBe(2);
        expect(stream.getBytesWritten()).toBe(8);

        let read2 = stream.read(6);
        expect(read2).toEqual(testArr2.slice(2, 8));
        expect(stream.getHead()).toBe(8);
        expect(stream.getBytesWritten()).toBe(8);

        //reading if no data is available
        let read3 = stream.read(1);
        expect(read3).toBeUndefined();
        expect(stream.getHead()).toBe(8);
        expect(stream.getBytesWritten()).toBe(8);

        //reading if less data is available (NOTE: the new version throws or returns undefined anyway)
        stream.write(testArr1);
        stream.setHead(8);
        let read4 = stream.read(5);
        expect(read4).toEqual(undefined); //used to return the testArr1 (the remaining)
        expect(stream.getHead()).toBe(8); //used to be 12
        expect(stream.getBytesWritten()).toBe(12);
    });

    test('reading remainingdata and readall', () => {
        let stream = new ByteStream(testArr2);
        let result1 = stream.readAll();
        expect(result1).toEqual(testArr2);

        stream.setHead(4);
        let result2 = stream.readRemaining();
        expect(result2).toEqual(testArr2.slice(4, 8));
    });
});

describe('Testing ByteStreamWriter class', () => {
    test('creating instance with empty buffer', () => {
        let stream = new ByteStreamWriter();
        expect(stream).toBeDefined();
    });

    test('creating instance with buffer', () => {
        let stream = new ByteStreamWriter(testArr1);
        expect(stream).toBeDefined();

        let stream2 = stream.toStream();
        expect(stream2).toBeDefined();
        expect(stream2.getHead()).toBe(4);
        expect(stream2.getBytesWritten()).toBe(4);
        expect(stream2.getBuffer()).toBeDefined();
        expect(stream2.readAll()).toEqual(testArr1);
    });

    test('converting to stream and stream reader', () => {
        let streamWriter = new ByteStreamWriter(testArr1);
        expect(streamWriter).toBeDefined();
        
        let stream = streamWriter.toStream();
        expect(stream).toBeDefined();
        expect(stream.getHead()).toBe(4);
        expect(stream.getBytesWritten()).toBe(4);
        expect(stream.getBuffer()).toBeDefined();
        expect(stream.getBuffer().slice(0, 4)).toEqual(testArr1);

        let streamReader = streamWriter.toStreamReader();
        expect(streamReader).toBeDefined();
        expect(streamReader.getRemainingAmount()).toBe(4);
        expect(streamReader.readAll()).toEqual(testArr1);

        let streamReader2 = streamWriter.toStreamReader();
        let result = streamReader2.readRemaining();
        result![0] = 100;

        expect(result![0]).not.toEqual(stream.getBuffer()[0]);
    });
});

describe('Testing ByteStreamReader class', () => {
    test('creating instance with empty buffer', () => {
        let stream = new ByteStreamReader();
        expect(stream).toBeDefined();
    });

    test('creating instance with buffer', () => {
        let stream = new ByteStreamReader(testArr1);
        expect(stream).toBeDefined();
        expect(stream.getRemainingAmount()).toBe(4);

        let stream2 = stream.toStream();
        expect(stream2).toBeDefined();
        expect(stream2.getHead()).toBe(4);
        expect(stream2.getBytesWritten()).toBe(4);
        expect(stream2.getBuffer()).toBeDefined();
        expect(stream2.readAll()).toEqual(testArr1);
    });

    test('converting to stream and stream writer', () => {
        let streamReader3 = new ByteStreamReader(testArr1);
        expect(streamReader3).toBeDefined();
        
        let stream = streamReader3.toStream();
        expect(stream).toBeDefined();
        expect(stream.getHead()).toBe(4);
        expect(stream.getBytesWritten()).toBe(4);
        expect(stream.getBuffer()).toBeDefined();
        expect(stream.getBuffer().slice(0, 4)).toEqual(testArr1);

        let streamWriter = streamReader3.toStreamWriter();
        expect(streamWriter).toBeDefined();
        streamWriter.write(testArr1);

        let stream2 = streamWriter.toStream();
        expect(stream2.getBytesWritten()).toBe(8);
    });
});
