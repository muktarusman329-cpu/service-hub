import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { test } from "node:test";
import Redis from "ioredis";
import { PrismaClient } from "@servicehub/db";
import { env } from "@servicehub/config/env";
import { PrivateObjectStorage } from "../src/object-storage";
import { TechnicianService } from "../src/technician.module";

const db = new PrismaClient();
const storage = new PrivateObjectStorage();
const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/pVQAAAAASUVORK5CYII=", "base64");

test("Phase 3 Minna catalog, private object storage and KYC retention use real dependencies", { timeout: 45_000 }, async (t) => {
  const redis = new Redis(env.REDIS_URL, { lazyConnect: true, connectTimeout: 1200, maxRetriesPerRequest: 0 });
  try {
    await db.$connect();
    await redis.connect(); await redis.ping();
    await storage.ensureBucket();
  } catch (error) {
    const reason = error instanceof Error ? error.message : "dependency unavailable";
    console.warn(`WARNING: SKIPPING Phase 3 real-dependency integration: PostgreSQL, Redis and MinIO are required (${reason}).`);
    t.skip("Required local integration dependency is unavailable");
    redis.disconnect(); await db.$disconnect(); return;
  }
  redis.disconnect();
  const city = await db.city.findUniqueOrThrow({ where: { slug: "minna" } });
  const categories = await db.category.findMany({ where: { cityFlags: { some: { cityId: city.id, enabled: true } } }, include: { services: { where: { cities: { some: { cityId: city.id, isActive: true } } } } } });
  assert.deepEqual(categories.map(x => x.slug).sort(), ["delivery-errands", "home-services", "it-support"]);
  assert.equal(await db.area.count({ where: { cityId: city.id, isActive: true } }), 9);
  assert.ok(categories.some(x => x.services.some(s => s.slug === "plumber")));

  const user = await db.user.create({ data: { phoneE164: `+2348${String(Date.now()).slice(-9)}`, displayName: "Phase 3 integration technician", phoneVerifiedAt: new Date() } });
  const profile = await db.technicianProfile.create({ data: { userId: user.id, cityId: city.id, legalName: "Phase 3 integration technician", approvalStatus: "REJECTED" } });
  const futureUser = await db.user.create({ data: { phoneE164: `+2348${String(Date.now() - 1).slice(-9)}`, displayName: "Phase 3 future-retention technician", phoneVerifiedAt: new Date() } });
  const futureProfile = await db.technicianProfile.create({ data: { userId: futureUser.id, cityId: city.id, legalName: "Phase 3 future-retention technician", approvalStatus: "REJECTED" } });
  const idPhotoKey = storage.newObjectKey(`integration/${user.id}`, "png");
  const selfieKey = storage.newObjectKey(`integration/${user.id}`, "png");
  const futureIdKey = storage.newObjectKey(`integration/${futureUser.id}`, "png");
  const futureSelfieKey = storage.newObjectKey(`integration/${futureUser.id}`, "png");
  try {
    for (const key of [idPhotoKey, selfieKey, futureIdKey, futureSelfieKey]) {
      const response = await fetch(storage.presignPut(key), { method: "PUT", headers: { "content-type": "image/png" }, body: png });
      assert.equal(response.status, 200, "signed MinIO upload should accept the PNG");
    }
    const signedRead = await fetch(storage.presignGet(idPhotoKey));
    assert.equal(signedRead.status, 200, `signed MinIO GET should work: ${signedRead.status} ${await signedRead.clone().text()}`);
    const metadata = await storage.metadata(idPhotoKey);
    assert.equal(metadata.type, "image/png");
    assert.equal(metadata.size, png.length);
    const unsigned = await fetch(`${env.S3_ENDPOINT}/${env.S3_BUCKET}/${idPhotoKey}`);
    assert.equal(unsigned.status, 403, "KYC bucket objects must remain private without a signed URL");

    await db.technicianKyc.create({ data: { profileId: profile.id, idType: "NIN", idNumberEncrypted: "test-encrypted-value", idNumberBlindIndex: randomUUID().replaceAll("-", "").padEnd(64, "0"), keyId: "integration-v1", idPhotoKey, selfieKey, status: "REJECTED", retentionAt: new Date(Date.now() - 1000) } });
    await db.technicianKyc.create({ data: { profileId: futureProfile.id, idType: "NIN", idNumberEncrypted: "keep-this-encrypted-value", idNumberBlindIndex: randomUUID().replaceAll("-", "").padEnd(64, "1"), keyId: "integration-v1", idPhotoKey: futureIdKey, selfieKey: futureSelfieKey, status: "REJECTED", retentionAt: new Date(Date.now() + 86_400_000) } });
    const service = new TechnicianService(db as never, { sendTechnicianStatus: async () => undefined } as never);
    assert.equal(await service.cleanupRetention(new Date()), 1, "only records whose retention deadline has passed should be cleaned");
    const record = await db.technicianKyc.findUniqueOrThrow({ where: { profileId: profile.id } });
    assert.equal(record.idNumberEncrypted, null);
    assert.equal(record.idPhotoKey, null);
    assert.equal(record.selfieKey, null);
    assert.ok(record.clearedAt);
    assert.equal(record.minimalVerificationRecord, "KYC data removed after configured retention window");
    assert.equal((await fetch(storage.presignGet(idPhotoKey))).status, 404, "due ID image must be deleted");
    assert.equal((await fetch(storage.presignGet(selfieKey))).status, 404, "due selfie must be deleted");
    const futureRecord = await db.technicianKyc.findUniqueOrThrow({ where: { profileId: futureProfile.id } });
    assert.equal(futureRecord.idNumberEncrypted, "keep-this-encrypted-value");
    assert.equal(futureRecord.clearedAt, null);
    assert.equal((await fetch(storage.presignGet(futureIdKey))).status, 200, "not-yet-due ID image must remain available through a signed URL");
    assert.equal((await fetch(storage.presignGet(futureSelfieKey))).status, 200, "not-yet-due selfie must remain available through a signed URL");
  } finally {
    await Promise.all([idPhotoKey, selfieKey, futureIdKey, futureSelfieKey].map(key => storage.remove(key).catch(() => undefined)));
    await db.technicianProfile.deleteMany({ where: { id: { in: [profile.id, futureProfile.id] } } });
    await db.user.deleteMany({ where: { id: { in: [user.id, futureUser.id] } } });
    await db.$disconnect();
  }
});
