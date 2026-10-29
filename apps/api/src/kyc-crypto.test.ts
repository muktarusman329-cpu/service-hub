import assert from "node:assert/strict";
import { test } from "node:test";
import { decryptIdNumber, encryptIdNumber, idBlindIndex, maskIdNumber, type KmsKeyProvider } from "./kyc-crypto";

class TestKeyProvider implements KmsKeyProvider {
  constructor(private keys: Record<string, Buffer>) {}
  async getKey(keyId: string) { const value = this.keys[keyId]; if (!value) throw new Error("KYC encryption key is unavailable"); return value; }
}

test("KYC encryption decrypts with historical key id during key rotation", async () => {
  const provider = new TestKeyProvider({ "local-v1": Buffer.alloc(32, 1), "local-v2": Buffer.alloc(32, 2) });
  const encrypted = await encryptIdNumber("12345678901", provider);
  assert.equal(await decryptIdNumber(encrypted.value, encrypted.keyId, provider), "12345678901");
  assert.equal(await decryptIdNumber(encrypted.value, "local-v1", provider), "12345678901");
});

test("KYC blind index is stable and masked display reveals only the last four", () => {
  assert.equal(idBlindIndex("NIN", "12345678901"), idBlindIndex("NIN", " 12345678901 "));
  assert.equal(maskIdNumber("12345678901"), "••••8901");
});
