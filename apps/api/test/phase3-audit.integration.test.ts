import assert from "node:assert/strict";
import { randomInt, randomUUID } from "node:crypto";
import { test } from "node:test";
import { JwtService } from "@nestjs/jwt";
import { PrismaClient } from "@servicehub/db";
import { env } from "@servicehub/config/env";
import { digest } from "../src/security";
import { encryptIdNumber, idBlindIndex } from "../src/kyc-crypto";
import { PrivateObjectStorage } from "../src/object-storage";

const enabled = process.env.RUN_PHASE2_INTEGRATION === "1";
if (!enabled) console.warn("WARNING: SKIPPING Phase 3 KYC HTTP audit tests; set RUN_PHASE2_INTEGRATION=1 and start the API with PostgreSQL, Redis and MinIO running.");
const db = new PrismaClient();
const storage = new PrivateObjectStorage();
const jwt = new JwtService({ secret: env.JWT_ACCESS_SECRET });
const api = process.env.API_BASE_URL || `http://127.0.0.1:${env.API_PORT}/api/v1`;
const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/pVQAAAAASUVORK5CYII=", "base64");
const newPhone = () => `+2348${String(randomInt(0, 1_000_000_000)).padStart(9, "0")}`;

async function account(roleId: string, name: string, totp = true) {
  const user = await db.user.create({ data: { phoneE164: newPhone(), displayName: name, phoneVerifiedAt: new Date(), ...(totp ? { totpEnabledAt: new Date() } : {}) } });
  await db.userRole.create({ data: { userId: user.id, roleId } });
  const sessionId = randomUUID();
  await db.session.create({ data: { id: sessionId, familyId: randomUUID(), userId: user.id, refreshTokenHash: digest(randomUUID()), expiresAt: new Date(Date.now() + 3_600_000) } });
  return { user, token: await jwt.signAsync({ sub: user.id, sid: sessionId }) };
}

async function call(token: string, path: string, method = "GET", body?: unknown) {
  const response = await fetch(`${api}${path}`, { method, headers: { authorization: `Bearer ${token}`, ...(body ? { "content-type": "application/json" } : {}) }, ...(body ? { body: JSON.stringify(body) } : {}) });
  return { response, body: await response.json().catch(() => ({})) as Record<string, unknown> };
}

function withExif(original: Buffer) {
  const signature = original.subarray(0, 8);
  let offset = 8;
  while (offset + 12 <= original.length) {
    const length = original.readUInt32BE(offset);
    const kind = original.toString("ascii", offset + 4, offset + 8);
    if (kind === "IEND") break;
    offset += length + 12;
  }
  const payload = Buffer.from("test metadata");
  const chunk = Buffer.alloc(payload.length + 12);
  chunk.writeUInt32BE(payload.length, 0); chunk.write("eXIf", 4, "ascii"); payload.copy(chunk, 8);
  return Buffer.concat([signature, original.subarray(8, offset), chunk, original.subarray(offset)]);
}

