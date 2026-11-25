import { randomInt, timingSafeEqual } from "node:crypto";

export type OtpRecordState = { expiresAt: Date; attemptCount: number; consumedAt: Date | null };

export function normalizeNigerianPhone(raw: string) {
  const value = raw.trim();
  const digits = value.replace(/\D/g, "");
  if (digits.length === 10 && /^[789]/.test(digits)) return `+234${digits}`;
  if (digits.length === 11 && digits.startsWith("0") && /^[789]/.test(digits.slice(1))) return `+234${digits.slice(1)}`;
  if (digits.length === 13 && digits.startsWith("234") && /^[789]/.test(digits.slice(3))) return `+${digits}`;
  return value.startsWith("+") ? `+${digits}` : digits;
}

export function nigerianPhoneLookupValues(normalized: string) {
  const canonical = normalizeNigerianPhone(normalized);
  if (!/^\+234[789]\d{9}$/.test(canonical)) return [canonical];
  const national = canonical.slice(4);
  return [canonical, `0${national}`, national, `234${national}`];
}

export function generateOtp() {
  return String(randomInt(0, 1_000_000)).padStart(6, "0");
}

export function otpIsUsable(record: OtpRecordState, now = new Date()) {
  return record.consumedAt === null && record.expiresAt.getTime() > now.getTime() && record.attemptCount < 5;
}

export function otpFailureConsumes(attemptCountBeforeFailure: number) {
  return attemptCountBeforeFailure >= 4;
}

export function resendIsCoolingDown(createdAt: Date, now: Date, cooldownSeconds: number) {
  return createdAt.getTime() > now.getTime() - cooldownSeconds * 1000;
}

export function constantTimeHashMatch(expected: string, actual: string) {
  const left = Buffer.from(expected);
  const right = Buffer.from(actual);
  return left.length === right.length && timingSafeEqual(left, right);
}

export function refreshTokenWasReused(storedHash: string, presentedHash: string) {
  return !constantTimeHashMatch(storedHash, presentedHash);
}

export async function rotateRefreshFamily(input: {
  storedHash: string;
  presentedHash: string;
  revokeFamily: () => Promise<void>;
  rotateCurrent: () => Promise<boolean>;
}): Promise<"REUSED" | "ROTATED" | "STALE"> {
  if (refreshTokenWasReused(input.storedHash, input.presentedHash)) {
    await input.revokeFamily();
    return "REUSED";
  }
  return await input.rotateCurrent() ? "ROTATED" : "STALE";
}

export function mayLinkIdentity(currentUserId: string, identityOwnerId: string | null) {
  return identityOwnerId === null || identityOwnerId === currentUserId;
}

export function hasRequiredPermissions(granted: Iterable<string>, required: readonly string[]) {
  const permissions = new Set(granted);
  return required.every((permission) => permissions.has(permission));
}
