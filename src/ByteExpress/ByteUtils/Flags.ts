import { ByteUtils } from "./ByteUtils";

/**
 * A flags base class for making it easier
 * to serialize and deserialize
 * flags.
 */
export abstract class Flags{
    protected flagsByte: number = 0;

    protected constructor(initial?: number){
        if (initial){
            this.flagsByte = initial;
            this.fromByte(this.flagsByte);
        }
    }

    protected abstract getByte(): number;
    protected abstract fromByte(byte: number): void;
}

/**
 * Example class
 */
export class MyFlags extends Flags{

    myFlag1: boolean = false;
    myFlag2: boolean = false;

    constructor(initial?: number){
        super(initial);
    }

    public getByte(): number{
        this.flagsByte = ByteUtils.setBit(this.flagsByte, 0, this.myFlag1);
        this.flagsByte = ByteUtils.setBit(this.flagsByte, 1, this.myFlag2);

        return this.flagsByte;
    }

    public fromByte(byte: number): void {
        this.myFlag1 = ByteUtils.getBit(byte, 0);
        this.myFlag2 = ByteUtils.getBit(byte, 1);
    }
}