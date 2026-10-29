import assert from "node:assert/strict";
import { randomInt, randomUUID } from "node:crypto";
import { after, describe, it } from "node:test";
import { JwtService } from "@nestjs/jwt";
import { PrismaClient } from "@servicehub/db";
import { env } from "@servicehub/config/env";
import { digest } from "../src/security";
import { AuthService } from "../src/auth.module";

const db = new PrismaClient();
const api = process.env.API_BASE_URL || `http://127.0.0.1:${env.API_PORT}/api/v1`;
const enabled = process.env.RUN_PHASE2_INTEGRATION === "1";
const jwt = new JwtService({ secret: env.JWT_ACCESS_SECRET });

async function createUser(roleKey: string) {
  const role = await db.role.findUniqueOrThrow({ where: { key: roleKey } });
  const user = await db.user.create({ data: { phoneE164: `+2348${String(randomInt(0, 1_000_000_000)).padStart(9, "0")}`, displayName: "Phase 2 test account" } });
  await db.userRole.create({ data: { userId: user.id, roleId: role.id } });
  const sessionId = randomUUID();
  const session = await db.session.create({ data: { id: sessionId, familyId: randomUUID(), userId: user.id, refreshTokenHash: digest(randomUUID()), expiresAt: new Date(Date.now() + 60_000) } });
  return { user, session, token: await jwt.signAsync({ sub: user.id, sid: sessionId }) };
}

