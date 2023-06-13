import { ByteStream } from "../../src/ByteExpress/ByteStream/ByteStream";
import { ByteUtils } from "../../src/ByteExpress/ByteUtils/ByteUtils";
import { MyFlags } from "../../src/ByteExpress/ByteUtils/Flags";

describe('Testing Flags class', () => {

    test('MyFlags serialization and deserialization', () => {
        let flag = new MyFlags();
        flag.myFlag1 = true;
        flag.myFlag2 = true;
        
        let flag2 = new MyFlags(flag.getByte());
        flag2.fromByte(flag.getByte());
        expect(flag2.myFlag1).toBe(true);
        expect(flag2.myFlag2).toBe(true);
    });
});