test("Phase 3 HTTP upload pipeline rejects MIME mismatches and strips EXIF metadata", { skip: !enabled, timeout: 45_000 }, async () => {
  await db.$connect(); await storage.ensureBucket();
  const role = await db.role.findUniqueOrThrow({ where: { key: "TECHNICIAN" } });
  const city = await db.city.findUniqueOrThrow({ where: { slug: "minna" } });
  const { user, token } = await account(role.id, "Phase 3 KYC pipeline integration");
  const profile = await db.technicianProfile.create({ data: { userId: user.id, cityId: city.id, approvalStatus: "DRAFT" } });
  const keys: string[] = [];
  try {
    assert.equal((await call(token, "/technician/onboarding/kyc/consent", "POST", { accepted: true })).response.status, 201);
    const badSigned = await call(token, "/technician/onboarding/uploads/sign", "POST", { kind: "PROFILE_PHOTO", contentType: "image/png", size: 4 });
    assert.equal(badSigned.response.status, 201);
    const badKey = String(badSigned.body.objectKey); keys.push(badKey);
    const mismatch = await fetch(String(badSigned.body.uploadUrl), { method: "PUT", headers: { "content-type": "image/png" }, body: Buffer.from([0xff, 0xd8, 0xff, 0xd9]) });
    assert.equal(mismatch.status, 200);
    const rejected = await call(token, "/technician/onboarding", "PATCH", { profilePhotoKey: badKey });
    assert.equal(rejected.response.status, 400, "a JPEG signature declared as PNG must be rejected by the real upload pipeline");
    assert.equal((await db.technicianProfile.findUniqueOrThrow({ where: { id: profile.id } })).profilePhotoKey, null);

    const uploaded: Record<string, string> = {};
    for (const [kind, content] of [["ID_PHOTO", withExif(png)], ["SELFIE", png]] as const) {
      const signed = await call(token, "/technician/onboarding/uploads/sign", "POST", { kind, contentType: "image/png", size: content.length });
      assert.equal(signed.response.status, 201);
      const key = String(signed.body.objectKey); keys.push(key); uploaded[kind] = key;
      const put = await fetch(String(signed.body.uploadUrl), { method: "PUT", headers: { "content-type": "image/png" }, body: content });
      assert.equal(put.status, 200);
    }
    const idNumber = `7${String(randomInt(0, 1_000_000_000)).padStart(9, "0")}`;
    const submitted = await call(token, "/technician/onboarding/kyc/submit", "POST", { idType: "NIN", idNumber, idPhotoKey: uploaded.ID_PHOTO, selfieKey: uploaded.SELFIE });
    assert.equal(submitted.response.status, 201, JSON.stringify(submitted.body));
    const persistedImage = await storage.read(uploaded.ID_PHOTO);
    assert.equal(Buffer.from(persistedImage).includes(Buffer.from("eXIf")), false, "EXIF chunk must be stripped before KYC submission succeeds");
    assert.equal(Buffer.from(persistedImage).includes(Buffer.from("test metadata")), false);
    assert.equal(await db.technicianKyc.count({ where: { profileId: profile.id, status: "PENDING_MANUAL" } }), 1);
  } finally {
    await Promise.all(keys.map(key => storage.remove(key).catch(() => undefined)));
    await db.technicianProfile.delete({ where: { id: profile.id } });
    // Keep the explicitly named integration identity so its append-only audit
    // events retain a valid actor reference; revoke its session and suspend it.
    await db.session.updateMany({ where: { userId: user.id }, data: { revokedAt: new Date() } });
    await db.user.update({ where: { id: user.id }, data: { status: "SUSPENDED" } });
    await db.$disconnect();
  }
});

