import { readVarInt } from "@utils/serverListPing";
import varint from "varint";

let buff = Buffer.alloc(0);

const array =
  "8f 02 00 8c 02 7b 22 76 65 72 73 69 6f 6e 22 3a 7b 22 6e 61 6d 65 22 3a 22 42 75 6e 67 65 65 43 6f 72 64 20 31 2e 38 2e 78 2d 31 2e 32 30 2e 78 22 2c"
    .split(" ")
    .map((item) => parseInt(item, 16));

buff = Buffer.from(array);

const varInt1 = readVarInt(buff, 0);
const varInt2 = readVarInt(buff, varInt1.offset);
const varInt3 = readVarInt(buff, varInt2.offset);

const buffer1 = buff.slice(0, varInt1.offset);
const buffer2 = buff.slice(varInt1.offset, varInt2.offset);
const buffer3 = buff.slice(varInt2.offset, varInt3.offset);

console.table({ varInt1, varInt2, varInt3 });
console.log([buffer1, buffer2, buffer3]);
debugger;
