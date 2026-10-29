import assert from "node:assert/strict";
import { spawn, spawnSync, type ChildProcess } from "node:child_process";
import { setTimeout as delay } from "node:timers/promises";
import { after, test } from "node:test";
import { randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";
import { Queue } from "bullmq";
import Redis from "ioredis";
import { PrismaClient } from "@servicehub/db";
import { env } from "@servicehub/config/env";
import { digest } from "../src/security";

const db = new PrismaClient();
let child: ChildProcess | undefined;
after(async () => { child?.kill(); await db.$disconnect(); });

function waitFor(predicate: () => boolean, timeoutMs: number, message: string) {
  return (async () => {
    const until = Date.now() + timeoutMs;
    while (Date.now() < until) { if (predicate()) return; await delay(100); }
    assert.fail(message);
  })();
}

test("BullMQ delivers phone OTP, verifies a session, and dead-letters when SMTP is stopped", { timeout: 90_000 }, async (t) => {
  const probe = new Redis(env.REDIS_URL, { lazyConnect: true, connectTimeout: 1000, maxRetriesPerRequest: 0 });
  let redisAvailable = false;
  try { await probe.connect(); await probe.ping(); redisAvailable = true; } catch { /* Redis alone is the permitted skip condition. */ }
  finally { probe.disconnect(); }
  if (!redisAvailable) {
    console.warn("WARNING: SKIPPING notification queue integration: Redis is unavailable. This is the only condition that skips this test.");
    t.skip("Redis unavailable; start Memurai/Redis and rerun");
    return;
  }

  const apiPort = 43000 + Math.floor(Math.random() * 1000);
  const base = `http://127.0.0.1:${apiPort}/api/v1`;
  let logs = "";
  const apiRoot = fileURLToPath(new URL("../", import.meta.url));
  child = spawn(process.execPath, ["--env-file=../../.env", "--import", "tsx", "src/main.ts"], {
    cwd: apiRoot,
    env: { ...process.env, NODE_ENV: "test", API_PORT: String(apiPort), NOTIFICATION_QUEUE_NAME: `notifications-test-${apiPort}`, OTP_PRIMARY_CHANNEL: "dev", SMTP_URL: env.SMTP_URL || "smtp://127.0.0.1:1025" },
    stdio: ["ignore", "pipe", "pipe"]
  });
  child.stdout?.on("data", (data: Buffer) => { logs += data.toString(); });
  child.stderr?.on("data", (data: Buffer) => { logs += data.toString(); });
  try {
    await waitFor(() => logs.includes("Nest application successfully started") || child?.exitCode !== null, 20_000, `API did not start: ${logs}`);
    assert.equal(child.exitCode, null, `API exited unexpectedly: ${logs}`);
    assert.equal((await fetch(`${base}/health/live`)).status, 200);
    assert.equal((await fetch(`${base}/health/ready`)).status, 200, "ready requires reachable PostgreSQL and Redis");

    const phone = `+2348${String(Math.floor(Math.random() * 1_000_000_000)).padStart(9, "0")}`;
    const request = await fetch(`${base}/auth/otp/request`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ destination: phone, purpose: "SIGN_UP", displayName: "BullMQ Integration", accountType: "USER", acceptTerms: true, acceptPrivacy: true }) });
    assert.equal(request.status, 201, await request.text());
    await waitFor(() => /\[DEV OTP\] \d{6}/.test(logs), 15_000, `Worker did not print a DEV OTP: ${logs}`);
    const code = logs.match(/\[DEV OTP\] (\d{6})/)?.[1];
    assert.ok(code, "DEV adapter output should include the six-digit code");
    const verify = await fetch(`${base}/auth/otp/verify`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ destination: phone, purpose: "SIGN_UP", code }) });
    assert.equal(verify.status, 201, await verify.text());
    assert.ok(verify.headers.getSetCookie().some((cookie) => cookie.startsWith("refresh_token=")), "successful verification creates a session cookie");
    const delivery = await db.notification.findFirstOrThrow({ where: { destinationHash: digest(phone), status: "SENT" }, orderBy: { createdAt: "desc" } });
    assert.equal(delivery.attemptCount, 1);

    const email = `mailpit-${randomUUID()}@example.test`;
    const emailRequest = await fetch(`${base}/auth/otp/request`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ destination: email, purpose: "SIGN_UP", displayName: "Mailpit Integration", accountType: "USER", acceptTerms: true, acceptPrivacy: true }) });
    assert.equal(emailRequest.status, 201, await emailRequest.text());
    const mailpit = process.env.MAILPIT_API_URL || "http://127.0.0.1:8025";
    let emailCode: string | undefined;
    const mailDeadline = Date.now() + 15_000;
    while (Date.now() < mailDeadline && !emailCode) {
      const inbox = await fetch(`${mailpit}/api/v1/messages?limit=50`).then((response) => response.json()) as { messages?: Array<{ ID: string; To?: Array<{ Address: string }>; Snippet?: string }> };
      const message = inbox.messages?.find((item) => item.To?.some((recipient) => recipient.Address.toLowerCase() === email.toLowerCase()));
      emailCode = message?.Snippet?.match(/\b(\d{6})\b/)?.[1];
      if (!emailCode) await delay(250);
    }
    assert.ok(emailCode, "SMTP worker must deliver the email OTP to the Mailpit inbox");
    const emailVerify = await fetch(`${base}/auth/otp/verify`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ destination: email, purpose: "SIGN_UP", code: emailCode }) });
    assert.equal(emailVerify.status, 201, await emailVerify.text());
    assert.ok(emailVerify.headers.getSetCookie().some((cookie) => cookie.startsWith("refresh_token=")), "email verification creates a session");

    child?.kill(); child = undefined;
    const failurePort = apiPort + 1000;
    const failureBase = `http://127.0.0.1:${failurePort}/api/v1`;
    let failureLogs = "";
    child = spawn(process.execPath, ["--env-file=../../.env", "--import", "tsx", "src/main.ts"], {
      cwd: apiRoot,
      env: { ...process.env, NODE_ENV: "test", API_PORT: String(failurePort), NOTIFICATION_QUEUE_NAME: `notifications-failure-${failurePort}`, OTP_PRIMARY_CHANNEL: "dev", SMTP_URL: "smtp://127.0.0.1:1026" },
      stdio: ["ignore", "pipe", "pipe"]
    });
    child.stdout?.on("data", (data: Buffer) => { failureLogs += data.toString(); });
    child.stderr?.on("data", (data: Buffer) => { failureLogs += data.toString(); });
    await waitFor(() => failureLogs.includes("Nest application successfully started") || child?.exitCode !== null, 20_000, `failure-test API did not start: ${failureLogs}`);
    assert.equal(child.exitCode, null, `failure-test API exited: ${failureLogs}`);

    const failedEmail = `queue-failure-${randomUUID()}@example.test`;
    const failedRequest = await fetch(`${failureBase}/auth/otp/request`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ destination: failedEmail, purpose: "SIGN_UP", displayName: "Delivery Failure", accountType: "USER", acceptTerms: true, acceptPrivacy: true }) });
    assert.equal(failedRequest.status, 201, await failedRequest.text());
    const emailHash = digest(failedEmail);
    let failedDelivery;
    const until = Date.now() + 35_000;
    while (Date.now() < until) {
      failedDelivery = await db.notification.findFirst({ where: { destinationHash: emailHash }, orderBy: { createdAt: "desc" } });
      if (failedDelivery?.status === "DEAD_LETTER") break;
      await delay(250);
    }
    assert.equal(failedDelivery?.status, "DEAD_LETTER", "provider outage should leave a durable dead-letter delivery status");
    assert.equal(failedDelivery?.attemptCount, 4, "four provider attempts should be recorded");
    const queueConnection = new Redis(env.REDIS_URL, { maxRetriesPerRequest: null });
    const queue = new Queue(`notifications-failure-${failurePort}`, { connection: queueConnection });
    try {
      const failedJobs = await queue.getFailed(0, 100);
      assert.ok(failedJobs.some((job) => job.data.deliveryId === failedDelivery!.id && job.attemptsMade === 4), "BullMQ keeps the final failed job available for inspection");
      assert.deepEqual(failedJobs.find((job) => job.data.deliveryId === failedDelivery!.id)?.opts.backoff, { type: "exponential", delay: 1500 });
    } finally { await queue.close(); queueConnection.disconnect(); }
    child?.kill(); child = undefined;

    child?.kill(); child = undefined;
    const unavailablePort = apiPort + 2000;
    let unavailableLogs = "";
    child = spawn(process.execPath, ["--env-file=../../.env", "--import", "tsx", "src/main.ts"], {
      cwd: apiRoot,
      env: { ...process.env, NODE_ENV: "test", API_PORT: String(unavailablePort), NOTIFICATION_QUEUE_NAME: `notifications-queue-down-${unavailablePort}`, REDIS_URL: "redis://127.0.0.1:6399", OTP_PRIMARY_CHANNEL: "dev" },
      stdio: ["ignore", "pipe", "pipe"]
    });
    child.stdout?.on("data", (data: Buffer) => { unavailableLogs += data.toString(); });
    child.stderr?.on("data", (data: Buffer) => { unavailableLogs += data.toString(); });
    await waitFor(() => unavailableLogs.includes("Nest application successfully started") || child?.exitCode !== null, 20_000, `API with unavailable Redis did not start: ${unavailableLogs}`);
    assert.equal(child.exitCode, null, `API with unavailable Redis exited: ${unavailableLogs}`);
    const downResponse = await fetch(`http://127.0.0.1:${unavailablePort}/api/v1/auth/otp/request`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ destination: `queue-down-${randomUUID()}@example.test`, purpose: "SIGN_UP", displayName: "Queue unavailable", accountType: "USER", acceptTerms: true, acceptPrivacy: true }) });
    const downBody = await downResponse.text();
    assert.equal(downResponse.status, 503, downBody);
    assert.match(downBody, /temporarily unavailable/i);
    assert.equal((await fetch(`http://127.0.0.1:${unavailablePort}/api/v1/health/live`)).status, 200);
    assert.equal((await fetch(`http://127.0.0.1:${unavailablePort}/api/v1/health/ready`)).status, 503);
  } finally { child?.kill(); child = undefined; }
});

test("production config fails to boot with DEV OTP and missing required secrets", () => {
  const result = spawnSync(process.execPath, ["--env-file=../../.env", "--import", "tsx", "-e", "import('@servicehub/config/env')"], {
    cwd: fileURLToPath(new URL("../", import.meta.url)),
    env: { ...process.env, NODE_ENV: "production", OTP_PRIMARY_CHANNEL: "dev", APP_ORIGINS: "https://servicehub.example" },
    encoding: "utf8"
  });
  assert.notEqual(result.status, 0, "production must refuse invalid configuration");
  assert.match(`${result.stderr}${result.stdout}`, /DEV OTP channel cannot be used in production/);
  assert.match(`${result.stderr}${result.stdout}`, /unique production secret of at least 32 characters/);
});
