import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { test } from "node:test";
import Redis from "ioredis";
import { PrismaClient } from "@servicehub/db";
import { env } from "@servicehub/config/env";
import { JobsService, DefaultCommissionRuleProvider } from "../src/jobs.module";
import { RealtimeHub } from "../src/realtime-hub";
import { NoopPaymentGate } from "../src/payment-gate";

const db = new PrismaClient();
const fakeRequest = { ip: "127.0.0.1", headers: {} } as never;

test("Phase 4 real database/Redis request, quote, accept, chat and completion flow", { timeout: 60_000 }, async t => {
  const redis = new Redis(env.REDIS_URL, { lazyConnect: true, connectTimeout: 1200, maxRetriesPerRequest: 0 });
  try { await db.$connect(); await redis.connect(); await redis.ping(); }
  catch (error) { console.warn(`WARNING: SKIPPING Phase 4 integration because PostgreSQL/Redis is unavailable: ${error instanceof Error ? error.message : "dependency unavailable"}`); t.skip("Real PostgreSQL and Redis required"); await db.$disconnect(); redis.disconnect(); return; }
  redis.disconnect();
  const city = await db.city.findUniqueOrThrow({ where: { slug: "minna" } });
  const area = await db.area.findFirstOrThrow({ where: { cityId: city.id, isActive: true } });
  const service = await db.service.findFirstOrThrow({ where: { isActive: true, cities: { some: { cityId: city.id, isActive: true } }, category: { cityFlags: { some: { cityId: city.id, enabled: true } } } } });
  const customer = await db.user.create({ data: { phoneE164: `+23480${String(Date.now()).slice(-8)}`, displayName: "Phase 4 customer" } });
  const technicianUser = await db.user.create({ data: { phoneE164: `+23481${String(Date.now()).slice(-8)}`, displayName: "Phase 4 technician" } });
  const profile = await db.technicianProfile.create({ data: { userId: technicianUser.id, cityId: city.id, legalName: "Phase 4 technician", approvalStatus: "APPROVED", weeklyAvailability: { Mon: true, Tue: true, Wed: true, Thu: true, Fri: true, Sat: true, Sun: true }, skills: { create: { serviceId: service.id } }, areas: { create: { areaId: area.id } } } });
  const notices: string[] = [];
  const realtime = new RealtimeHub();
  const jobs = new JobsService(db as never, { sendMarketplaceNotice: async (_id: string, key: string) => { notices.push(key); } } as never, realtime, new NoopPaymentGate(), new DefaultCommissionRuleProvider(db as never));
  let requestId: string | undefined;
  try {
    const key = randomUUID();
    const request = await jobs.createRequest(customer.id, { serviceId: service.id, cityId: city.id, areaId: area.id, nearestLandmark: "Near the main gate", description: "Please repair the water pump by the back kitchen.", isAsap: true, urgency: "STANDARD", clientIdempotencyKey: key }, fakeRequest);
    requestId = request.id;
    assert.equal(request.status, "OPEN");
    assert.equal(request.notifiedCount, 1);
    const quote = await jobs.createQuote(technicianUser.id, request.id, { priceKobo: 1250000, laborKobo: 750000, materialsKobo: 500000, estimatedArrivalMins: 30, message: "I can come this afternoon", clientIdempotencyKey: randomUUID() }, fakeRequest);
    assert.equal(quote.status, "ACTIVE");
    const accepted = await jobs.acceptQuote(customer.id, quote.id, { paymentMethod: "CASH", idempotencyKey: randomUUID() }, fakeRequest);
    assert.equal(accepted.status, "ACCEPTED");
    const conversation = await db.conversation.findUniqueOrThrow({ where: { bookingId: accepted.id } });
    const first = await jobs.postMessage(customer.id, conversation.id, { clientMessageKey: "offline-customer-001", body: "I am near the main gate." });
    const replay = await jobs.postMessage(customer.id, conversation.id, { clientMessageKey: "offline-customer-001", body: "I am near the main gate." });
    assert.equal(first.id, replay.id, "replayed offline message should be idempotent");
    await jobs.postMessage(technicianUser.id, conversation.id, { clientMessageKey: "offline-tech-001", body: "On my way." });
    await jobs.changeBookingStatus(technicianUser.id, accepted.id, { status: "TECHNICIAN_EN_ROUTE", idempotencyKey: randomUUID() }, fakeRequest);
    await jobs.changeBookingStatus(technicianUser.id, accepted.id, { status: "IN_PROGRESS", idempotencyKey: randomUUID() }, fakeRequest);
    await jobs.changeBookingStatus(technicianUser.id, accepted.id, { status: "COMPLETED_PENDING_CONFIRMATION", idempotencyKey: randomUUID() }, fakeRequest);
    const complete = await jobs.changeBookingStatus(customer.id, accepted.id, { status: "COMPLETED", idempotencyKey: randomUUID() }, fakeRequest);
    assert.equal(complete.status, "COMPLETED");
    await assert.rejects(() => jobs.messages(customer.id, randomUUID()), /Conversation not found/);
    assert.ok(notices.includes("job_match") && notices.includes("quote_received") && notices.includes("quote_accepted"));
    assert.equal(await db.bookingStatusHistory.count({ where: { bookingId: accepted.id } }), 6);
  } finally {
    await jobs.onModuleDestroy();
    if (requestId) await db.jobRequest.updateMany({ where: { id: requestId }, data: { deletedAt: new Date() } });
    await db.technicianProfile.updateMany({ where: { id: profile.id }, data: { approvalStatus: "REJECTED", deletedAt: new Date() } });
    await db.user.updateMany({ where: { id: { in: [customer.id, technicianUser.id] } }, data: { status: "SUSPENDED", deletedAt: new Date() } });
    await db.$disconnect();
  }
});