test("Phase 3 KYC endpoints enforce permissions and audit every successful view, download and reveal", { skip: !enabled, timeout: 45_000 }, async () => {
  await db.$connect(); await storage.ensureBucket();
  const [userRole, technicianRole, superAdminRole, reviewPermission] = await Promise.all([
    db.role.findUniqueOrThrow({ where: { key: "USER" } }), db.role.findUniqueOrThrow({ where: { key: "TECHNICIAN" } }), db.role.findUniqueOrThrow({ where: { key: "SUPER_ADMIN" } }),
    db.permission.findUniqueOrThrow({ where: { key: "technician.review" } })
  ]);
  const city = await db.city.findUniqueOrThrow({ where: { slug: "minna" } });
  const noKycRole = await db.role.create({ data: { key: `PHASE3_REVIEW_${randomUUID().slice(0, 8)}`, name: "Phase 3 review-only test role", isSystem: false, permissions: { create: { permissionId: reviewPermission.id } } } });
  const { user: owner } = await account(technicianRole.id, "Phase 3 KYC record owner");
  const profile = await db.technicianProfile.create({ data: { userId: owner.id, cityId: city.id, approvalStatus: "SUBMITTED" } });
  const idPhotoKey = storage.newObjectKey(`audit-test/${owner.id}`, "png");
  const selfieKey = storage.newObjectKey(`audit-test/${owner.id}`, "png");
  const idNumber = `6${String(randomInt(0, 1_000_000_000)).padStart(9, "0")}`;
  const encrypted = await encryptIdNumber(idNumber);
  const kyc = await db.technicianKyc.create({ data: { profileId: profile.id, idType: "NIN", idNumberEncrypted: encrypted.value, idNumberBlindIndex: idBlindIndex("NIN", idNumber), keyId: encrypted.keyId, idPhotoKey, selfieKey, status: "PENDING_MANUAL" } });
  const idPut = await fetch(storage.presignPut(idPhotoKey), { method: "PUT", headers: { "content-type": "image/png" }, body: png });
  const selfiePut = await fetch(storage.presignPut(selfieKey), { method: "PUT", headers: { "content-type": "image/png" }, body: png });
  assert.equal(idPut.status, 200); assert.equal(selfiePut.status, 200);
  const ordinary = await account(userRole.id, "Phase 3 ordinary user");
  const technician = await account(technicianRole.id, "Phase 3 technician actor");
  const noKycAdmin = await account(noKycRole.id, "Phase 3 reviewer without KYC permission");
  const superAdmin = await account(superAdminRole.id, "Phase 3 KYC auditor");
  const deniedActors = [ordinary, technician, noKycAdmin];
  const endpoints: Array<[string, string, unknown?]> = [
    ["GET", `/admin/technicians/${profile.id}/kyc`],
    ["GET", `/admin/technicians/${profile.id}/kyc/documents/ID_PHOTO`],
    ["POST", `/admin/technicians/${profile.id}/kyc/reveal`, { reason: "Phase 3 access control integration test" }]
  ];
  try {
    for (const actor of deniedActors) for (const [method, path, body] of endpoints) {
      const response = await call(actor.token, path, method, body);
      assert.equal(response.response.status, 403, `${method} ${path} must be denied to ${actor.user.displayName}: ${JSON.stringify(response.body)}`);
    }
    const summary = await call(superAdmin.token, `/admin/technicians/${profile.id}/kyc`);
    assert.equal(summary.response.status, 200, JSON.stringify(summary.body));
    assert.equal(summary.body.idNumberMasked, `••••${idNumber.slice(-4)}`);
    const document = await call(superAdmin.token, `/admin/technicians/${profile.id}/kyc/documents/ID_PHOTO`);
    assert.equal(document.response.status, 200, JSON.stringify(document.body));
    assert.equal((await fetch(String(document.body.url))).status, 200, "audited signed document URL should work");
    const reveal = await call(superAdmin.token, `/admin/technicians/${profile.id}/kyc/reveal`, "POST", { reason: "Confirm identity for approved onboarding" });
    assert.equal(reveal.response.status, 201, JSON.stringify(reveal.body));
    assert.equal(reveal.body.idNumber, idNumber);
    const expectedActions = ["technician.kyc.viewed", "technician.kyc.document_accessed", "technician.kyc.id_revealed"];
    const audit = await db.auditLog.findMany({ where: { actorUserId: superAdmin.user.id, entityType: "technician_kyc", entityId: kyc.id, action: { in: expectedActions } }, select: { action: true } });
    assert.deepEqual(audit.map(row => row.action).sort(), [...expectedActions].sort(), "summary view, document access and reveal each need their own audit record");
  } finally {
    await Promise.all([idPhotoKey, selfieKey].map(key => storage.remove(key).catch(() => undefined)));
    await db.role.delete({ where: { id: noKycRole.id } });
    await db.technicianProfile.delete({ where: { id: profile.id } });
    const testUsers = [owner.id, ordinary.user.id, technician.user.id, noKycAdmin.user.id, superAdmin.user.id];
    // Audit logs are append-only and retain actor references. Keep these
    // clearly labeled test accounts but revoke sessions and block sign-in.
    await db.session.updateMany({ where: { userId: { in: testUsers } }, data: { revokedAt: new Date() } });
    await db.user.updateMany({ where: { id: { in: testUsers } }, data: { status: "SUSPENDED" } });
    await db.$disconnect();
  }
});
