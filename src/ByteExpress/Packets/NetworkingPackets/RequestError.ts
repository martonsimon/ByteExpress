import { Serializable } from "../../Serialization/Serializable";
import { ByteStreamReader } from "../../ByteStream/ByteStreamReader";
import { ErrorCause } from "./ErrorCause.enum";

/**
 * Class representing the cause of the error
 */
export class RequestError extends Serializable{
    cause: ErrorCause = ErrorCause.NONE;

    constructor(){ super(); }

    toJson(): object{
        let stringRepresentation;
        const enumKeys = Object.keys(ErrorCause).filter((key) => isNaN(Number(key)));
        for (const key of enumKeys) {
          if (ErrorCause[key as keyof typeof ErrorCause] === this.cause) {
            stringRepresentation = key;
          }
        }
        const obj = {
            __name: "RequestError",
            cause: this.cause,
            cause_string: stringRepresentation,
        };
        return obj;
    }
    fromJson(data: string): boolean{
        throw new Error("Not implemented");
    }
    toBytes(): ByteStreamReader{
        this.initSerializer();

        this.addNumber(this.cause, 1);


        return this.getSerialized();
    }
    fromBytes(stream: ByteStreamReader): boolean{
        this.initDeserializer(stream);

        this.cause = this.getNumber(1);


        return true;
    }

}