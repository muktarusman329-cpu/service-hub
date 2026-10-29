import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { constantTimeHashMatch, generateOtp, hasRequiredPermissions, mayLinkIdentity, otpFailureConsumes, otpIsUsable, refreshTokenWasReused, resendIsCoolingDown, rotateRefreshFamily } from "./auth-primitives";

describe("Phase 2 identity primitives", () => {
  it("generates six decimal OTP digits using the CSPRNG helper", () => {
    for (let i = 0; i < 200; i++) assert.match(generateOtp(), /^\d{6}$/);
  });
  it("rejects expired, used, and exhausted OTPs", () => {
    const now = new Date("2026-01-01T00:00:00Z");
    assert.equal(otpIsUsable({ expiresAt: new Date(now.getTime() - 1), attemptCount: 0, consumedAt: null }, now), false);
    assert.equal(otpIsUsable({ expiresAt: new Date(now.getTime() + 1), attemptCount: 0, consumedAt: now }, now), false);
    assert.equal(otpIsUsable({ expiresAt: new Date(now.getTime() + 1), attemptCount: 5, consumedAt: null }, now), false);
  });
  it("consumes a code on the fifth failed attempt", () => {
    assert.equal(otpFailureConsumes(3), false);
    assert.equal(otpFailureConsumes(4), true);
  });
  it("enforces the resend cooldown window", () => {
    const now = new Date("2026-01-01T00:01:00Z");
    assert.equal(resendIsCoolingDown(new Date(now.getTime() - 59_000), now, 60), true);
    assert.equal(resendIsCoolingDown(new Date(now.getTime() - 60_000), now, 60), false);
  });
  it("uses constant-time matching and detects a reused refresh token", () => {
    assert.equal(constantTimeHashMatch("abc", "abc"), true);
    assert.equal(constantTimeHashMatch("abc", "abd"), false);
    assert.equal(refreshTokenWasReused("stored", "presented"), true);
    assert.equal(refreshTokenWasReused("same", "same"), false);
  });
  it("revokes every session in a refresh-token family when an old token is reused", async () => {
    const family = [{ revoked: false }, { revoked: false }];
    let rotated = false;
    const result = await rotateRefreshFamily({
      storedHash: "new-token-hash", presentedHash: "old-token-hash",
      revokeFamily: async () => { for (const session of family) session.revoked = true; },
      rotateCurrent: async () => { rotated = true; return true; }
    });
    assert.equal(result, "REUSED");
    assert.deepEqual(family.map((session) => session.revoked), [true, true]);
    assert.equal(rotated, false);
  });
  it("allows identity links only when no other account owns the proof", () => {
    assert.equal(mayLinkIdentity("user-a", null), true);
    assert.equal(mayLinkIdentity("user-a", "user-a"), true);
    assert.equal(mayLinkIdentity("user-a", "user-b"), false);
  });
  it("requires every declared permission", () => {
    assert.equal(hasRequiredPermissions(["users.read", "roles.read"], ["users.read"]), true);
    assert.equal(hasRequiredPermissions(["users.read"], ["users.read", "roles.manage"]), false);
  });
});