describe("Phase 2 real PostgreSQL/API integration", () => {
  after(async () => db.$disconnect());

  it("verifies a stored signup OTP, creates consent, and opens a session", { skip: !enabled }, async () => {
    const phone = `+2348${String(randomInt(0, 1_000_000_000)).padStart(9, "0")}`;
    const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
    await db.otpCode.create({ data: { destinationHash: digest(phone), purpose: "SIGN_UP", codeHash: digest(code, env.OTP_HASH_SECRET), channel: "DEV", expiresAt: new Date(Date.now() + 5 * 60_000), metadata: { displayName: "OTP Integration User", accountType: "USER", acceptTerms: true, acceptPrivacy: true } } });
    const response = await fetch(`${api}/auth/otp/verify`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ destination: phone, purpose: "SIGN_UP", code }) });
    const responseBody = await response.text();
    assert.equal(response.status, 201, responseBody);
    const body = JSON.parse(responseBody) as { user: { id: string; roles: string[] } };
    assert.ok(body.user.id);
    assert.deepEqual(body.user.roles, ["USER"]);
    const signupCookies = response.headers.getSetCookie();
    const cookieHeaderText = signupCookies.join("; ");
    assert.match(cookieHeaderText, /access_token=.*HttpOnly/i);
    assert.match(cookieHeaderText, /refresh_token=.*HttpOnly/i);
    assert.match(cookieHeaderText, /SameSite=Strict/i);
    if (env.NODE_ENV === "production") assert.match(cookieHeaderText, /Secure/i);
    const [consents, sessions, otp] = await Promise.all([
      db.consent.count({ where: { userId: body.user.id, granted: true } }),
      db.session.count({ where: { userId: body.user.id, revokedAt: null } }),
      db.otpCode.findFirstOrThrow({ where: { destinationHash: digest(phone), purpose: "SIGN_UP" }, orderBy: { createdAt: "desc" } })
    ]);
    assert.equal(consents, 2);
    assert.equal(sessions, 1);
    assert.ok(otp.consumedAt);
    const replay = await fetch(`${api}/auth/otp/verify`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ destination: phone, purpose: "SIGN_UP", code }) });
    assert.equal(replay.status, 401, "a consumed OTP must not be accepted a second time");

    const cookies = response.headers.getSetCookie().map((value) => value.split(";")[0]!);
    const originalRefresh = cookies.find((cookie) => cookie.startsWith("refresh_token="));
    const csrf = cookies.find((cookie) => cookie.startsWith("csrf_token="));
    assert.ok(originalRefresh && csrf);
    const cookieHeader = cookies.join("; ");
    const csrfValue = csrf.split("=").slice(1).join("=");
    const withoutCsrf = await fetch(`${api}/auth/refresh`, { method: "POST", headers: { cookie: cookieHeader } });
    assert.equal(withoutCsrf.status, 403, "cookie-authenticated mutations require the CSRF header");
    const rotated = await fetch(`${api}/auth/refresh`, { method: "POST", headers: { cookie: cookieHeader, "x-csrf-token": csrfValue } });
    assert.equal(rotated.status, 201, "refresh should rotate the token");
    const reused = await fetch(`${api}/auth/refresh`, { method: "POST", headers: { cookie: cookieHeader, "x-csrf-token": csrfValue } });
    assert.equal(reused.status, 401, "reuse of the old refresh token should be rejected");
    const family = await db.session.findMany({ where: { userId: body.user.id } });
    assert.ok(family.length > 0);
    assert.ok(family.every((session) => session.revokedAt !== null), "reuse must revoke the complete refresh-token family");
  });

  it("creates a Google account with a mocked verified OIDC provider", { skip: !enabled }, async () => {
    assert.ok(env.GOOGLE_CLIENT_ID, "Set GOOGLE_CLIENT_ID to a test value when running integration tests");
    const subject = `mock-google-${randomUUID()}`;
    const email = `${subject}@example.test`;
    const service = new AuthService(db as never, jwt, {} as never);
    (service as unknown as { google: { verifyIdToken: () => Promise<{ getPayload: () => object }> } }).google = {
      verifyIdToken: async () => ({ getPayload: () => ({ sub: subject, email, email_verified: true, name: "Mock Google User" }) })
    };
    const cookieNames: string[] = [];
    const req = { ip: "127.0.0.1", headers: { "user-agent": "phase2-integration" } } as never;
    const res = { cookie: (name: string) => cookieNames.push(name) } as never;
    const result = await service.googleLogin("mock-provider-token", req, res, true);
    assert.equal(result.ok, true);
    assert.ok(cookieNames.includes("refresh_token"));
    const account = await db.oAuthAccount.findUniqueOrThrow({ where: { provider_providerSubject: { provider: "GOOGLE", providerSubject: subject } } });
    assert.equal(account.email, email);
    const user = await db.user.findUniqueOrThrow({ where: { id: account.userId } });
    assert.equal(user.emailVerifiedAt !== null, true);
    assert.equal(await db.consent.count({ where: { userId: user.id, granted: true } }), 2);
  });

  it("blocks a suspended account immediately", { skip: !enabled }, async () => {
    const { user, session, token } = await createUser("USER");
    await db.user.update({ where: { id: user.id }, data: { status: "SUSPENDED" } });
    const response = await fetch(`${api}/auth/me`, { headers: { authorization: `Bearer ${token}` } });
    assert.equal(response.status, 401);
    await db.session.update({ where: { id: session.id }, data: { revokedAt: new Date() } });
  });

  it("does not allow one account to revoke another account's session", { skip: !enabled }, async () => {
    const owner = await createUser("USER");
    const other = await createUser("USER");
    const response = await fetch(`${api}/auth/sessions/${other.session.id}/revoke`, { method: "POST", headers: { authorization: `Bearer ${owner.token}`, "content-type": "application/json" }, body: "{}" });
    const errorBody = await response.text();
    assert.equal(response.status, 400, errorBody);
    const unchanged = await db.session.findUniqueOrThrow({ where: { id: other.session.id } });
    assert.equal(unchanged.revokedAt, null);
  });

  it("blocks admin APIs for an admin account before TOTP enrollment", { skip: !enabled }, async () => {
    const admin = await createUser("ADMIN");
    const response = await fetch(`${api}/admin/users`, { headers: { authorization: `Bearer ${admin.token}` } });
    const errorBody = await response.text();
    assert.equal(response.status, 403, errorBody);
    const payload = JSON.parse(errorBody) as { message: string };
    assert.match(payload.message, /two-step verification/i);
  });

  it("returns a generic password error and enforces the route auth limit", { skip: !enabled }, async () => {
    const existing = await db.user.create({ data: { email: `existing-${randomUUID()}@example.com`, displayName: "No Password Account" } });
    async function login(email: string) {
      return fetch(`${api}/auth/password/login`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email, password: "incorrect-password" }) });
    }
    const unknown = await login(`unknown-${randomUUID()}@example.com`);
    const existingResponse = await login(existing.email!);
    assert.equal(unknown.status, 401);
    assert.equal(existingResponse.status, 401);
    assert.deepEqual(await unknown.json(), await existingResponse.json());
    for (let index = 0; index < 3; index++) await login(`unknown-${randomUUID()}@example.com`);
    const limited = await login(`unknown-${randomUUID()}@example.com`);
    assert.equal(limited.status, 429);
  });

  it("prevents audit-log updates and deletes in PostgreSQL", { skip: !enabled }, async () => {
    const row = await db.auditLog.create({ data: { action: "test.append_only", entityType: "test", entityId: randomUUID() } });
    await assert.rejects(db.auditLog.update({ where: { id: row.id }, data: { action: "test.modified" } }));
    await assert.rejects(db.auditLog.delete({ where: { id: row.id } }));
  });
});
