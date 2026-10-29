import { createHash, createHmac } from "node:crypto";
import { env } from "@servicehub/config/env";

const sha = (value: string) => createHash("sha256").update(value).digest("hex");
const hmac = (key: Buffer | string, value: string) => createHmac("sha256", key).update(value).digest();
const encode = (value: string) => encodeURIComponent(value).replace(/[!'()*]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`);
const amzDate = (date: Date) => date.toISOString().replace(/[:-]|\.\d{3}/g, "");

export class PrivateObjectStorage {
  private endpoint = new URL(env.S3_ENDPOINT);
  private scope(date: string) { return `${date.slice(0, 8)}/${env.S3_REGION}/s3/aws4_request`; }
  private signingKey(date: string) { return hmac(hmac(hmac(hmac(`AWS4${env.S3_SECRET_ACCESS_KEY}`, date.slice(0, 8)), env.S3_REGION), "s3"), "aws4_request"); }
  private path(key: string) { const root = `${this.endpoint.pathname.replace(/\/$/, "")}/${encode(env.S3_BUCKET)}`; return key ? `${root}/${key.split("/").map(encode).join("/")}` : root; }
  private signedUrl(method: "PUT" | "GET" | "HEAD" | "DELETE", key: string, expiresSeconds = 300) {
    const now = new Date(); const dateTime = amzDate(now); const date = dateTime.slice(0, 8); const scope = this.scope(date);
    const host = this.endpoint.host; const uri = this.path(key);
    const params: Record<string, string> = {
      "X-Amz-Algorithm": "AWS4-HMAC-SHA256", "X-Amz-Credential": `${env.S3_ACCESS_KEY_ID}/${scope}`,
      "X-Amz-Date": dateTime, "X-Amz-Expires": String(expiresSeconds), "X-Amz-SignedHeaders": "host"
    };
    const query = Object.entries(params).sort(([a], [b]) => a.localeCompare(b)).map(([k, v]) => `${encode(k)}=${encode(v)}`).join("&");
    const canonical = [method, uri, query, `host:${host}\n`, "host", "UNSIGNED-PAYLOAD"].join("\n");
    const stringToSign = `AWS4-HMAC-SHA256\n${dateTime}\n${scope}\n${sha(canonical)}`;
    params["X-Amz-Signature"] = createHmac("sha256", this.signingKey(date)).update(stringToSign).digest("hex");
    const url = new URL(`${this.endpoint.origin}${uri}`); for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
    return url.toString();
  }
  presignPut(key: string) { return this.signedUrl("PUT", key); }
  presignGet(key: string) { return this.signedUrl("GET", key); }
  presignDelete(key: string) { return this.signedUrl("DELETE", key); }
  newObjectKey(prefix: string, ext: string) { return `${prefix}/${crypto.randomUUID()}.${ext}`; }
  async read(key: string) { const response = await fetch(this.presignGet(key)); if (!response.ok) throw new Error("Stored file could not be read"); return new Uint8Array(await response.arrayBuffer()); }
  async write(key: string, bytes: Uint8Array, contentType: string) { const response = await fetch(this.presignPut(key), { method: "PUT", headers: { "content-type": contentType }, body: Buffer.from(bytes) }); if (!response.ok) throw new Error("Stored file could not be updated"); }
  async metadata(key: string) {
    const response = await fetch(this.signedUrl("GET", key), { headers: { range: "bytes=0-0" } });
    if (!response.ok) throw new Error(`Uploaded file was not found (${response.status}: ${(await response.text()).slice(0, 200)})`);
    const contentRange = response.headers.get("content-range");
    const size = contentRange ? Number(contentRange.split("/").at(-1)) : Number(response.headers.get("content-length") || 0);
    await response.body?.cancel();
    return { size, type: response.headers.get("content-type") || "" };
  }
  async remove(key: string) { await fetch(this.presignDelete(key), { method: "DELETE" }); }
  signedDownload(key: string) { return this.presignGet(key); }
  async ensureBucket() {
    const response = await fetch(this.signedUrl("PUT", ""), { method: "PUT" });
    if (!response.ok && response.status !== 409) throw new Error(`Private object bucket could not be created (${response.status})`);
  }
}
