import { randomBytes } from "node:crypto";

const alphabet = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";

/** Generate a 26-character ULID (48-bit UTC milliseconds + 80 CSPRNG bits). */
export function newUlid(now = Date.now()): string {
  if (!Number.isSafeInteger(now) || now < 0 || now > 0xffffffffffff) throw new RangeError("ULID timestamp is outside the 48-bit range");
  let value = (BigInt(now) << 80n) | BigInt(`0x${randomBytes(10).toString("hex")}`);
  const output = new Array<string>(26);
  for (let index = 25; index >= 0; index -= 1) {
    output[index] = alphabet[Number(value & 31n)]!;
    value >>= 5n;
  }
  return output.join("");
}
