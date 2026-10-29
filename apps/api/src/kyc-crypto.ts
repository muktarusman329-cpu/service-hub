import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes } from "node:crypto";
import { env } from "@servicehub/config/env";

export interface KmsKeyProvider { getKey(keyId: string): Promise<Buffer> }

export class EnvironmentKycKeyProvider implements KmsKeyProvider {
  private readonly keys: Record<string, string>;
  constructor() {
    try { this.keys = JSON.parse(env.KYC_KEYRING_JSON) as Record<string, string>; }
    catch { throw new Error("KYC keyring must be valid JSON"); }
    const active = env.APP_ENCRYPTION_KEY || env.SESSION_SECRET || env.OTP_HASH_SECRET;
    if (!this.keys[env.KYC_ACTIVE_KEY_ID] && active) this.keys[env.KYC_ACTIVE_KEY_ID] = active;
  }
  async getKey(keyId: string) {
    const raw = this.keys[keyId];
    if (!raw) throw new Error("KYC encryption key is unavailable");
    const decoded = Buffer.from(raw, "base64");
    const bytes = decoded.length === 32 ? decoded : createHash("sha256").update(raw).digest();
    return bytes;
  }
}

export async function encryptIdNumber(value: string, provider: KmsKeyProvider = new EnvironmentKycKeyProvider()) {
  const keyId = env.KYC_ACTIVE_KEY_ID; const key = await provider.getKey(keyId); const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  return { keyId, value: `${iv.toString("base64url")}.${cipher.getAuthTag().toString("base64url")}.${ciphertext.toString("base64url")}` };
}

export async function decryptIdNumber(value: string, keyId: string, provider: KmsKeyProvider = new EnvironmentKycKeyProvider()) {
  const [iv, tag, ciphertext] = value.split(".");
  const decipher = createDecipheriv("aes-256-gcm", await provider.getKey(keyId), Buffer.from(iv!, "base64url"));
  decipher.setAuthTag(Buffer.from(tag!, "base64url"));
  return Buffer.concat([decipher.update(Buffer.from(ciphertext!, "base64url")), decipher.final()]).toString("utf8");
}

export const idBlindIndex = (type: string, number: string) => createHmac("sha256", env.KYC_BLIND_INDEX_SECRET || env.OTP_HASH_SECRET).update(`${type}:${number.trim().toUpperCase()}`).digest("hex");
export const maskIdNumber = (number: string) => `••••${number.slice(-4)}`;
