import { test, expect } from "@playwright/test";
import { createHmac, randomInt, randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";
import { PrismaClient } from "../../../packages/db/src/index.ts";

const db = new PrismaClient();
const hmacKey = process.env.SESSION_SECRET || process.env.OTP_HASH_SECRET;
function digest(value, key = hmacKey) { return createHmac("sha256", key).update(value).digest("hex"); }
function phone() { return `+2348${String(randomInt(0, 1_000_000_000)).padStart(9, "0")}`; }
let apiProcess;
let apiOutput = "";
let apiQueue = `notifications-playwright-${process.pid}`;
test.beforeAll(async () => {
  apiProcess = spawn(process.execPath, ["--env-file=../../.env", "--import", "tsx", "src/main.ts"], {
    cwd: fileURLToPath(new URL("../../api/", import.meta.url)),
    env: { ...process.env, API_PORT: "4000", NOTIFICATION_QUEUE_NAME: apiQueue, OTP_PRIMARY_CHANNEL: "dev" },
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
test.afterAll(() => apiProcess?.kill());
async function waitForDevOtp(afterBytes) {
  const end = Date.now() + 15_000;
  while (Date.now() < end) {
    const match = apiOutput.slice(afterBytes).match(/\[DEV OTP\] (\d{6})/);
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
test.afterAll(async () => db.$disconnect());

test("phone sign-up and sign-in create real sessions; sign-out clears the session", async ({ page }, testInfo) => {
  const mobile = testInfo.project.name === "mobile-360";
  const destination = phone();
  await page.goto("/sign-in");
  await page.screenshot({ path: `test-results/phase2-sign-in-${testInfo.project.name}.png`, fullPage: true });
  await page.getByRole("button", { name: "Create an account" }).click();
  await page.getByLabel("Your name").fill("Browser Test User");
  await page.getByLabel("Phone number").fill(destination);
  await page.getByRole("checkbox").last().check();
  const signupLogOffset = apiOutput.length;
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.getByLabel("Digit 1").waitFor();
  await page.screenshot({ path: `test-results/phase2-otp-${testInfo.project.name}.png`, fullPage: true });
  const signupCode = await waitForDevOtp(signupLogOffset);
  for (let index = 0; index < 6; index++) await page.getByLabel(`Digit ${index + 1}`).fill(signupCode[index]);
  await expect(page).toHaveURL(/\/app$/);

  await page.getByRole("button", { name: "Sign out" }).click();
  await expect(page).toHaveURL(/\/sign-in$/);
  await page.getByLabel("Phone number").fill(destination);
  const loginLogOffset = apiOutput.length;
  await page.getByRole("button", { name: "Continue", exact: true }).click();
  await page.getByLabel("Digit 1").waitFor();
  const nextCode = await waitForDevOtp(loginLogOffset);
  for (let index = 0; index < 6; index++) await page.getByLabel(`Digit ${index + 1}`).fill(nextCode[index]);
  await expect(page).toHaveURL(/\/app$/);
  expect(mobile ? await page.locator("body").evaluate((el) => el.scrollWidth <= window.innerWidth) : true).toBe(true);
});

test("non-admin is redirected away from admin; admin setup page renders", async ({ page, context }, testInfo) => {
  const role = await db.role.findUniqueOrThrow({ where: { key: "USER" } });
  const user = await db.user.create({ data: { phoneE164: phone(), displayName: "Admin Gate Browser Test" } });
  await db.userRole.create({ data: { userId: user.id, roleId: role.id } });
  const sessionId = randomUUID();
  await db.session.create({ data: { id: sessionId, familyId: randomUUID(), userId: user.id, refreshTokenHash: digest(randomUUID()), expiresAt: new Date(Date.now() + 60_000) } });
  await context.addCookies([{ name: "access_token", value: signAccessToken(user.id, sessionId), domain: "localhost", path: "/", httpOnly: true, sameSite: "Strict" }]);
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/app$/);
  await page.goto("/admin/security");
  await expect(page.getByRole("heading", { name: "Set up two-step verification" })).toBeVisible();
  await page.screenshot({ path: `test-results/phase2-admin-security-${testInfo.project.name}.png`, fullPage: true });
  expect(await page.locator("body").evaluate((el) => el.scrollWidth <= window.innerWidth)).toBe(true);
});
