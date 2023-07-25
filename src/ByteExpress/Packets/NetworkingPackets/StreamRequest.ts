import { Serializable } from "../../Serialization/Serializable";
import { ByteStreamReader } from "../../ByteStream/ByteStreamReader";

/**
 * StreamRequest is used to indicate the begin
 * of a new stream channel. An endpoint and 
 * stream id is sent.
 */
export class StreamRequest extends Serializable{
    endpoint: string = "";
    streamId: number = 0; //2 bytes

    constructor(){ super(); }
    toJson(): object{
        let obj = {
            __name: "StreamRequest",
            endpoint: this.endpoint,
            streamId: this.streamId,
        }
        return obj;
    }
    fromJson(data: string): boolean{
        throw new Error("Not implemented");
    }
    toBytes(): ByteStreamReader{
        this.initSerializer();
        
        this.addString(this.endpoint);
        this.addNumber(this.streamId, 2);

        return this.getSerialized();
    }
    fromBytes(stream: ByteStreamReader): boolean{
        this.initDeserializer(stream);
        
        this.endpoint = this.getString();
        this.streamId = this.getNumber(2);

        return true;
    }
}