import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { StructuredLogger } from "./structured-logger";

describe("StructuredLogger redaction", () => {
  it("redacts access tokens, OTPs, and Nigerian phone numbers", () => {
    const original = console.log;
    let output = "";
    console.log = (value?: unknown) => { output = String(value); };
    try {
      new StructuredLogger().log("Bearer access-token DEV OTP for +2348012345678: 123456");
    } finally { console.log = original; }
    assert.doesNotMatch(output, /access-token|2348012345678|123456/);
    assert.match(output, /Bearer \[REDACTED\]/);
    assert.match(output, /\[PHONE\]/);
    assert.match(output, /\[CODE\]/);
  });
});
