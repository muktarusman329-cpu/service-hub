import { Body, Controller, Get, Inject, Injectable, Module, Param, Post, Req, Res, UseGuards, UnauthorizedException, ForbiddenException, BadRequestException, ConflictException, ServiceUnavailableException } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { JwtModule, JwtService } from "@nestjs/jwt";
import { Throttle, ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";
import { IsBoolean, IsEmail, IsIn, IsOptional, IsString, Length, Matches, MaxLength, MinLength } from "class-validator";
import { OAuth2Client } from "google-auth-library";
import * as OTPAuth from "otpauth";
import argon2 from "argon2";
import type { Request, Response } from "express";
import { createCipheriv, createDecipheriv, createHash, randomUUID } from "node:crypto";
import { env } from "@servicehub/config/env";
import { PrismaService } from "./prisma.service";
import { NotificationService } from "./notifications";
import { AccessGuard, AuthenticatedRequest, digest, randomToken, safeEqual } from "./security";
import { generateOtp, mayLinkIdentity, otpFailureConsumes, otpIsUsable, rotateRefreshFamily, resendIsCoolingDown } from "./auth-primitives";

class OtpRequestDto {
  @IsString() @Length(5, 320) @Matches(/^(?:(?:\+?234|0)[789][\d\s()-]+|[^@\s]+@[^@\s]+\.[^@\s]+)$/i, { message: "Enter a valid Nigerian phone number or email" }) destination!: string;
  @IsIn(["SIGN_IN", "SIGN_UP", "VERIFY_EMAIL", "LINK_PHONE", "LINK_EMAIL"]) purpose!: "SIGN_IN" | "SIGN_UP" | "VERIFY_EMAIL" | "LINK_PHONE" | "LINK_EMAIL";
  @IsOptional() @IsString() displayName?: string;
  @IsOptional() @IsIn(["USER", "TECHNICIAN"]) accountType?: "USER" | "TECHNICIAN";
  @IsOptional() @IsBoolean() acceptTerms?: boolean;
  @IsOptional() @IsBoolean() acceptPrivacy?: boolean;
  @IsOptional() @IsString() @Length(6, 6) csrfProof?: string;
}
class OtpVerifyDto { @IsString() @Length(5, 320) @Matches(/^(?:(?:\+?234|0)[789][\d\s()-]+|[^@\s]+@[^@\s]+\.[^@\s]+)$/i, { message: "Enter a valid Nigerian phone number or email" }) destination!: string; @IsString() @Matches(/^\d{6}$/) code!: string; @IsIn(["SIGN_IN", "SIGN_UP", "VERIFY_EMAIL", "LINK_PHONE", "LINK_EMAIL"]) purpose!: OtpRequestDto["purpose"]; }
class PasswordLoginDto { @IsEmail() email!: string; @IsString() @MinLength(8) @MaxLength(256) password!: string; }
class PasswordSetDto { @IsString() @MinLength(12) @MaxLength(256) password!: string; }
class GoogleLoginDto { @IsString() @Length(100, 4096) idToken!: string; @IsOptional() @IsBoolean() acceptTerms?: boolean; @IsOptional() @IsBoolean() acceptPrivacy?: boolean; }
class TotpDto { @IsString() @Matches(/^\d{6}$/) code!: string; }
class TotpLoginDto { @IsString() @Length(20, 4096) challengeToken!: string; @IsString() @Matches(/^(?:\d{6}|[A-Z0-9_-]{8,32})$/i) code!: string; }
class DataRequestDto { @IsIn(["EXPORT", "DELETE"]) type!: "EXPORT" | "DELETE"; }
class OtpPreferenceDto { @IsIn(["AUTO", "WHATSAPP", "SMS", "EMAIL"]) channel!: "AUTO" | "WHATSAPP" | "SMS" | "EMAIL"; }

const cleanDestination = (raw: string) => {
  if (raw.includes("@")) return raw.trim().toLowerCase();
  const digits = raw.replace(/\D/g, "");
  if (digits.startsWith("0") && digits.length === 11) return `+234${digits.slice(1)}`;
  if (digits.startsWith("234") && digits.length === 13) return `+${digits}`;
  return raw.startsWith("+") ? `+${digits}` : digits;
};
const isEmail = (s: string) => s.includes("@");
const assertDestination = (value: string) => { if (!isEmail(value) && !/^\+234[789]\d{9}$/.test(value)) throw new BadRequestException("Enter a valid Nigerian phone number or email"); };
const primaryChannel = (channel: string) => channel === "termii" ? "SMS" : channel.toUpperCase() as "WHATSAPP" | "SMS" | "EMAIL" | "DEV";
const encKey = () => createHash("sha256").update(env.APP_ENCRYPTION_KEY || env.SESSION_SECRET || env.OTP_HASH_SECRET).digest();
function encrypt(value: string) {
  const iv = randomToken(12); const cipher = createCipheriv("aes-256-gcm", encKey(), Buffer.from(iv, "base64url"));
  const body = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  return [iv, cipher.getAuthTag().toString("base64url"), body.toString("base64url")].join(".");
}
function decrypt(value: string) {
  const [iv, tag, body] = value.split("."); const cipher = createDecipheriv("aes-256-gcm", encKey(), Buffer.from(iv, "base64url"));
  cipher.setAuthTag(Buffer.from(tag, "base64url")); return Buffer.concat([cipher.update(Buffer.from(body, "base64url")), cipher.final()]).toString("utf8");
}
const totpFor = (secret: string, label: string) => new OTPAuth.TOTP({ issuer: "ServiceHub", label, algorithm: "SHA1", digits: 6, period: 30, secret: OTPAuth.Secret.fromBase32(secret) });

@Injectable()
export class AuthService {
  private google = new OAuth2Client(env.GOOGLE_CLIENT_ID);
  constructor(@Inject(PrismaService) private db: PrismaService, @Inject(JwtService) private jwt: JwtService, @Inject(NotificationService) private notifications: NotificationService) {}
  private async audit(action: string, req: Request, actorUserId?: string, entityId?: string, metadata?: object) {
    await this.db.auditLog.create({ data: { action, actorUserId, entityType: "auth", entityId, ipHash: req.ip ? digest(req.ip) : null, userAgent: String(req.headers["user-agent"] || "").slice(0, 500), metadata } });
  }
  private async issueOtp(destinationInput: string, purpose: OtpRequestDto["purpose"], req: Request, details: { displayName?: string; accountType?: string; acceptTerms?: boolean; acceptPrivacy?: boolean }, userId?: string) {
    const destination = cleanDestination(destinationInput); assertDestination(destination); const destinationHash = digest(destination);
    const now = new Date();
    const cooldown = await this.db.otpCode.findFirst({ where: { destinationHash, purpose, createdAt: { gt: new Date(now.getTime() - env.OTP_RESEND_SECONDS * 1000) } }, orderBy: { createdAt: "desc" } });
    if (cooldown && resendIsCoolingDown(cooldown.createdAt, now, env.OTP_RESEND_SECONDS)) return { ok: true, message: "If the details can receive a code, it has been sent." };
    const recent = await this.db.otpCode.count({ where: { destinationHash, createdAt: { gt: new Date(now.getTime() - 60 * 60 * 1000) } } });
    if (recent >= 5) return { ok: true, message: "If the details can receive a code, it has been sent." };
    if (purpose === "SIGN_UP" && (!details.acceptTerms || !details.acceptPrivacy)) throw new BadRequestException("Accept the terms and privacy policy to continue");
    const userPreference = userId ? await this.db.user.findUnique({ where: { id: userId }, select: { preferredOtpChannel: true, email: true, emailVerifiedAt: true } }) : null;
    const preferredChannel = userPreference?.preferredOtpChannel || primaryChannel(env.OTP_PRIMARY_CHANNEL);
    const phoneFallback = primaryChannel(env.OTP_FALLBACK_CHANNEL === "email" ? "termii" : env.OTP_FALLBACK_CHANNEL);
    const useVerifiedEmail = !isEmail(destination) && preferredChannel === "EMAIL" && !!userPreference?.emailVerifiedAt && !!userPreference.email;
    const deliveryDestination = useVerifiedEmail ? userPreference!.email! : destination;
    const channel = isEmail(destination) || useVerifiedEmail ? "EMAIL" : preferredChannel === "EMAIL" ? phoneFallback : preferredChannel;
    const code = generateOtp();
    await this.db.otpCode.updateMany({ where: { destinationHash, purpose, consumedAt: null }, data: { consumedAt: now } });
    const otp = await this.db.otpCode.create({ data: { userId, destinationHash, purpose, codeHash: digest(code, env.OTP_HASH_SECRET), channel, expiresAt: new Date(now.getTime() + 5 * 60_000), metadata: { displayName: details.displayName, accountType: details.accountType, acceptTerms: details.acceptTerms, acceptPrivacy: details.acceptPrivacy } } });
    try { await this.notifications.sendOtp(deliveryDestination, channel, code, userId); }
    catch { await this.db.otpCode.update({ where: { id: otp.id }, data: { consumedAt: now } }); throw new ServiceUnavailableException("Code delivery is temporarily unavailable. Try again shortly"); }
    await this.audit("auth.otp.sent", req, userId, otp.id, { purpose, channel });
    return { ok: true, message: "If the details can receive a code, it has been sent." };
  }
  async requestOtp(dto: OtpRequestDto, req: Request, userId?: string) {
    const destination = cleanDestination(dto.destination); assertDestination(destination);
    const existing = isEmail(destination) ? await this.db.user.findUnique({ where: { email: destination } }) : await this.db.user.findUnique({ where: { phoneE164: destination } });
    if (["LINK_PHONE", "LINK_EMAIL"].includes(dto.purpose)) {
      if (!userId) throw new UnauthorizedException("Sign in required");
      if (!mayLinkIdentity(userId, existing?.id || null)) throw new ConflictException("This sign-in method is already linked to another account");
      if (existing?.id === userId) throw new ConflictException("This sign-in method is already linked");
    }
    if (dto.purpose === "SIGN_UP" && existing) return { ok: true, message: "If the details can receive a code, it has been sent." };
    return this.issueOtp(destination, dto.purpose, req, dto, existing?.id || userId);
  }
  async verifyOtp(dto: OtpVerifyDto, req: Request, res: Response, userId?: string) {
    const destination = cleanDestination(dto.destination); assertDestination(destination); const destinationHash = digest(destination);
    const row = await this.db.otpCode.findFirst({ where: { destinationHash, purpose: dto.purpose, consumedAt: null }, orderBy: { createdAt: "desc" } });
    const now = new Date();
    if (!row || !otpIsUsable(row, now) || !safeEqual(row.codeHash, digest(dto.code, env.OTP_HASH_SECRET))) {
      if (row && otpIsUsable(row, now)) await this.db.otpCode.update({ where: { id: row.id }, data: { attemptCount: row.attemptCount + 1, ...(otpFailureConsumes(row.attemptCount) ? { consumedAt: now } : {}) } });
      await this.audit("auth.login.failed", req, userId, undefined, { method: "otp" });
      throw new UnauthorizedException("Code is invalid or expired");
    }
    await this.db.otpCode.update({ where: { id: row.id }, data: { consumedAt: new Date(), attemptCount: { increment: 1 } } });
    if (dto.purpose === "LINK_PHONE" || dto.purpose === "LINK_EMAIL") {
      if (!userId) throw new UnauthorizedException("Sign in required");
      const collision = isEmail(destination) ? await this.db.user.findUnique({ where: { email: destination } }) : await this.db.user.findUnique({ where: { phoneE164: destination } });
      if (!mayLinkIdentity(userId, collision?.id || null)) throw new ConflictException("This sign-in method is already in use");
      await this.db.user.update({ where: { id: userId }, data: isEmail(destination) ? { email: destination, emailVerifiedAt: new Date() } : { phoneE164: destination, phoneVerifiedAt: new Date() } });
      await this.audit("auth.method.linked", req, userId, userId, { method: isEmail(destination) ? "email" : "phone" });
      return { ok: true };
    }
    let user = row.userId ? await this.db.user.findUnique({ where: { id: row.userId } }) : isEmail(destination) ? await this.db.user.findUnique({ where: { email: destination } }) : await this.db.user.findUnique({ where: { phoneE164: destination } });
    if (!user) {
      const metadata = (row.metadata || {}) as { displayName?: string; accountType?: string; acceptTerms?: boolean; acceptPrivacy?: boolean };
      if (dto.purpose !== "SIGN_UP") throw new UnauthorizedException("Code is invalid or expired");
      user = await this.db.user.create({ data: { [isEmail(destination) ? "email" : "phoneE164"]: destination, displayName: metadata.displayName?.slice(0, 120), [isEmail(destination) ? "emailVerifiedAt" : "phoneVerifiedAt"]: new Date(), ...(metadata.accountType === "TECHNICIAN" ? { technicianProfile: { create: { approvalStatus: "PENDING_APPROVAL" } } } : {}) } });
      if (metadata.acceptTerms && metadata.acceptPrivacy) {
        await this.db.consent.createMany({ data: [{ userId: user.id, purpose: "TERMS", policyVersion: env.TERMS_VERSION, granted: true, source: "signup" }, { userId: user.id, purpose: "PRIVACY", policyVersion: env.PRIVACY_VERSION, granted: true, source: "signup" }] });
      }
      await this.ensureRole(user.id, metadata.accountType === "TECHNICIAN" ? "TECHNICIAN" : "USER");
    } else {
      if (user.status !== "ACTIVE" || user.deletedAt) throw new UnauthorizedException("Code is invalid or expired");
      user = await this.db.user.update({ where: { id: user.id }, data: isEmail(destination) ? { emailVerifiedAt: new Date() } : { phoneVerifiedAt: new Date() } });
    }
    return this.completeLogin(user.id, req, res, "otp");
  }
  private async ensureRole(userId: string, key: string) {
    const role = await this.db.role.findUnique({ where: { key } });
    if (role) await this.db.userRole.upsert({ where: { userId_roleId: { userId, roleId: role.id } }, update: {}, create: { userId, roleId: role.id } });
  }
  async passwordLogin(dto: PasswordLoginDto, req: Request, res: Response) {
    const user = await this.db.user.findUnique({ where: { email: dto.email.trim().toLowerCase() } });
    if (!user?.passwordHash || !(await argon2.verify(user.passwordHash, dto.password)) || user.status !== "ACTIVE" || user.deletedAt) {
      await this.audit("auth.login.failed", req, user?.id, undefined, { method: "password" }); throw new UnauthorizedException("Email or password is incorrect");
    }
    return this.completeLogin(user.id, req, res, "password");
  }
  async setPassword(userId: string, password: string, req: Request) {
    const user = await this.db.user.findUnique({ where: { id: userId } });
    if (!user?.emailVerifiedAt) throw new ForbiddenException("Verify your email before adding a password");
    await this.db.user.update({ where: { id: userId }, data: { passwordHash: await argon2.hash(password, { type: argon2.argon2id }) } });
    await this.audit("auth.password.set", req, userId, userId);
    return { ok: true };
  }
  async googleLogin(idToken: string, req: Request, res: Response, accepted: boolean) {
    if (!env.GOOGLE_CLIENT_ID) throw new BadRequestException("Google sign-in is not configured");
    const ticket = await this.google.verifyIdToken({ idToken, audience: env.GOOGLE_CLIENT_ID });
    const payload = ticket.getPayload();
    if (!payload?.sub || !payload.email || !payload.email_verified) throw new UnauthorizedException("Google sign-in could not be verified");
    const account = await this.db.oAuthAccount.findUnique({ where: { provider_providerSubject: { provider: "GOOGLE", providerSubject: payload.sub } }, include: { user: true } });
    let user = account?.user;
    if (!user) {
      const emailOwner = await this.db.user.findUnique({ where: { email: payload.email.toLowerCase() } });
      if (emailOwner) throw new ConflictException("Sign in with your linked method before adding Google");
      if (!accepted) throw new BadRequestException("Accept the terms and privacy policy to continue");
      user = await this.db.user.create({ data: { email: payload.email.toLowerCase(), displayName: payload.name?.slice(0, 120), emailVerifiedAt: new Date() } });
      await this.db.oAuthAccount.create({ data: { userId: user.id, provider: "GOOGLE", providerSubject: payload.sub, email: payload.email } });
      await this.ensureRole(user.id, "USER");
      await this.db.consent.createMany({ data: [{ userId: user.id, purpose: "TERMS", policyVersion: env.TERMS_VERSION, granted: true, source: "signup" }, { userId: user.id, purpose: "PRIVACY", policyVersion: env.PRIVACY_VERSION, granted: true, source: "signup" }] });
    }
    return this.completeLogin(user.id, req, res, "google");
  }
  async linkGoogle(userId: string, idToken: string, req: Request) {
    if (!env.GOOGLE_CLIENT_ID) throw new BadRequestException("Google sign-in is not configured");
    const payload = (await this.google.verifyIdToken({ idToken, audience: env.GOOGLE_CLIENT_ID })).getPayload();
    if (!payload?.sub || !payload.email || !payload.email_verified) throw new UnauthorizedException("Google sign-in could not be verified");
    const [owner, subject] = await Promise.all([
      this.db.user.findUnique({ where: { email: payload.email.toLowerCase() }, select: { id: true } }),
      this.db.oAuthAccount.findUnique({ where: { provider_providerSubject: { provider: "GOOGLE", providerSubject: payload.sub } }, select: { userId: true } })
    ]);
    if (!mayLinkIdentity(userId, owner?.id || null) || !mayLinkIdentity(userId, subject?.userId || null)) throw new ConflictException("This Google account is linked to another user");
    if (!subject) await this.db.oAuthAccount.create({ data: { userId, provider: "GOOGLE", providerSubject: payload.sub, email: payload.email.toLowerCase() } });
    if (!owner) await this.db.user.update({ where: { id: userId }, data: { email: payload.email.toLowerCase(), emailVerifiedAt: new Date() } });
    await this.audit("auth.method.linked", req, userId, userId, { method: "google" });
    return { ok: true };
  }
  private async completeLogin(userId: string, req: Request, res: Response, method: string) {
    const user = await this.db.user.findUnique({ where: { id: userId }, include: { roles: { include: { role: true } } } });
    if (!user || user.status !== "ACTIVE" || user.deletedAt) throw new UnauthorizedException("Sign in required");
    if (user.totpEnabledAt) {
      const challenge = await this.jwt.signAsync({ sub: userId, scope: "totp-challenge", purpose: "login" }, { expiresIn: "5m" } as never);
      await this.audit("auth.login.first_factor", req, userId, userId, { method }); return { requiresTotp: true, challengeToken: challenge };
    }
    const isAdmin = (await this.db.userRole.count({ where: { userId, role: { key: { in: ["ADMIN", "SUPER_ADMIN"] } } } })) > 0;
    if (isAdmin) await this.audit("auth.admin.totp_required", req, userId, userId);
    return this.createSession(user, req, res, method);
  }
  private async createSession(user: { id: string; totpEnabledAt?: Date | null; roles: { role: { key: string } }[] }, req: Request, res: Response, method: string) {
    const sessionId = randomUUID(); const secret = randomToken(); const refreshToken = `${sessionId}.${secret}`; const familyId = randomUUID();
    const expiresAt = new Date(Date.now() + env.AUTH_REFRESH_DAYS * 86400_000);
    await this.db.session.create({ data: { id: sessionId, familyId, userId: user.id, refreshTokenHash: digest(refreshToken), expiresAt, ipHash: req.ip ? digest(req.ip) : null, userAgent: String(req.headers["user-agent"] || "").slice(0, 500) } });
    const accessToken = await this.jwt.signAsync({ sub: user.id, sid: sessionId }, { expiresIn: env.AUTH_ACCESS_TTL_SECONDS } as never);
    this.setCookies(res, accessToken, refreshToken);
    await this.audit("auth.login.succeeded", req, user.id, sessionId, { method });
    return { ok: true, accessToken, csrfToken: this.setCsrf(res), user: { id: user.id, roles: user.roles.map((r) => r.role.key), requiresAdminTotpEnrollment: !user.totpEnabledAt && user.roles.some((r) => ["ADMIN", "SUPER_ADMIN"].includes(r.role.key)) } };
  }
  private setCookies(res: Response, access: string, refresh: string) {
    const secure = env.NODE_ENV === "production";
    res.cookie("access_token", access, { httpOnly: true, secure, sameSite: "strict", path: "/", maxAge: env.AUTH_ACCESS_TTL_SECONDS * 1000 });
    res.cookie("refresh_token", refresh, { httpOnly: true, secure, sameSite: "strict", path: "/api/v1/auth", maxAge: env.AUTH_REFRESH_DAYS * 86400_000 });
  }
  setCsrf(res: Response) { const token = randomToken(24); res.cookie("csrf_token", token, { httpOnly: false, secure: env.NODE_ENV === "production", sameSite: "strict", path: "/" }); return token; }
  async refresh(refreshTokenInput: string | undefined, req: Request, res: Response) {
    const token = refreshTokenInput || req.cookies?.refresh_token;
    if (!token || !token.includes(".")) throw new UnauthorizedException("Session expired");
    const [sessionId] = token.split(".");
    const session = await this.db.session.findUnique({ where: { id: sessionId }, include: { user: { include: { roles: { include: { role: true } } } } } });
    if (!session || session.revokedAt || session.expiresAt < new Date() || session.user.status !== "ACTIVE") throw new UnauthorizedException("Session expired");
    const next = `${sessionId}.${randomToken()}`;
    const rotation = await rotateRefreshFamily({
      storedHash: session.refreshTokenHash,
      presentedHash: digest(token),
      revokeFamily: async () => { await this.db.session.updateMany({ where: { familyId: session.familyId, revokedAt: null }, data: { revokedAt: new Date() } }); },
      rotateCurrent: async () => (await this.db.session.updateMany({ where: { id: sessionId, refreshTokenHash: digest(token), revokedAt: null }, data: { refreshTokenHash: digest(next), lastSeenAt: new Date() } })).count > 0
    });
    if (rotation === "REUSED") {
      await this.audit("auth.refresh.reuse_detected", req, session.userId, session.id); throw new UnauthorizedException("Session expired");
    }
    if (rotation !== "ROTATED") throw new UnauthorizedException("Session expired");
    const access = await this.jwt.signAsync({ sub: session.userId, sid: sessionId }, { expiresIn: env.AUTH_ACCESS_TTL_SECONDS } as never);
    this.setCookies(res, access, next); return { ok: true, accessToken: access, csrfToken: this.setCsrf(res) };
  }
  async logout(auth: AuthenticatedRequest["authUser"], req: Request, res: Response, all = false) {
    if (!auth) throw new UnauthorizedException();
    const where = all ? { userId: auth.id, revokedAt: null } : { id: auth.sessionId, revokedAt: null };
    await this.db.session.updateMany({ where, data: { revokedAt: new Date() } });
    await this.audit(all ? "auth.sessions.revoked_all" : "auth.session.revoked", req, auth.id, auth.sessionId);
    res.clearCookie("access_token", { path: "/" }); res.clearCookie("refresh_token", { path: "/api/v1/auth" }); res.clearCookie("csrf_token", { path: "/" }); return { ok: true };
  }
  async sessions(userId: string) { return this.db.session.findMany({ where: { userId, revokedAt: null, expiresAt: { gt: new Date() } }, select: { id: true, deviceLabel: true, ipHash: true, userAgent: true, lastSeenAt: true, createdAt: true }, orderBy: { lastSeenAt: "desc" } }); }
  async revokeSession(userId: string, id: string, req: Request) {
    const result = await this.db.session.updateMany({ where: { id, userId, revokedAt: null }, data: { revokedAt: new Date() } });
    if (!result.count) throw new BadRequestException("Session not found");
    await this.audit("auth.session.revoked", req, userId, id); return { ok: true };
  }
  async startTotp(userId: string, req: Request) {
    const user = await this.db.user.findUnique({ where: { id: userId }, select: { email: true, totpEnabledAt: true } });
    if (user?.totpEnabledAt) throw new ConflictException("Two-step verification is already enabled");
    const email = user?.email || userId;
    const secret = new OTPAuth.Secret({ size: 20 }).base32;
    await this.db.user.update({ where: { id: userId }, data: { totpSecretEncrypted: encrypt(secret), totpEnabledAt: null } });
    await this.audit("auth.totp.setup_started", req, userId, userId);
    const totp = totpFor(secret, email);
    return { secret, uri: totp.toString() };
  }
  async confirmTotp(userId: string, code: string, req: Request) {
    const user = await this.db.user.findUnique({ where: { id: userId } });
    if (!user?.totpSecretEncrypted || !totpFor(decrypt(user.totpSecretEncrypted), user.email || userId).validate({ token: code, window: 1 })) throw new BadRequestException("Code could not be verified");
    const recovery = Array.from({ length: 10 }, () => randomToken(8).toUpperCase());
    await this.db.user.update({ where: { id: userId }, data: { totpEnabledAt: new Date(), recoveryCodeHashes: recovery.map((c) => digest(c)) } });
    await this.audit("auth.totp.enabled", req, userId, userId);
    return { ok: true, recoveryCodes: recovery };
  }
  async verifyLoginTotp(challenge: string, code: string, req: Request, res: Response) {
    let claims: { sub: string; scope?: string };
    try { claims = await this.jwt.verifyAsync(challenge); } catch { throw new UnauthorizedException("Code could not be verified"); }
    if (claims.scope !== "totp-challenge") throw new UnauthorizedException("Code could not be verified");
    const user = await this.db.user.findUnique({ where: { id: claims.sub }, include: { roles: { include: { role: true } } } });
    if (!user?.totpSecretEncrypted || !user.totpEnabledAt) throw new UnauthorizedException("Code could not be verified");
    const valid = !!totpFor(decrypt(user.totpSecretEncrypted), user.email || user.id).validate({ token: code, window: 1 });
    let recoveryHashes = user.recoveryCodeHashes;
    const index = recoveryHashes.findIndex((hash) => safeEqual(hash, digest(code.toUpperCase())));
    const recoveryValid = index >= 0;
    if (!valid && !recoveryValid) { await this.audit("auth.totp.failed", req, user.id, user.id); throw new UnauthorizedException("Code could not be verified"); }
    if (recoveryValid) { recoveryHashes = recoveryHashes.filter((_, i) => i !== index); await this.db.user.update({ where: { id: user.id }, data: { recoveryCodeHashes: recoveryHashes } }); }
    await this.audit("auth.totp.succeeded", req, user.id, user.id, { recoveryCode: recoveryValid });
    return this.createSession(user, req, res, "totp");
  }
  async unlink(userId: string, method: "phone" | "email" | "google", req: Request) {
    if (!["phone", "email", "google"].includes(method)) throw new BadRequestException("Sign-in method not found");
    const user = await this.db.user.findUnique({ where: { id: userId }, include: { oauthAccounts: true } });
    const methods = Number(!!user?.phoneE164) + Number(!!user?.emailVerifiedAt) + user?.oauthAccounts.length!;
    if (!user || methods <= 1) throw new ConflictException("Add another verified sign-in method before unlinking this one");
    if (method === "google") await this.db.oAuthAccount.deleteMany({ where: { userId } });
    else await this.db.user.update({ where: { id: userId }, data: method === "phone" ? { phoneE164: null, phoneVerifiedAt: null } : { email: null, emailVerifiedAt: null, passwordHash: null } });
    await this.audit("auth.method.unlinked", req, userId, userId, { method }); return { ok: true };
  }
  async requestDataAction(userId: string, type: "EXPORT" | "DELETE", req: Request) {
    const requestType = type === "EXPORT" ? "EXPORT" : "DELETE";
    const request = await this.db.dataSubjectRequest.create({ data: { userId, requestType, status: "REQUESTED" } });
    await this.audit(`privacy.${type.toLowerCase()}.requested`, req, userId, request.id);
    return { id: request.id, type: requestType, status: request.status, requestedAt: request.requestedAt };
  }
  async myDataRequests(userId: string) { return this.db.dataSubjectRequest.findMany({ where: { userId }, select: { id: true, requestType: true, status: true, requestedAt: true, completedAt: true, expiresAt: true }, orderBy: { requestedAt: "desc" } }); }
  async setOtpPreference(userId: string, channel: OtpPreferenceDto["channel"], req: Request) {
    const user = await this.db.user.findUnique({ where: { id: userId }, select: { phoneVerifiedAt: true, emailVerifiedAt: true } });
    if (!user) throw new UnauthorizedException("Sign in required");
    if (channel === "EMAIL" && !user.emailVerifiedAt) throw new BadRequestException("Verify an email address before choosing email codes");
    if (["WHATSAPP", "SMS"].includes(channel) && !user.phoneVerifiedAt) throw new BadRequestException("Verify a phone number before choosing text codes");
    await this.db.user.update({ where: { id: userId }, data: { preferredOtpChannel: channel === "AUTO" ? null : channel } });
    await this.audit("auth.otp.preference.updated", req, userId, userId, { channel }); return { ok: true, channel };
  }
}

@Controller("auth")
@Throttle({ default: { limit: 30, ttl: 60_000 } })
class AuthController {
  constructor(@Inject(AuthService) private readonly auth: AuthService, @Inject(PrismaService) private readonly db: PrismaService) {}
  @Post("otp/request") @Throttle({ default: { limit: 5, ttl: 60_000 } })
  requestOtp(@Body() dto: OtpRequestDto, @Req() req: AuthenticatedRequest) { return this.auth.requestOtp(dto, req, req.authUser?.id); }
  @Post("otp/verify") @Throttle({ default: { limit: 10, ttl: 60_000 } })
  verifyOtp(@Body() dto: OtpVerifyDto, @Req() req: AuthenticatedRequest, @Res({ passthrough: true }) res: Response) { return this.auth.verifyOtp(dto, req, res, req.authUser?.id); }
  @Post("password/login") @Throttle({ default: { limit: 5, ttl: 60_000 } })
  passwordLogin(@Body() dto: PasswordLoginDto, @Req() req: Request, @Res({ passthrough: true }) res: Response) { return this.auth.passwordLogin(dto, req, res); }
  @Post("password") @UseGuards(AccessGuard) setPassword(@Body() dto: PasswordSetDto, @Req() req: AuthenticatedRequest) { return this.auth.setPassword(req.authUser!.id, dto.password, req); }
  @Post("google") @Throttle({ default: { limit: 5, ttl: 60_000 } }) google(@Body() dto: GoogleLoginDto, @Req() req: Request, @Res({ passthrough: true }) res: Response) { return this.auth.googleLogin(dto.idToken, req, res, !!dto.acceptTerms && !!dto.acceptPrivacy); }
  @Post("refresh") refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) { return this.auth.refresh(undefined, req, res); }
  @Post("logout") @UseGuards(AccessGuard) logout(@Req() req: AuthenticatedRequest, @Res({ passthrough: true }) res: Response) { return this.auth.logout(req.authUser, req, res); }
  @Post("logout-everywhere") @UseGuards(AccessGuard) logoutAll(@Req() req: AuthenticatedRequest, @Res({ passthrough: true }) res: Response) { return this.auth.logout(req.authUser, req, res, true); }
  @Get("sessions") @UseGuards(AccessGuard) sessions(@Req() req: AuthenticatedRequest) { return this.auth.sessions(req.authUser!.id); }
  @Post("sessions/:id/revoke") @UseGuards(AccessGuard) revoke(@Param("id") id: string, @Req() req: AuthenticatedRequest) { return this.auth.revokeSession(req.authUser!.id, id, req); }
  @Post("totp/start") @UseGuards(AccessGuard) totpStart(@Req() req: AuthenticatedRequest) { return this.auth.startTotp(req.authUser!.id, req); }
  @Post("totp/confirm") @UseGuards(AccessGuard) totpConfirm(@Body() dto: TotpDto, @Req() req: AuthenticatedRequest) { return this.auth.confirmTotp(req.authUser!.id, dto.code, req); }
  @Post("totp/verify-login") verifyTotp(@Body() body: TotpLoginDto, @Req() req: Request, @Res({ passthrough: true }) res: Response) { return this.auth.verifyLoginTotp(body.challengeToken, body.code, req, res); }
  @Post("methods/link/request") @UseGuards(AccessGuard) linkRequest(@Body() dto: OtpRequestDto, @Req() req: AuthenticatedRequest) { return this.auth.requestOtp({ ...dto, purpose: dto.destination.includes("@") ? "LINK_EMAIL" : "LINK_PHONE" }, req, req.authUser!.id); }
  @Post("methods/link/verify") @UseGuards(AccessGuard) linkVerify(@Body() dto: OtpVerifyDto, @Req() req: AuthenticatedRequest, @Res({ passthrough: true }) res: Response) { return this.auth.verifyOtp({ ...dto, purpose: dto.destination.includes("@") ? "LINK_EMAIL" : "LINK_PHONE" }, req, res, req.authUser!.id); }
  @Post("methods/google/link") @UseGuards(AccessGuard) linkGoogle(@Body() dto: GoogleLoginDto, @Req() req: AuthenticatedRequest) { return this.auth.linkGoogle(req.authUser!.id, dto.idToken, req); }
  @Post("methods/:method/unlink") @UseGuards(AccessGuard) unlink(@Req() req: AuthenticatedRequest, @Req() request: Request) { return this.auth.unlink(req.authUser!.id, request.params.method as "phone" | "email" | "google", req); }
  @Get("me") @UseGuards(AccessGuard) async me(@Req() req: AuthenticatedRequest) {
    const user = await this.db.user.findUniqueOrThrow({ where: { id: req.authUser!.id }, include: { roles: { include: { role: true } }, oauthAccounts: true } });
    return { id: user.id, phone: user.phoneE164, email: user.email, displayName: user.displayName, phoneVerified: !!user.phoneVerifiedAt, emailVerified: !!user.emailVerifiedAt, otpChannel: user.preferredOtpChannel || "AUTO", roles: user.roles.map((r) => r.role.key), googleLinked: user.oauthAccounts.some((a) => a.provider === "GOOGLE"), totpEnabled: !!user.totpEnabledAt };
  }
  @Post("data-requests") @UseGuards(AccessGuard) dataRequest(@Body() dto: DataRequestDto, @Req() req: AuthenticatedRequest) { return this.auth.requestDataAction(req.authUser!.id, dto.type, req); }
  @Get("data-requests") @UseGuards(AccessGuard) myDataRequests(@Req() req: AuthenticatedRequest) { return this.auth.myDataRequests(req.authUser!.id); }
  @Post("otp-preference") @UseGuards(AccessGuard) otpPreference(@Body() dto: OtpPreferenceDto, @Req() req: AuthenticatedRequest) { return this.auth.setOtpPreference(req.authUser!.id, dto.channel, req); }
  @Get("csrf") csrf(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    // Reuse the browser's double-submit token. Rotating on every parallel GET
    // lets the last response overwrite the cookie before earlier mutations land.
    const token = typeof req.cookies?.csrf_token === "string" ? req.cookies.csrf_token : this.auth.setCsrf(res);
    return { csrfToken: token };
  }
}

@Module({ imports: [JwtModule.register({ secret: env.JWT_ACCESS_SECRET }), ThrottlerModule.forRoot([{ ttl: 60_000, limit: 100 }])], controllers: [AuthController], providers: [{ provide: APP_GUARD, useClass: ThrottlerGuard }, AuthService, NotificationService, PrismaService, AccessGuard], exports: [AccessGuard, PrismaService, JwtModule, NotificationService] })
export class AuthModule {}
