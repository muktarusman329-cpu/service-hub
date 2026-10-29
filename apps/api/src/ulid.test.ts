import assert from "node:assert/strict";
import { test } from "node:test";
import { newUlid } from "./ulid";

test("ULIDs are fixed-width Crockford base32 values with the supplied UTC timestamp", () => {
  const first = newUlid(1_798_000_000_000);
  const second = newUlid(1_798_000_000_000);
  assert.match(first, /^[0-7][0-9A-HJKMNP-TV-Z]{25}$/);
  assert.equal(first.slice(0, 10), second.slice(0, 10));
  assert.notEqual(first, second);
  assert.throws(() => newUlid(0x1000000000000), RangeError);
});
