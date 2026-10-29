import { CanActivate, ExecutionContext, ForbiddenException, HttpException, Inject, Injectable, SetMetadata, UnauthorizedException } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { JwtService } from "@nestjs/jwt";
import { createCipheriv, createDecipheriv, createHash, createHmac, randomBytes, timingSafeEqual } from "node:crypto";
import type { Request } from "express";
import { PrismaService } from "./prisma.service";
import { env } from "@servicehub/config/env";
import { hasRequiredPermissions } from "./auth-primitives";

export const PERMISSIONS_KEY = "required_permissions";
export const RequirePermissions = (...permissions: string[]) => SetMetadata(PERMISSIONS_KEY, permissions);
export const digest = (value: string, key = env.SESSION_SECRET || env.OTP_HASH_SECRET) => createHmac("sha256", key).update(value).digest("hex");
export const safeEqual = (a: string, b: string) => {
  const aa = Buffer.from(a); const bb = Buffer.from(b);
  return aa.length === bb.length && timingSafeEqual(aa, bb);
};
export const randomToken = (bytes = 32) => randomBytes(bytes).toString("base64url");
const encryptionKey = () => createHash("sha256").update(env.APP_ENCRYPTION_KEY || env.SESSION_SECRET || env.OTP_HASH_SECRET).digest();
export const encryptJobValue = (value: string) => {
  const iv = randomBytes(12); const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const data = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  return `${iv.toString("base64url")}.${cipher.getAuthTag().toString("base64url")}.${data.toString("base64url")}`;
};
export const decryptJobValue = (value: string) => {
  const [iv, tag, data] = value.split("."); const decipher = createDecipheriv("aes-256-gcm", encryptionKey(), Buffer.from(iv, "base64url"));
  decipher.setAuthTag(Buffer.from(tag, "base64url"));
  return Buffer.concat([decipher.update(Buffer.from(data, "base64url")), decipher.final()]).toString("utf8");
};

export interface AuthenticatedRequest extends Request {
  authUser?: { id: string; sessionId: string; permissions: string[]; totpComplete: boolean };
}

@Injectable()
export class AccessGuard implements CanActivate {
  private lastSeenWrites = new Map<string, number>();
  constructor(@Inject(JwtService) private readonly jwt: JwtService, @Inject(PrismaService) private readonly db: PrismaService) {}
  async canActivate(context: ExecutionContext) {
    const req = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const bearer = req.headers.authorization?.startsWith("Bearer ") ? req.headers.authorization.slice(7) : undefined;
    const token = req.cookies?.access_token || bearer;
    if (!token) throw new UnauthorizedException("Sign in required");
    try {
      const claims = await this.jwt.verifyAsync<{ sub: string; sid: string; scope?: string }>(token);
      if (claims.scope === "totp-challenge") throw new UnauthorizedException("Complete two-step verification");
      const [user, session] = await Promise.all([
        this.db.user.findUnique({ where: { id: claims.sub }, select: { id: true, status: true, deletedAt: true, totpEnabledAt: true, roles: { include: { role: { include: { permissions: { include: { permission: true } } } } } } } }),
        this.db.session.findFirst({ where: { id: claims.sid, userId: claims.sub, revokedAt: null, expiresAt: { gt: new Date() } }, select: { id: true } })
      ]);
      if (!user || user.status !== "ACTIVE" || user.deletedAt || !session) throw new UnauthorizedException("Sign in required");
      if (Date.now() - (this.lastSeenWrites.get(session.id) || 0) > 60_000) {
        this.lastSeenWrites.set(session.id, Date.now());
        void this.db.session.updateMany({ where: { id: session.id, revokedAt: null }, data: { lastSeenAt: new Date() } }).catch(() => undefined);
      }
      const permissions = user.roles.flatMap((r) => r.role.permissions.map((p) => p.permission.key));
      req.authUser = { id: user.id, sessionId: session.id, permissions, totpComplete: !!user.totpEnabledAt };
      if (req.path.includes("/admin") && !user.totpEnabledAt) throw new ForbiddenException("Set up two-step verification before using admin tools");
      return true;
    } catch (error) { if (error instanceof HttpException) throw error; throw new UnauthorizedException("Sign in required"); }
  }
}

@Injectable()
export class PermissionGuard implements CanActivate {
  private cache = new Map<string, { expires: number; permissions: Set<string> }>();
  constructor(@Inject(Reflector) private reflector: Reflector, @Inject(PrismaService) private db: PrismaService) {}
  invalidate(userId?: string) { if (userId) this.cache.delete(userId); else this.cache.clear(); }
  async canActivate(context: ExecutionContext) {
    const needed = this.reflector.getAllAndOverride<string[]>(PERMISSIONS_KEY, [context.getHandler(), context.getClass()]) || [];
    if (!needed.length) return true;
    const req = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const auth = req.authUser;
    if (!auth) throw new UnauthorizedException("Sign in required");
    let entry = this.cache.get(auth.id);
    if (!entry || entry.expires < Date.now()) {
      const rows = await this.db.userRole.findMany({ where: { userId: auth.id }, select: { role: { select: { permissions: { select: { permission: { select: { key: true } } } } } } } });
      entry = { expires: Date.now() + 30_000, permissions: new Set(rows.flatMap((r) => r.role.permissions.map((p) => p.permission.key))) };
      this.cache.set(auth.id, entry);
    }
    if (!hasRequiredPermissions(entry!.permissions, needed)) throw new ForbiddenException("Permission required");
    return true;
  }
}

@Injectable()
export class CsrfGuard implements CanActivate {
  canActivate(context: ExecutionContext) {
    const req = context.switchToHttp().getRequest<Request>();
    if (["GET", "HEAD", "OPTIONS"].includes(req.method)) return true;
    if (req.cookies?.access_token || req.cookies?.refresh_token) {
      const cookie = req.cookies?.csrf_token;
      const header = req.headers["x-csrf-token"];
      if (typeof cookie !== "string" || typeof header !== "string" || !safeEqual(cookie, header)) throw new ForbiddenException("Request could not be verified");
    }
    return true;
  }
}
