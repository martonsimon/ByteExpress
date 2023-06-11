import { ByteStream } from "./src/ByteExpress/ByteStream/ByteStream";

const world = 'world';

export function hello(who: string = world): string {
    return `Hello ${who}! `;
}

console.log(hello());