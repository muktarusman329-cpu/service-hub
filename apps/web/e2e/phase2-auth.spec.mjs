import { test, expect } from "@playwright/test";
import { createHmac, randomInt, randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";
import { readFileSync } from "node:fs";
import { PrismaClient } from "../../../packages/db/src/index.ts";

const db = new PrismaClient();
const hmacKey = process.env.SESSION_SECRET || process.env.OTP_HASH_SECRET;
function digest(value, key = hmacKey) { return createHmac("sha256", key).update(value).digest("hex"); }
function phone() { return `+2348${String(randomInt(0, 1_000_000_000)).padStart(9, "0")}`; }
function localPhone(value) { return `0${value.slice(4)}`; }
let apiProcess;
let apiOutput = "";
let apiQueue = `notifications-playwright-${process.pid}`;
const cleanupUserIds = new Set();
const externalApi = process.env.E2E_API_EXTERNAL === "true";
const externalApiLog = process.env.E2E_API_LOG || "../../.local-services/api-browser-login.log";
test.beforeAll(async () => {
  if (externalApi) {
    const ready = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:4001/api/v1"}/health/ready`);
    if (!ready.ok) throw new Error(`Test API readiness returned HTTP ${ready.status}`);
    return;
  }
  apiProcess = spawn(process.execPath, ["--env-file=../../.env", "--import", "tsx", "src/main.ts"], {
    cwd: fileURLToPath(new URL("../../api/", import.meta.url)),
    env: { ...process.env, API_PORT: process.env.E2E_API_PORT || "4001", NOTIFICATION_QUEUE_NAME: apiQueue, OTP_PRIMARY_CHANNEL: "dev" },
    stdio: ["ignore", "pipe", "pipe"]
  });
  apiProcess.stdout.on("data", (data) => { apiOutput += data.toString(); });
  apiProcess.stderr.on("data", (data) => { apiOutput += data.toString(); });
  const end = Date.now() + 20_000;
  while (Date.now() < end) {
    if (apiOutput.includes("Nest application successfully started")) return;
    if (apiProcess.exitCode !== null) throw new Error(`Test API exited: ${apiOutput}`);
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error(`Test API did not start: ${apiOutput}`);
});
test.afterAll(async () => {
  for (const userId of cleanupUserIds) {
    await db.$transaction(async tx => {
      await tx.session.deleteMany({ where: { userId } });
      await tx.otpCode.deleteMany({ where: { userId } });
      await tx.notificationPreference.deleteMany({ where: { userId } });
      await tx.userInboxNotification.deleteMany({ where: { userId } });
      await tx.consent.deleteMany({ where: { userId } });
      await tx.userRole.deleteMany({ where: { userId } });
      await tx.user.deleteMany({ where: { id: userId } });
    }).catch(() => undefined);
  }
  apiProcess?.kill();
  await db.$disconnect();
});
async function waitForDevOtp(afterBytes) {
  const end = Date.now() + 15_000;
  while (Date.now() < end) {
    const output = externalApi ? readFileSync(externalApiLog, "utf8") : apiOutput;
    const match = output.slice(afterBytes).match(/\[DEV OTP\] (\d{6})/);
    if (match) return match[1];
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error("The real notification worker did not print a DEV OTP within 15 seconds");
}
function signAccessToken(userId, sessionId) {
  const encode = (value) => Buffer.from(JSON.stringify(value)).toString("base64url");
  const body = `${encode({ alg: "HS256", typ: "JWT" })}.${encode({ sub: userId, sid: sessionId, iat: Math.floor(Date.now() / 1000) })}`;
  const signature = createHmac("sha256", process.env.JWT_ACCESS_SECRET).update(body).digest("base64url");
  return `${body}.${signature}`;
}
test("phone sign-up and sign-in create real sessions; sign-out clears the session", async ({ page }, testInfo) => {
  const destination = phone();
  await page.goto("/sign-in");
  await expect(page.getByRole("link", { name: "Create an account" })).toBeVisible();
  await page.getByRole("link", { name: "Create an account" }).click();
  await page.getByLabel("Full name").fill("Browser Test User");
  await page.getByLabel("Phone number").fill(destination);
  await page.getByRole("checkbox").check();
  const signupLogOffset = apiOutput.length;
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.getByLabel("Digit 1").waitFor();
  expect(await page.getByLabel("Digit 1").getAttribute("inputmode")).toBe("numeric");
  expect(await page.getByRole("button", { name: "Verify and continue" }).evaluate(el => el.getBoundingClientRect().height)).toBeGreaterThanOrEqual(44);
  const signupCode = await waitForDevOtp(signupLogOffset);
  for (let index = 0; index < 6; index++) await page.getByLabel(`Digit ${index + 1}`).fill(signupCode[index]);
  await expect(page).toHaveURL(/\/welcome$/);
  await page.getByLabel("Get services done at home or work").check();
  await page.getByRole("button", { name: "Save and continue" }).click();
  await expect(page).toHaveURL(/\/app$/);
  const customer = await db.user.findUnique({ where: { phoneE164: destination }, select: { id: true } });
  if (customer) cleanupUserIds.add(customer.id);

  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page).toHaveURL(/\/sign-in$/);
  await page.getByLabel("Phone number").fill(localPhone(destination));
  const loginLogOffset = apiOutput.length;
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.getByLabel("Digit 1").waitFor();
  const nextCode = await waitForDevOtp(loginLogOffset);
  for (let index = 0; index < 6; index++) await page.getByLabel(`Digit ${index + 1}`).fill(nextCode[index]);
  await expect(page).toHaveURL(/\/app$/);
  await expect(page).not.toHaveURL(/\/welcome$/);
  expect(await page.locator("body").evaluate(el => el.scrollWidth <= window.innerWidth)).toBe(true);
  expect(await page.getByRole("button", { name: "Continue with Google" }).count()).toBeGreaterThan(0);
});

test("non-admin is redirected away from admin; admin setup page renders", async ({ page, context }, testInfo) => {
  const role = await db.role.findUniqueOrThrow({ where: { key: "USER" } });
  const user = await db.user.create({ data: { phoneE164: phone(), displayName: "Admin Gate Browser Test" } });
  cleanupUserIds.add(user.id);
  await db.userRole.create({ data: { userId: user.id, roleId: role.id } });
  const sessionId = randomUUID();
  await db.session.create({ data: { id: sessionId, familyId: randomUUID(), userId: user.id, refreshTokenHash: digest(randomUUID()), expiresAt: new Date(Date.now() + 60_000) } });
  await context.addCookies([{ name: "access_token", value: signAccessToken(user.id, sessionId), domain: "localhost", path: "/", httpOnly: true, sameSite: "Strict" }]);
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/app$/);
  const adminRole = await db.role.findUniqueOrThrow({ where: { key: "SUPER_ADMIN" } });
  const admin = await db.user.create({ data: { phoneE164: phone(), displayName: "Admin Setup Browser Test" } });
  cleanupUserIds.add(admin.id);
  await db.userRole.create({ data: { userId: admin.id, roleId: adminRole.id } });
  const adminSession = randomUUID();
  await db.session.create({ data: { id: adminSession, familyId: randomUUID(), userId: admin.id, refreshTokenHash: digest(randomUUID()), expiresAt: new Date(Date.now() + 60_000) } });
  await context.clearCookies();
  await context.addCookies([{ name: "access_token", value: signAccessToken(admin.id, adminSession), domain: "localhost", path: "/", httpOnly: true, sameSite: "Strict" }]);
  await page.goto("/admin/security");
  await expect(page.getByRole("heading", { name: "Set up two-step verification" })).toBeVisible();
  expect(await page.locator("body").evaluate((el) => el.scrollWidth <= window.innerWidth)).toBe(true);
});
