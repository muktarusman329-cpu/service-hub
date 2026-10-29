import { test, expect } from "@playwright/test";
import { createHmac, randomInt, randomUUID } from "node:crypto";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";
import { PrismaClient } from "../../../packages/db/src/index.ts";

const db = new PrismaClient();
const apiBase = "http://127.0.0.1:4000/api/v1";
function phone() { return `+2348${String(randomInt(0, 1_000_000_000)).padStart(9, "0")}`; }
function token(userId, sessionId) {
  const encode = (value) => Buffer.from(JSON.stringify(value)).toString("base64url");
  const body = `${encode({ alg: "HS256", typ: "JWT" })}.${encode({ sub: userId, sid: sessionId, iat: Math.floor(Date.now() / 1000) })}`;
  return `${body}.${createHmac("sha256", process.env.JWT_ACCESS_SECRET).update(body).digest("base64url")}`;
}
async function addSession(userId) {
  const id = randomUUID();
  await db.session.create({ data: { id, familyId: randomUUID(), userId, refreshTokenHash: randomUUID().replaceAll("-", ""), expiresAt: new Date(Date.now() + 3_600_000) } });
  return token(userId, id);
}

let apiProcess;
let apiOutput = "";
test.beforeAll(async () => {
  apiProcess = spawn(process.execPath, ["--env-file=../../.env", "--import", "tsx", "src/main.ts"], {
    cwd: fileURLToPath(new URL("../../api/", import.meta.url)),
    env: { ...process.env, API_PORT: "4000", NOTIFICATION_QUEUE_NAME: `phase3-playwright-${process.pid}`, OTP_PRIMARY_CHANNEL: "dev" },
    stdio: ["ignore", "pipe", "pipe"]
  });
  apiProcess.stdout.on("data", data => { apiOutput += data.toString(); });
  apiProcess.stderr.on("data", data => { apiOutput += data.toString(); });
  const until = Date.now() + 20_000;
  while (Date.now() < until) {
    if (apiOutput.includes("Nest application successfully started")) return;
    if (apiProcess.exitCode !== null) throw new Error(`Phase 3 test API exited: ${apiOutput}`);
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  throw new Error(`Phase 3 test API did not start: ${apiOutput}`);
});
test.afterAll(async () => { apiProcess?.kill(); await db.$disconnect(); });

test("technician completes onboarding and admin approval publishes only safe fields", async ({ page, context }, testInfo) => {
  test.setTimeout(90_000);
  const city = await db.city.findUniqueOrThrow({ where: { slug: "minna" } });
  const area = await db.area.findFirstOrThrow({ where: { cityId: city.id, slug: "bosso" } });
  const service = await db.service.findFirstOrThrow({ where: { slug: "plumber", isActive: true } });
  const techRole = await db.role.findUniqueOrThrow({ where: { key: "TECHNICIAN" } });
  const adminRole = await db.role.findUniqueOrThrow({ where: { key: "SUPER_ADMIN" } });
  const tech = await db.user.create({ data: { phoneE164: phone(), displayName: "Minna Verified Plumber", phoneVerifiedAt: new Date() } });
  await db.userRole.create({ data: { userId: tech.id, roleId: techRole.id } });
  const profile = await db.technicianProfile.create({ data: { userId: tech.id, cityId: city.id } });
  const testIdNumber = `8${String(randomInt(0, 1_000_000_000)).padStart(9, "0")}`;
  const techToken = await addSession(tech.id);

  await context.addCookies([{ name: "access_token", value: techToken, domain: "localhost", path: "/", httpOnly: true, sameSite: "Strict" }]);
  await page.goto("/technician/onboarding");
  await expect(page.getByRole("heading", { name: "Get your profile ready" })).toBeVisible();
  await expect(page.getByText("Basic profile")).toBeVisible();
  const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+/pVQAAAAASUVORK5CYII=", "base64");
  await page.getByLabel("Full name").fill("Test Legal Name");
  await page.getByLabel("Name customers will see").fill("Minna Verified Plumber");
  await page.getByLabel("Short introduction").fill("A local plumber completing the Phase 3 onboarding flow.");
  await page.getByLabel("Profile photo").setInputFiles({ name: "profile.png", mimeType: "image/png", buffer: png });
  await expect(page.getByText("Photo uploaded and saved.")).toBeVisible({ timeout: 20_000 });
  await page.getByRole("checkbox", { name: "Plumber" }).check();
  await page.getByLabel("Years experience for Plumber").fill("4");
  await page.getByRole("checkbox", { name: "Bosso" }).check();
  await page.getByRole("checkbox", { name: "Mon", exact: true }).check();
  await page.getByRole("button", { name: "Save profile" }).click();
  await expect(page.getByText("Saved. You can leave and continue later.")).toBeVisible();
  const fileInputs = page.locator('input[type="file"]');
  await fileInputs.nth(1).setInputFiles({ name: "work.png", mimeType: "image/png", buffer: png });
  await expect(page.getByText("Photo uploaded and saved.")).toBeVisible({ timeout: 20_000 });
  await page.getByLabel("ID number").fill(testIdNumber);
  await page.getByLabel("ID photo").setInputFiles({ name: "id.png", mimeType: "image/png", buffer: png });
  await page.getByLabel("Selfie").setInputFiles({ name: "selfie.png", mimeType: "image/png", buffer: png });
  await page.getByRole("checkbox", { name: /I agree to the identity check/ }).check();
  await page.getByRole("button", { name: "Submit identity documents" }).click();
  await expect(page.getByText("Identity documents submitted for manual review.")).toBeVisible({ timeout: 30_000 });
  await page.getByRole("button", { name: "Submit application" }).click();
  await expect(page.getByText("Application submitted. Our team will review it and update you here.")).toBeVisible({ timeout: 20_000 });
  const submitted = await db.technicianProfile.findUniqueOrThrow({ where: { id: profile.id } });
  expect(submitted.approvalStatus).toBe("SUBMITTED");
  expect(await db.technicianSkill.count({ where: { profileId: profile.id, serviceId: service.id } })).toBe(1);
  expect(await db.technicianArea.count({ where: { profileId: profile.id, areaId: area.id } })).toBe(1);
  expect(await db.technicianKyc.count({ where: { profileId: profile.id, status: "PENDING_MANUAL" } })).toBe(1);
  const beforeApprovalResponse = await fetch(`${apiBase}/technicians/minna?serviceId=${service.id}&areaId=${area.id}`);
  expect(beforeApprovalResponse.status).toBe(200);
  expect((await beforeApprovalResponse.json()).some(item => item.id === profile.id)).toBe(false, "submitted technicians must stay hidden until approval");
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: `test-results/phase3-onboarding-${testInfo.project.name}.png` });
  const overflow = await page.evaluate(() => ({ width: window.innerWidth, client: document.documentElement.clientWidth, body: document.body.scrollWidth, doc: document.documentElement.scrollWidth, offenders: [...document.querySelectorAll("*")].filter(el => el.scrollWidth > el.clientWidth + 0.5 || el.getBoundingClientRect().right > window.innerWidth).slice(0, 12).map(el => ({ tag: el.tagName, className: typeof el.className === "string" ? el.className : "", right: el.getBoundingClientRect().right, scroll: el.scrollWidth, client: el.clientWidth })) }));
  expect(overflow.body <= overflow.width, JSON.stringify(overflow)).toBe(true);

  const admin = await db.user.create({ data: { phoneE164: phone(), displayName: "Phase 3 Admin", totpEnabledAt: new Date() } });
  await db.userRole.create({ data: { userId: admin.id, roleId: adminRole.id } });
  const adminToken = await addSession(admin.id);
  await context.clearCookies();
  await context.addCookies([{ name: "access_token", value: adminToken, domain: "localhost", path: "/", httpOnly: true, sameSite: "Strict" }]);
  await page.goto(`/admin/technicians/${profile.id}`);
  await expect(page.getByRole("heading", { name: "Minna Verified Plumber" })).toBeVisible();
  await expect(page.getByText(`••••${testIdNumber.slice(-4)}`)).toBeVisible();
  await page.screenshot({ path: `test-results/phase3-review-${testInfo.project.name}.png`, fullPage: true });
  await page.getByRole("button", { name: "Approve" }).click();
  await expect(page.getByText("Application updated: approved.")).toBeVisible();
  const listingResponse = await fetch(`${apiBase}/technicians/minna?serviceId=${service.id}&areaId=${area.id}`);
  expect(listingResponse.status).toBe(200);
  const listing = await listingResponse.json();
  const visible = listing.find(item => item.id === profile.id);
  expect(visible?.displayName).toBe("Minna Verified Plumber");
  expect(JSON.stringify(visible)).not.toContain("phone");
  expect(JSON.stringify(visible)).not.toContain("legalName");
  expect(JSON.stringify(visible)).not.toContain(testIdNumber);
  const suspendResponse = await fetch(`${apiBase}/admin/technicians/${profile.id}/review`, { method: "POST", headers: { "content-type": "application/json", authorization: `Bearer ${adminToken}` }, body: JSON.stringify({ status: "SUSPENDED", reason: "Playwright verification complete" }) });
  expect(suspendResponse.status).toBe(201);
  await page.goto("/admin/catalog");
  await expect(page.getByRole("heading", { name: "Service catalog" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Home services" })).toBeVisible();
  await expect(page.getByText("Off in Minna")).toBeVisible();
  await page.screenshot({ path: `test-results/phase3-catalog-${testInfo.project.name}.png`, fullPage: true });
  expect(await page.locator("body").evaluate(el => el.scrollWidth <= window.innerWidth)).toBe(true);

  // Test identities remain marked by their display names so append-only audit
  // evidence is preserved; the technician is suspended after listing checks.
});
