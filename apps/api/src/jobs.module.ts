import { BadRequestException, Body, ConflictException, Controller, ForbiddenException, Get, Inject, Injectable, Module, NotFoundException, Param, Patch, Post, Query, Req, UseGuards } from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import { ArrayMaxSize, IsArray, IsBoolean, IsDateString, IsEnum, IsIn, IsInt, IsNumber, IsOptional, IsString, IsUUID, Length, Matches, Max, Min } from "class-validator";
import type { Request } from "express";
import Redis from "ioredis";
import { env } from "@servicehub/config/env";
import type { Prisma } from "@servicehub/db";
import { AuthModule } from "./auth.module";
import { PrismaService } from "./prisma.service";
import { AccessGuard, AuthenticatedRequest, PermissionGuard, RequirePermissions, digest } from "./security";
import { PrivateObjectStorage } from "./object-storage";
import { isAllowedImage, stripImageExif } from "./technician-primitives";
import { assertBookingTransition, DefaultMatchingStrategy, detectMessageFlags, isExpired, isTechnicianAvailableInWindow, sanitizeMessageText, type BookingActor, type BookingState, type MatchCandidate, type MatchingStrategy } from "./booking-primitives";
import { newUlid } from "./ulid";
import { NoopPaymentGate, type CommissionPreview, type CommissionRuleProvider, type PaymentGate, type PaymentGateBooking } from "./payment-gate";
import { RealtimeHub } from "./realtime-hub";
import { NotificationService } from "./notifications";
import { JobsGateway, JobsSocketAdapter } from "./jobs.gateway";

const ULID = /^[0-7][0-9A-HJKMNP-TV-Z]{25}$/;
const activeBookingStatuses = ["ACCEPTED", "TECHNICIAN_EN_ROUTE", "IN_PROGRESS", "COMPLETED_PENDING_CONFIRMATION"] as const;
const nonterminalRequestStatuses = ["OPEN", "DIRECTED", "QUOTED"] as const;
type UserRequest = AuthenticatedRequest;

class CreateJobRequestDto {
  @IsUUID() serviceId!: string;
  @IsUUID() cityId!: string;
  @IsUUID() areaId!: string;
  @IsOptional() @IsUUID() directTechnicianProfileId?: string;
  @IsString() @Length(2, 200) nearestLandmark!: string;
  @IsString() @Length(20, 3000) description!: string;
  @IsOptional() @IsNumber() @Min(-90) @Max(90) latitude?: number;
  @IsOptional() @IsNumber() @Min(-180) @Max(180) longitude?: number;
  @IsBoolean() isAsap!: boolean;
  @IsOptional() @IsDateString() preferredStartAt?: string;
  @IsOptional() @IsDateString() preferredEndAt?: string;
  @IsOptional() @IsInt() @Min(0) budgetMinKobo?: number;
  @IsOptional() @IsInt() @Min(0) budgetMaxKobo?: number;
  @IsIn(["STANDARD", "URGENT"]) urgency: "STANDARD" | "URGENT" = "STANDARD";
  @IsString() @Length(8, 100) clientIdempotencyKey!: string;
  @IsOptional() @IsArray() @ArrayMaxSize(4) @Matches(ULID, { each: true }) mediaKeys?: string[];
}

class RequestUploadDto {
  @IsIn(["image/jpeg", "image/png", "image/webp"]) contentType!: "image/jpeg" | "image/png" | "image/webp";
  @IsInt() @Min(1) @Max(8_000_000) size!: number;
}

class QuoteDto {
  @IsInt() @Min(1) priceKobo!: number;
  @IsOptional() @IsInt() @Min(0) laborKobo?: number;
  @IsOptional() @IsInt() @Min(0) materialsKobo?: number;
  @IsOptional() @IsDateString() estimatedStartAt?: string;
  @IsOptional() @IsInt() @Min(0) @Max(10080) estimatedArrivalMins?: number;
  @IsOptional() @IsString() @Length(4, 1200) message?: string;
  @IsOptional() @IsInt() @Min(15) @Max(10080) validForMinutes?: number;
  @IsString() @Length(8, 100) clientIdempotencyKey!: string;
}

class AcceptQuoteDto {
  @IsIn(["ONLINE", "CASH"]) paymentMethod!: "ONLINE" | "CASH";
  @IsString() @Length(8, 100) idempotencyKey!: string;
}

class CancelDto {
  @IsString() @Length(8, 100) idempotencyKey!: string;
  @IsString() @Length(2, 60) reasonCode!: string;
  @IsString() @Length(4, 1000) reason!: string;
}

class StatusDto {
  @IsEnum(["TECHNICIAN_EN_ROUTE", "IN_PROGRESS", "COMPLETED_PENDING_CONFIRMATION", "COMPLETED", "DISPUTED"]) status!: "TECHNICIAN_EN_ROUTE" | "IN_PROGRESS" | "COMPLETED_PENDING_CONFIRMATION" | "COMPLETED" | "DISPUTED";
  @IsOptional() @IsString() @Length(4, 1000) reason?: string;
  @IsString() @Length(8, 100) idempotencyKey!: string;
}

class CreateConversationDto { @IsUUID() technicianProfileId!: string; }
class CreateMessageDto {
  @IsString() @Length(8, 100) clientMessageKey!: string;
  @IsOptional() @IsString() @Length(0, 4000) body?: string;
  @IsOptional() @IsArray() @ArrayMaxSize(4) @IsString({ each: true }) attachments?: string[];
}
class AvailabilityDto {
  @IsDateString() startsAt!: string;
  @IsDateString() endsAt!: string;
  @IsOptional() @IsString() @Length(0, 240) reason?: string;
}
class ModerationDto { @IsIn(["REVIEWED", "DISMISSED", "ACTIONED"]) status!: "REVIEWED" | "DISMISSED" | "ACTIONED"; @IsOptional() @IsString() @Length(0, 1000) note?: string; }
class JobSettingsDto { @IsString() @Length(3, 100) key!: string; value!: unknown; }

export interface PaymentGateToken extends PaymentGate {}

@Injectable()
export class DefaultCommissionRuleProvider implements CommissionRuleProvider {
  constructor(@Inject(PrismaService) private db: PrismaService) {}
  async preview(input: { priceKobo: number; serviceId: string; cityId: string }): Promise<CommissionPreview> {
    const row = await this.db.setting.findUnique({ where: { scopeType_scopeId_key: { scopeType: "GLOBAL", scopeId: "global", key: "commission.default_bps" } } });
    const bps = typeof row?.valueJson === "number" && Number.isInteger(row.valueJson) ? Math.max(0, Math.min(10000, row.valueJson)) : 1000;
    return { feeKobo: Math.round(input.priceKobo * bps / 10000), rateBasisPoints: bps, source: "CONFIGURED_DEFAULT" };
  }
}

@Injectable()
export class JobsService {
  private readonly storage = new PrivateObjectStorage();
  private readonly redis = new Redis(env.REDIS_URL, { maxRetriesPerRequest: 1, connectTimeout: 1500, retryStrategy: attempt => attempt > 3 ? null : 250 * attempt });
  private readonly matching: MatchingStrategy = new DefaultMatchingStrategy();
  private expiryTimer?: NodeJS.Timeout;
  private messageNoticeAt = new Map<string, number>();
  constructor(
    @Inject(PrismaService) private db: PrismaService,
    @Inject(NotificationService) private notifications: NotificationService,
    @Inject(RealtimeHub) private realtime: RealtimeHub,
    @Inject("PAYMENT_GATE") private paymentGate: PaymentGate,
    @Inject(DefaultCommissionRuleProvider) private commission: CommissionRuleProvider
  ) {}
  onModuleInit() {
    void this.storage.ensureBucket().catch(() => undefined);
    this.expiryTimer = setInterval(() => void this.runScheduledJobs().catch(() => undefined), 30_000);
    this.expiryTimer.unref();
  }
  async onModuleDestroy() { if (this.expiryTimer) clearInterval(this.expiryTimer); await this.redis.quit().catch(() => undefined); }

  private async audit(req: Request, actor: string | undefined, action: string, entityType: string, entityId: string, metadata?: object) {
    await this.db.auditLog.create({ data: { actorUserId: actor, action, entityType, entityId, ipHash: req.ip ? digest(req.ip) : null, userAgent: String(req.headers["user-agent"] || "").slice(0, 500), metadata } });
  }
  private async setting<T>(key: string, fallback: T): Promise<T> {
    const row = await this.db.setting.findUnique({ where: { scopeType_scopeId_key: { scopeType: "GLOBAL", scopeId: "global", key } } });
    return (row?.valueJson as T | undefined) ?? fallback;
  }
  private async notify(userId: string, event: string, title: string, body: string) {
    try { await this.notifications.sendMarketplaceNotice(userId, event, title, body); }
    catch (error) { console.warn(`Marketplace notice enqueue failed: ${error instanceof Error ? error.name : "delivery_error"}`); }
  }
  private async rateLimit(key: string, limit: number, seconds: number) {
    try {
      const count = await this.redis.incr(key);
      if (count === 1) await this.redis.expire(key, seconds);
      if (count > limit) throw new ConflictException("You are sending requests too quickly. Please wait and try again.");
    } catch (error) { if (error instanceof ConflictException) throw error; throw new ConflictException("This action is temporarily unavailable. Please retry."); }
  }
  private async technician(userId: string) {
    const profile = await this.db.technicianProfile.findFirst({ where: { userId, deletedAt: null } });
    if (!profile) throw new ForbiddenException("Technician profile required");
    return profile;
  }
  private async requireApprovedTechnician(userId: string) {
    const profile = await this.technician(userId);
    if (!["APPROVED", "REACTIVATED"].includes(profile.approvalStatus)) throw new ForbiddenException("Your technician profile is not approved to accept jobs");
    return profile;
  }
  private async lockRequest(tx: Prisma.TransactionClient, id: string) {
    const rows = await tx.$queryRaw<Array<{ id: string }>>`SELECT id FROM job_requests WHERE id = ${id} FOR UPDATE`;
    if (!rows.length) throw new NotFoundException("Request not found");
  }
  private async eligibleMatches(input: { cityId: string; serviceId: string; areaId: string; directTechnicianProfileId?: string | null; isAsap: boolean; startAt: Date; endAt: Date; latitude?: number | null; longitude?: number | null; now?: Date }) {
    const now = input.now || new Date();
    const profiles = await this.db.technicianProfile.findMany({
      where: { cityId: input.cityId, approvalStatus: { in: ["APPROVED", "REACTIVATED"] }, deletedAt: null, user: { status: "ACTIVE", deletedAt: null }, skills: { some: { serviceId: input.serviceId } }, areas: { some: { areaId: input.areaId } }, ...(input.directTechnicianProfileId ? { id: input.directTechnicianProfileId } : {}) },
      include: { user: { select: { id: true, displayName: true } }, areas: { include: { area: { select: { id: true, name: true, centerLat: true, centerLng: true } } } }, availabilityBlocks: { where: { endsAt: { gt: now } }, select: { startsAt: true, endsAt: true } }, bookings: { where: { status: { in: [...activeBookingStatuses] }, scheduledEndAt: { gt: now } }, select: { scheduledStartAt: true, scheduledEndAt: true } } }
    });
    const day = new Intl.DateTimeFormat("en-US", { weekday: "short", timeZone: "Africa/Lagos" }).format(input.startAt);
    const mapped = profiles.filter(profile => {
      const weekly = profile.weeklyAvailability as Record<string, unknown> | null;
      if (weekly?.[day] === false) return false;
      return isTechnicianAvailableInWindow(input.startAt, input.endAt, profile.availabilityBlocks, profile.bookings.map(booking => ({ startsAt: booking.scheduledStartAt, endsAt: booking.scheduledEndAt })));
    }).map(profile => {
      let distanceMeters: number | null = null;
      if (input.latitude != null && input.longitude != null) {
        const centers = profile.areas.map(x => x.area).filter(area => area.centerLat != null && area.centerLng != null);
        if (centers.length) distanceMeters = Math.min(...centers.map(area => haversineMeters(input.latitude!, input.longitude!, Number(area.centerLat), Number(area.centerLng))));
      }
      return { profile, distanceMeters, id: profile.id, ratingAverage: 0, responseRate: 0, lastActiveAt: profile.updatedAt };
    });
    return this.matching.rank(mapped);
  }
  private scheduledWindow(input: { isAsap: boolean; preferredStartAt?: Date | null; preferredEndAt?: Date | null }, quote?: { estimatedStartAt: Date | null; estimatedArrivalMins: number | null }, now = new Date()) {
    if (!input.isAsap && input.preferredStartAt && input.preferredEndAt) return { start: input.preferredStartAt, end: input.preferredEndAt };
    const start = quote?.estimatedStartAt || new Date(now.getTime() + (quote?.estimatedArrivalMins || 0) * 60_000);
    return { start, end: new Date(start.getTime() + 120 * 60_000) };
  }
  private async validateAndSanitizeObject(key: string, prefix: string) {
    if (!key.startsWith(prefix)) throw new ForbiddenException("That upload does not belong to this request");
    const metadata = await this.storage.metadata(key);
    if (!metadata.size || metadata.size > 8_000_000) throw new BadRequestException("Image is empty or too large");
    const bytes = await this.storage.read(key);
    if (!isAllowedImage(metadata.type, bytes)) throw new BadRequestException("Image contents do not match the selected file type");
    const safe = stripImageExif(metadata.type, bytes);
    if (safe.length !== bytes.length) await this.storage.write(key, safe, metadata.type);
    return { size: safe.length, contentType: metadata.type };
  }

  async signRequestImage(userId: string, dto: RequestUploadDto) {
    if (dto.size > 8_000_000) throw new BadRequestException("Choose an image smaller than 8 MB");
    const key = this.storage.newObjectKey(`job-requests/${userId}`, dto.contentType.split("/")[1]!.replace("jpeg", "jpg"));
    return { uploadUrl: this.storage.presignPut(key), objectKey: key, contentType: dto.contentType, maxBytes: 8_000_000, expiresInSeconds: 300 };
  }
  async createRequest(userId: string, dto: CreateJobRequestDto, req: Request) {
    await this.rateLimit(`request:create:${userId}`, 5, 3600);
    if ((dto.latitude == null) !== (dto.longitude == null)) throw new BadRequestException("Add both map pin coordinates or leave both blank");
    if (!dto.isAsap && (!dto.preferredStartAt || !dto.preferredEndAt || new Date(dto.preferredEndAt) <= new Date(dto.preferredStartAt))) throw new BadRequestException("Choose a valid preferred time window or choose ASAP");
    if (dto.budgetMinKobo != null && dto.budgetMaxKobo != null && dto.budgetMinKobo > dto.budgetMaxKobo) throw new BadRequestException("Minimum budget cannot be above the maximum");
    const existing = await this.db.jobRequest.findUnique({ where: { customerId_clientIdempotencyKey: { customerId: userId, clientIdempotencyKey: dto.clientIdempotencyKey } } });
    if (existing) return this.requestDetail(userId, existing.id, "USER");
    const [service, area, city] = await Promise.all([
      this.db.service.findFirst({ where: { id: dto.serviceId, isActive: true, cities: { some: { cityId: dto.cityId, isActive: true } }, category: { cityFlags: { some: { cityId: dto.cityId, enabled: true } } } } }),
      this.db.area.findFirst({ where: { id: dto.areaId, cityId: dto.cityId, isActive: true } }),
      this.db.city.findFirst({ where: { id: dto.cityId, isActive: true } })
    ]);
    if (!service || !area || !city) throw new BadRequestException("Choose an active service and area in the same city");
    const media = [];
    for (const [index, key] of (dto.mediaKeys || []).entries()) media.push({ objectKey: key, sortOrder: index, ...await this.validateAndSanitizeObject(key, `job-requests/${userId}/`) });
    const now = new Date();
    const startAt = dto.isAsap ? now : new Date(dto.preferredStartAt!);
    const endAt = dto.isAsap ? new Date(now.getTime() + 120 * 60_000) : new Date(dto.preferredEndAt!);
    const data = await this.db.jobRequest.create({ data: {
      id: newUlid(), customerId: userId, serviceId: dto.serviceId, cityId: dto.cityId, areaId: dto.areaId, directTechnicianProfileId: dto.directTechnicianProfileId || null,
      nearestLandmark: dto.nearestLandmark.trim(), description: dto.description.trim(), latitude: dto.latitude ?? null, longitude: dto.longitude ?? null, isAsap: dto.isAsap,
      preferredStartAt: dto.isAsap ? null : new Date(dto.preferredStartAt!), preferredEndAt: dto.isAsap ? null : new Date(dto.preferredEndAt!), budgetMinKobo: dto.budgetMinKobo ?? null, budgetMaxKobo: dto.budgetMaxKobo ?? null,
      urgency: dto.urgency, status: dto.directTechnicianProfileId ? "DIRECTED" : "OPEN", expiresAt: new Date(now.getTime() + await this.setting("request.expiry_hours", 24) * 3_600_000), clientIdempotencyKey: dto.clientIdempotencyKey,
      media: { create: media.map(item => ({ id: newUlid(), objectKey: item.objectKey, contentType: item.contentType, sizeBytes: item.size, sortOrder: item.sortOrder })) }
    } });
    await this.audit(req, userId, "job_request.created", "job_request", data.id, { serviceId: dto.serviceId, areaId: dto.areaId, direct: !!dto.directTechnicianProfileId, mediaCount: media.length });
    const matched = await this.eligibleMatches({ cityId: dto.cityId, serviceId: dto.serviceId, areaId: dto.areaId, directTechnicianProfileId: dto.directTechnicianProfileId, isAsap: dto.isAsap, startAt, endAt, latitude: dto.latitude, longitude: dto.longitude });
    const limit = Math.max(1, Math.min(50, await this.setting("matching.top_n", 10)));
    const perHour = Math.max(1, Math.min(100, await this.setting("matching.technician_hourly_limit", 3)));
    const notified: string[] = [];
    for (const match of matched.slice(0, limit)) {
      const recent = await this.db.notification.count({ where: { userId: match.profile.userId, templateKey: "marketplace.job_match", createdAt: { gte: new Date(Date.now() - 3_600_000) } } });
      if (recent >= perHour) continue;
      await this.notify(match.profile.userId, "job_match", "A service request near you", `${service.name} in ${area.name}. Send a quote if you are available.`);
      this.realtime.toUser(match.profile.userId, "request:match", { requestId: data.id, serviceName: service.name, areaName: area.name, urgency: data.urgency });
      notified.push(match.profile.id);
    }
    return { ...(await this.requestDetail(userId, data.id, "USER")), matchCount: matched.length, notifiedCount: notified.length };
  }
  async requestDetail(userId: string, requestId: string, mode?: "USER" | "TECHNICIAN") {
    const row = await this.db.jobRequest.findUnique({ where: { id: requestId }, include: { service: { select: { id: true, name: true, slug: true } }, city: { select: { id: true, name: true, slug: true } }, area: { select: { id: true, name: true } }, media: { where: { deletedAt: null }, orderBy: { sortOrder: "asc" }, select: { id: true, objectKey: true, contentType: true, sizeBytes: true } }, quotes: { where: { status: "ACTIVE" }, select: { id: true, technicianProfileId: true } }, booking: { select: { id: true, status: true } } } });
    if (!row || row.deletedAt) throw new NotFoundException("Request not found");
    if (row.customerId !== userId) {
      const profile = await this.technician(userId);
      const ownQuote = await this.db.quote.findFirst({ where: { jobRequestId: row.id, technicianProfileId: profile.id } });
      const activeMatch = ["APPROVED", "REACTIVATED"].includes(profile.approvalStatus) && profile.cityId === row.cityId && (await this.db.technicianSkill.count({ where: { profileId: profile.id, serviceId: row.serviceId } }) > 0) && (await this.db.technicianArea.count({ where: { profileId: profile.id, areaId: row.areaId } }) > 0);
      if (row.directTechnicianProfileId !== profile.id && !ownQuote && !activeMatch) throw new ForbiddenException("This request is not available to your profile");
    } else if (mode === "TECHNICIAN") throw new ForbiddenException("Only technicians can use this request view");
    return { id: row.id, status: row.status, service: row.service, city: row.city, area: row.area, nearestLandmark: row.nearestLandmark, description: row.description, latitude: row.latitude, longitude: row.longitude, isAsap: row.isAsap, preferredStartAt: row.preferredStartAt, preferredEndAt: row.preferredEndAt, budgetMinKobo: row.budgetMinKobo, budgetMaxKobo: row.budgetMaxKobo, urgency: row.urgency, expiresAt: row.expiresAt, media: row.media.map(m => ({ ...m, url: this.storage.signedDownload(m.objectKey) })), activeQuoteCount: row.quotes.length, booking: row.booking };
  }
  async myRequests(userId: string) { return this.db.jobRequest.findMany({ where: { customerId: userId, deletedAt: null }, orderBy: { createdAt: "desc" }, take: 50, select: { id: true, status: true, nearestLandmark: true, urgency: true, createdAt: true, expiresAt: true, service: { select: { name: true } }, area: { select: { name: true } }, _count: { select: { quotes: true } } } }); }
  async technicianFeed(userId: string) {
    const profile = await this.requireApprovedTechnician(userId);
    const startAt = new Date(); const endAt = new Date(startAt.getTime() + 120 * 60_000);
    const requests = await this.db.jobRequest.findMany({ where: { cityId: profile.cityId || "", areaId: { in: (await this.db.technicianArea.findMany({ where: { profileId: profile.id }, select: { areaId: true } })).map(row => row.areaId) }, status: { in: ["OPEN", "DIRECTED", "QUOTED"] }, deletedAt: null, expiresAt: { gt: new Date() }, OR: [{ directTechnicianProfileId: profile.id }, { directTechnicianProfileId: null }] }, include: { service: { select: { id: true, name: true } }, area: { select: { id: true, name: true } }, quotes: { where: { technicianProfileId: profile.id }, select: { id: true, status: true, priceKobo: true } } }, orderBy: { createdAt: "desc" }, take: 50 });
    const feed = [];
    for (const request of requests) {
      const matches = await this.eligibleMatches({ cityId: request.cityId, serviceId: request.serviceId, areaId: request.areaId, directTechnicianProfileId: request.directTechnicianProfileId, isAsap: request.isAsap, startAt: request.preferredStartAt || startAt, endAt: request.preferredEndAt || endAt, latitude: request.latitude == null ? null : Number(request.latitude), longitude: request.longitude == null ? null : Number(request.longitude) });
      if (matches.some(match => match.profile.id === profile.id)) feed.push({ id: request.id, status: request.status, service: request.service, area: request.area, nearestLandmark: request.nearestLandmark, description: request.description, urgency: request.urgency, isAsap: request.isAsap, preferredStartAt: request.preferredStartAt, preferredEndAt: request.preferredEndAt, expiresAt: request.expiresAt, myQuotes: request.quotes });
    }
    return feed;
  }
  async createQuote(userId: string, requestId: string, dto: QuoteDto, req: Request) {
    await this.rateLimit(`quote:create:${userId}`, 10, 3600);
    const profile = await this.requireApprovedTechnician(userId);
    if (dto.laborKobo != null && dto.laborKobo > dto.priceKobo || dto.materialsKobo != null && dto.materialsKobo > dto.priceKobo) throw new BadRequestException("Quote breakdown cannot exceed the total price");
    const request = await this.db.jobRequest.findUnique({ where: { id: requestId } });
    if (!request || request.deletedAt) throw new NotFoundException("Request not found");
    if (isExpired(request.expiresAt)) throw new ConflictException("This request has expired");
    await this.assertTechnicianMatched(profile.id, request);
    const existingByKey = await this.db.quote.findUnique({ where: { clientIdempotencyKey: dto.clientIdempotencyKey } });
    if (existingByKey) return this.quoteResponse(userId, requestId);
    const quote = await this.db.$transaction(async tx => {
      await this.lockRequest(tx, requestId);
      const currentRequest = await tx.jobRequest.findUnique({ where: { id: requestId } });
      if (!currentRequest || !nonterminalRequestStatuses.includes(currentRequest.status as never) || isExpired(currentRequest.expiresAt)) throw new ConflictException("This request can no longer receive quotes");
      const current = await tx.quote.findFirst({ where: { jobRequestId: requestId, technicianProfileId: profile.id, status: "ACTIVE" } });
      const validUntil = new Date(Date.now() + Math.max(15, Math.min(10080, dto.validForMinutes || await this.setting("quote.expiry_hours", 24) * 60)) * 60_000);
      const values = { priceKobo: dto.priceKobo, laborKobo: dto.laborKobo ?? null, materialsKobo: dto.materialsKobo ?? null, message: dto.message ? sanitizeMessageText(dto.message) : null, estimatedStartAt: dto.estimatedStartAt ? new Date(dto.estimatedStartAt) : null, estimatedArrivalMins: dto.estimatedArrivalMins ?? null, validUntil, version: (current?.version || 0) + 1, activeSlot: "ACTIVE", status: "ACTIVE" as const };
      let updated;
      if (current) {
        await tx.quoteRevision.create({ data: { id: newUlid(), quoteId: current.id, version: current.version, snapshot: quoteSnapshot(current) } });
        updated = await tx.quote.update({ where: { id: current.id }, data: { ...values, clientIdempotencyKey: dto.clientIdempotencyKey } });
      } else {
        updated = await tx.quote.create({ data: { id: newUlid(), jobRequestId: requestId, technicianProfileId: profile.id, ...values, clientIdempotencyKey: dto.clientIdempotencyKey } });
      }
      if (currentRequest.status !== "QUOTED") await tx.jobRequest.update({ where: { id: requestId }, data: { status: "QUOTED" } });
      await tx.quoteRevision.create({ data: { id: newUlid(), quoteId: updated.id, version: updated.version, snapshot: quoteSnapshot(updated) } });
      return updated;
    });
    await this.ensureConversation(requestId, profile.id);
    await this.audit(req, userId, "quote.submitted", "quote", quote.id, { version: quote.version });
    const requestOwner = await this.db.jobRequest.findUniqueOrThrow({ where: { id: requestId }, select: { customerId: true, service: { select: { name: true } } } });
    await this.notify(requestOwner.customerId, "quote_received", "A technician sent a quote", `You have a new quote for ${requestOwner.service.name}. Compare the details before choosing.`);
    this.realtime.toUser(requestOwner.customerId, "quote:new", { requestId, quoteId: quote.id, priceKobo: quote.priceKobo, currencyCode: "NGN" });
    return { id: quote.id, jobRequestId: quote.jobRequestId, version: quote.version, status: quote.status, priceKobo: quote.priceKobo, laborKobo: quote.laborKobo, materialsKobo: quote.materialsKobo, message: quote.message, estimatedStartAt: quote.estimatedStartAt, estimatedArrivalMins: quote.estimatedArrivalMins, validUntil: quote.validUntil };
  }
  private async assertTechnicianMatched(profileId: string, request: { cityId: string; serviceId: string; areaId: string; directTechnicianProfileId: string | null }) {
    const profile = await this.db.technicianProfile.findUniqueOrThrow({ where: { id: profileId }, select: { cityId: true, approvalStatus: true, deletedAt: true } });
    const [skill, area] = await Promise.all([this.db.technicianSkill.count({ where: { profileId, serviceId: request.serviceId } }), this.db.technicianArea.count({ where: { profileId, areaId: request.areaId } })]);
    if (profile.deletedAt || !["APPROVED", "REACTIVATED"].includes(profile.approvalStatus) || profile.cityId !== request.cityId || !skill || !area || request.directTechnicianProfileId && request.directTechnicianProfileId !== profileId) throw new ForbiddenException("This request does not match your approved services and areas");
  }
  async quoteResponse(userId: string, requestId: string) {
    const request = await this.db.jobRequest.findUniqueOrThrow({
      where: { id: requestId },
      include: {
        area: true,
        quotes: {
          where: { status: "ACTIVE" },
          orderBy: { createdAt: "desc" },
          include: { technician: { include: { user: { select: { displayName: true } }, areas: { include: { area: true } } } } }
        }
      }
    });
    if (request.customerId !== userId) throw new ForbiddenException("Only the request owner can compare quotes");
    const rule = await this.commission.preview({ priceKobo: 0, serviceId: request.serviceId, cityId: request.cityId });
    return request.quotes.map(quote => {
      const area = quote.technician.areas.find(x => x.areaId === request.areaId)?.area;
      let distanceMeters: number | null = null;
      if (request.latitude != null && request.longitude != null && area?.centerLat != null && area.centerLng != null) distanceMeters = haversineMeters(Number(request.latitude), Number(request.longitude), Number(area.centerLat), Number(area.centerLng));
      return { id: quote.id, version: quote.version, priceKobo: quote.priceKobo, platformFeePreviewKobo: Math.round(quote.priceKobo * rule.rateBasisPoints / 10000), currencyCode: "NGN", laborKobo: quote.laborKobo, materialsKobo: quote.materialsKobo, message: quote.message, estimatedStartAt: quote.estimatedStartAt, estimatedArrivalMins: quote.estimatedArrivalMins, validUntil: quote.validUntil, technician: { profileId: quote.technicianProfileId, displayName: quote.technician.user.displayName, verified: true, rating: { average: null, count: 0 }, completedJobCount: 0, areaName: area?.name || null, distanceMeters } };
    });
  }

  async acceptQuote(userId: string, quoteId: string, dto: AcceptQuoteDto, req: Request) {
    const existingByKey = await this.db.booking.findUnique({ where: { acceptIdempotencyKey: dto.idempotencyKey } });
    if (existingByKey) { if (existingByKey.customerId !== userId) throw new ForbiddenException("Booking not found"); return this.bookingDetail(userId, existingByKey.id); }
    const result = await this.db.$transaction(async tx => {
      const quoteStub = await tx.quote.findUnique({ where: { id: quoteId }, select: { jobRequestId: true } });
      if (!quoteStub) throw new NotFoundException("Quote not found");
      await this.lockRequest(tx, quoteStub.jobRequestId);
      const request = await tx.jobRequest.findUnique({ where: { id: quoteStub.jobRequestId }, include: { booking: true } });
      if (!request || request.customerId !== userId) throw new ForbiddenException("Quote not found");
      if (request.booking) {
        if (request.booking.acceptIdempotencyKey === dto.idempotencyKey) return request.booking;
        throw new ConflictException("A quote has already been accepted for this request");
      }
      const quote = await tx.quote.findUnique({ where: { id: quoteId }, include: { technician: { include: { user: true, bookings: true } } } });
      if (!quote || quote.jobRequestId !== request.id || quote.status !== "ACTIVE" || quote.activeSlot !== "ACTIVE" || isExpired(quote.validUntil) || isExpired(request.expiresAt) || !nonterminalRequestStatuses.includes(request.status as never)) throw new ConflictException("This quote is no longer available");
      if (!["APPROVED", "REACTIVATED"].includes(quote.technician.approvalStatus) || quote.technician.deletedAt || quote.technician.user.status !== "ACTIVE") throw new ConflictException("This technician is no longer available");
      await tx.$queryRaw`SELECT id FROM technician_profiles WHERE id = ${quote.technicianProfileId}::uuid FOR UPDATE`;
      const maxActive = Math.max(1, Math.min(100, await this.setting("booking.max_active_per_technician", 3)));
      const currentActive = await tx.booking.count({ where: { technicianProfileId: quote.technicianProfileId, status: { in: [...activeBookingStatuses] } } });
      if (currentActive >= maxActive) throw new ConflictException("This technician has reached the current active booking limit");
      const { start, end } = this.scheduledWindow({ isAsap: request.isAsap, preferredStartAt: request.preferredStartAt, preferredEndAt: request.preferredEndAt }, quote);
      if (!await this.setting("booking.allow_overlapping", false)) {
        const collision = await tx.booking.count({ where: { technicianProfileId: quote.technicianProfileId, status: { in: [...activeBookingStatuses] }, scheduledStartAt: { lt: end }, scheduledEndAt: { gt: start } } });
        if (collision) throw new ConflictException("This technician is already booked in that time window");
      }
      const fee = await this.commission.preview({ priceKobo: quote.priceKobo, serviceId: request.serviceId, cityId: request.cityId });
      const id = newUlid();
      const payment: PaymentGateBooking = { id, paymentMethod: dto.paymentMethod, priceKobo: quote.priceKobo, platformFeePreviewKobo: fee.feeKobo, currencyCode: "NGN" };
      if (!await this.paymentGate.canAccept(payment)) throw new ConflictException("This payment method is not available right now");
      const booking = await tx.booking.create({ data: { id, jobRequestId: request.id, quoteId: quote.id, customerId: userId, technicianProfileId: quote.technicianProfileId, status: "QUOTED", paymentMethod: dto.paymentMethod, priceKobo: quote.priceKobo, platformFeePreviewKobo: fee.feeKobo, currencyCode: "NGN", commissionRuleSnapshot: { rateBasisPoints: fee.rateBasisPoints, source: fee.source }, acceptIdempotencyKey: dto.idempotencyKey, scheduledStartAt: start, scheduledEndAt: end } });
      await tx.bookingStatusHistory.createMany({ data: [
        { id: newUlid(), bookingId: id, fromStatus: "REQUESTED", toStatus: "QUOTED", actorRole: "SYSTEM", reason: "A technician quote was selected" },
        { id: newUlid(), bookingId: id, fromStatus: "QUOTED", toStatus: "ACCEPTED", actorUserId: userId, actorRole: "USER" }
      ] });
      await tx.booking.update({ where: { id }, data: { status: "ACCEPTED" } });
      await tx.jobRequest.update({ where: { id: request.id }, data: { status: "ACCEPTED" } });
      await tx.quote.update({ where: { id: quote.id }, data: { status: "ACCEPTED", activeSlot: null } });
      const notSelected = await tx.quote.findMany({ where: { jobRequestId: request.id, id: { not: quote.id }, status: "ACTIVE" }, select: { technicianProfileId: true, technician: { select: { userId: true } } } });
      await tx.quote.updateMany({ where: { jobRequestId: request.id, id: { not: quote.id }, status: "ACTIVE" }, data: { status: "NOT_SELECTED", activeSlot: null } });
      await this.ensureConversationInTx(tx, request.id, quote.technicianProfileId, id, userId, quote.technician.userId);
      return { booking, notifyTechnicianUserId: quote.technician.userId, notSelected };
    }, { isolationLevel: "Serializable", timeout: 10_000 });
    if ("notifyTechnicianUserId" in result) {
      const booking = result.booking;
      await this.paymentGate.onAccepted({ id: booking.id, paymentMethod: booking.paymentMethod, priceKobo: booking.priceKobo, platformFeePreviewKobo: booking.platformFeePreviewKobo, currencyCode: booking.currencyCode }).catch(() => undefined);
      await this.notify(result.notifyTechnicianUserId, "quote_accepted", "Your quote was accepted", "The customer chose your quote. Open the booking to confirm the next step.");
      this.realtime.toUser(result.notifyTechnicianUserId, "quote:accepted", { quoteId, bookingId: booking.id, status: "ACCEPTED" });
      for (const item of result.notSelected) {
        await this.notify(item.technician.userId, "quote_not_selected", "The request was booked", "The customer chose another quote. Thank you for responding.");
        this.realtime.toUser(item.technician.userId, "quote:not_selected", { quoteId, requestId: booking.jobRequestId });
      }
      await this.audit(req, userId, "quote.accepted", "booking", booking.id, { quoteId, paymentMethod: dto.paymentMethod });
      return this.bookingDetail(userId, booking.id);
    }
    return this.bookingDetail(userId, result.id);
  }
  private async ensureConversationInTx(tx: any, requestId: string, technicianProfileId: string, bookingId: string | undefined, userId: string, technicianUserId: string) {
    const conversation = await tx.conversation.upsert({ where: { jobRequestId_technicianProfileId: { jobRequestId: requestId, technicianProfileId } }, update: bookingId ? { bookingId } : {}, create: { id: newUlid(), jobRequestId: requestId, technicianProfileId, bookingId } });
    await tx.conversationParticipant.upsert({ where: { conversationId_userId: { conversationId: conversation.id, userId } }, update: {}, create: { conversationId: conversation.id, userId, role: "USER" } });
    await tx.conversationParticipant.upsert({ where: { conversationId_userId: { conversationId: conversation.id, userId: technicianUserId } }, update: {}, create: { conversationId: conversation.id, userId: technicianUserId, role: "TECHNICIAN" } });
    return conversation;
  }
  private async ensureConversation(requestId: string, technicianProfileId: string, bookingId?: string) {
    const request = await this.db.jobRequest.findUniqueOrThrow({ where: { id: requestId }, select: { customerId: true } });
    const technician = await this.db.technicianProfile.findUniqueOrThrow({ where: { id: technicianProfileId }, select: { userId: true } });
    return this.db.$transaction(tx => this.ensureConversationInTx(tx, requestId, technicianProfileId, bookingId, request.customerId, technician.userId));
  }

  async cancelRequest(userId: string, requestId: string, dto: CancelDto, req: Request) {
    const result = await this.db.$transaction(async tx => {
      await this.lockRequest(tx, requestId);
      const row = await tx.jobRequest.findUnique({ where: { id: requestId }, include: { booking: true } });
      if (!row || row.customerId !== userId) throw new NotFoundException("Request not found");
      if (row.booking) throw new ConflictException("This request has a booking. Use the booking cancellation flow.");
      if (!["OPEN", "DIRECTED", "QUOTED"].includes(row.status)) throw new ConflictException("This request can no longer be cancelled");
      const duplicate = await tx.cancellation.findUnique({ where: { clientIdempotencyKey: dto.idempotencyKey } });
      if (duplicate) return row;
      await tx.jobRequest.update({ where: { id: row.id }, data: { status: "CANCELLED_BY_USER" } });
      await tx.quote.updateMany({ where: { jobRequestId: row.id, status: "ACTIVE" }, data: { status: "WITHDRAWN", activeSlot: null } });
      await tx.cancellation.create({ data: { id: newUlid(), jobRequestId: row.id, actorUserId: userId, reasonCode: dto.reasonCode, reason: sanitizeMessageText(dto.reason), clientIdempotencyKey: dto.idempotencyKey } });
      return row;
    });
    await this.audit(req, userId, "job_request.cancelled", "job_request", result.id, { reasonCode: dto.reasonCode });
    return { id: result.id, status: "CANCELLED_BY_USER" };
  }
  async bookingDetail(userId: string, bookingId: string) {
    const row = await this.db.booking.findUnique({ where: { id: bookingId }, include: { request: { include: { service: { select: { name: true } }, area: { select: { name: true } } } }, history: { orderBy: { createdAt: "asc" } }, cancellation: true, technician: { select: { userId: true, user: { select: { displayName: true } } } } } });
    if (!row || (row.customerId !== userId && row.technician.userId !== userId)) throw new NotFoundException("Booking not found");
    return { id: row.id, status: row.status, paymentMethod: row.paymentMethod, priceKobo: row.priceKobo, platformFeePreviewKobo: row.platformFeePreviewKobo, currencyCode: row.currencyCode, scheduledStartAt: row.scheduledStartAt, scheduledEndAt: row.scheduledEndAt, acceptedAt: row.acceptedAt, completedByTechnicianAt: row.completedByTechnicianAt, confirmedCompletedAt: row.confirmedCompletedAt, service: row.request.service, area: row.request.area, nearestLandmark: row.request.nearestLandmark, technician: { displayName: row.technician.user.displayName, verified: true }, history: row.history.map(h => ({ fromStatus: h.fromStatus, toStatus: h.toStatus, actorRole: h.actorRole, reason: h.reason, createdAt: h.createdAt })), cancellation: row.cancellation ? { reasonCode: row.cancellation.reasonCode, reason: row.cancellation.reason, isLate: row.cancellation.isLate, createdAt: row.cancellation.createdAt } : null };
  }
  async myBookings(userId: string) {
    const profile = await this.db.technicianProfile.findUnique({ where: { userId }, select: { id: true } });
    return this.db.booking.findMany({ where: { OR: [{ customerId: userId }, ...(profile ? [{ technicianProfileId: profile.id }] : [])] }, orderBy: { updatedAt: "desc" }, take: 50, select: { id: true, status: true, paymentMethod: true, priceKobo: true, scheduledStartAt: true, scheduledEndAt: true, request: { select: { service: { select: { name: true } }, area: { select: { name: true } }, nearestLandmark: true } } } });
  }
  async changeBookingStatus(userId: string, bookingId: string, dto: StatusDto, req: Request) {
    const duplicate = await this.db.bookingStatusHistory.findFirst({ where: { clientActionKey: dto.idempotencyKey, bookingId } });
    if (duplicate) return this.bookingDetail(userId, bookingId);
    const row = await this.db.$transaction(async tx => {
      const stub = await tx.booking.findUnique({ where: { id: bookingId }, select: { jobRequestId: true } });
      if (!stub) throw new NotFoundException("Booking not found");
      await this.lockRequest(tx, stub.jobRequestId);
      await tx.$queryRaw`SELECT id FROM bookings WHERE id = ${bookingId} FOR UPDATE`;
      const booking = await tx.booking.findUnique({ where: { id: bookingId }, include: { technician: { select: { userId: true } } } });
      if (!booking || (booking.customerId !== userId && booking.technician.userId !== userId)) throw new NotFoundException("Booking not found");
      const actor: BookingActor = booking.customerId === userId ? "USER" : "TECHNICIAN";
      assertBookingTransition(booking.status as BookingState, dto.status as BookingState, actor, dto.reason);
      if (actor === "TECHNICIAN" && !["TECHNICIAN_EN_ROUTE", "IN_PROGRESS", "COMPLETED_PENDING_CONFIRMATION"].includes(dto.status)) throw new ForbiddenException("Only the customer can confirm completion or dispute a booking");
      if (actor === "USER" && !["COMPLETED", "DISPUTED"].includes(dto.status)) throw new ForbiddenException("Only the technician can update this booking step");
      const now = new Date();
      const data: Record<string, unknown> = { status: dto.status };
      if (dto.status === "COMPLETED_PENDING_CONFIRMATION") data.completedByTechnicianAt = now;
      if (dto.status === "COMPLETED") data.confirmedCompletedAt = now;
      await tx.booking.update({ where: { id: bookingId }, data: data as never });
      await tx.bookingStatusHistory.create({ data: { id: newUlid(), bookingId, fromStatus: booking.status, toStatus: dto.status, actorUserId: userId, actorRole: actor, reason: dto.reason?.trim() || null, clientActionKey: dto.idempotencyKey } });
      const requestStatus = dto.status === "COMPLETED" ? "COMPLETED" : dto.status === "DISPUTED" ? "DISPUTED" : dto.status.startsWith("CANCELLED") ? dto.status : undefined;
      if (requestStatus) await tx.jobRequest.update({ where: { id: booking.jobRequestId }, data: { status: requestStatus as never } });
      return { booking, actor };
    }, { isolationLevel: "Serializable", timeout: 10_000 });
    if (dto.status === "COMPLETED") await this.paymentGate.onCompleted({ id: row.booking.id, paymentMethod: row.booking.paymentMethod, priceKobo: row.booking.priceKobo, platformFeePreviewKobo: row.booking.platformFeePreviewKobo, currencyCode: row.booking.currencyCode }).catch(() => undefined);
    await this.audit(req, userId, "booking.status.changed", "booking", bookingId, { to: dto.status, actorRole: row.actor });
    const counterpart = row.actor === "USER" ? (await this.db.technicianProfile.findUniqueOrThrow({ where: { id: row.booking.technicianProfileId }, select: { userId: true } })).userId : row.booking.customerId;
    await this.notify(counterpart, "booking_status", "Booking update", `Your booking is now ${dto.status.toLowerCase().replaceAll("_", " ")}.`);
    const conversation = await this.db.conversation.findUnique({ where: { bookingId }, select: { id: true } });
    if (conversation) this.realtime.toConversation(conversation.id, "booking:status", { bookingId, status: dto.status });
    return this.bookingDetail(userId, bookingId);
  }
  async messages(userId: string, conversationId: string, before?: string) {
    const participant = await this.db.conversationParticipant.findUnique({ where: { conversationId_userId: { conversationId, userId } }, include: { conversation: true } });
    if (!participant) throw new NotFoundException("Conversation not found");
    if (!participant.conversation.bookingId && !(await this.db.quote.count({ where: { jobRequestId: participant.conversation.jobRequestId, status: { in: ["ACTIVE", "ACCEPTED"] } } }))) throw new ForbiddenException("Chat opens after a quote is sent");
    const rows = await this.db.message.findMany({ where: { conversationId, deletedAt: null, ...(before ? { createdAt: { lt: new Date(before) } } : {}) }, orderBy: { createdAt: "desc" }, take: 50, select: { id: true, senderId: true, body: true, createdAt: true } });
    await this.db.conversationParticipant.update({ where: { conversationId_userId: { conversationId, userId } }, data: { lastReadAt: new Date() } });
    return { items: rows.reverse(), nextBefore: rows.length ? rows[0]!.createdAt.toISOString() : null };
  }
  async postMessage(userId: string, conversationId: string, dto: CreateMessageDto, _req?: Request, socketId?: string) {
    await this.messages(userId, conversationId);
    await this.rateLimit(`message:${userId}`, await this.setting("message.max_per_minute", 20), 60);
    const body = sanitizeMessageText(dto.body || "");
    if (!body && !dto.attachments?.length) throw new BadRequestException("Write a message or attach an image");
    const prior = await this.db.message.findUnique({ where: { conversationId_senderId_clientMessageKey: { conversationId, senderId: userId, clientMessageKey: dto.clientMessageKey } } });
    if (prior) return prior;
    const flags = detectMessageFlags(body);
    const message = await this.db.$transaction(async tx => {
      const saved = await tx.message.create({ data: { id: newUlid(), conversationId, senderId: userId, clientMessageKey: dto.clientMessageKey, body } });
      if (flags.length) await tx.messageFlag.create({ data: { id: newUlid(), messageId: saved.id, flagTypes: flags } });
      await tx.conversation.update({ where: { id: conversationId }, data: { updatedAt: new Date() } });
      return saved;
    });
    const payload = { id: message.id, conversationId, senderId: userId, body, createdAt: message.createdAt, moderationReminder: flags.length ? "For your protection, keep payments in ServiceHub." : null };
    this.realtime.toConversation(conversationId, "message:new", payload, socketId);
    return payload;
  }
  async cancelBooking(userId: string, bookingId: string, dto: CancelDto, req: Request) {
    const result = await this.db.$transaction(async tx => {
      const stub = await tx.booking.findUnique({ where: { id: bookingId }, select: { jobRequestId: true } }); if (!stub) throw new NotFoundException("Booking not found");
      await this.lockRequest(tx, stub.jobRequestId); await tx.$queryRaw`SELECT id FROM bookings WHERE id = ${bookingId} FOR UPDATE`;
      const booking = await tx.booking.findUnique({ where: { id: bookingId }, include: { technician: { select: { userId: true } } } });
      if (!booking || (booking.customerId !== userId && booking.technician.userId !== userId)) throw new NotFoundException("Booking not found");
      const actor: BookingActor = booking.customerId === userId ? "USER" : "TECHNICIAN"; const status = actor === "USER" ? "CANCELLED_BY_USER" : "CANCELLED_BY_TECHNICIAN";
      const duplicate = await tx.bookingStatusHistory.findFirst({ where: { bookingId, clientActionKey: dto.idempotencyKey } }); if (duplicate) return { booking, actor };
      assertBookingTransition(booking.status as BookingState, status, actor, dto.reason);
      const lateWindow = await this.setting(actor === "USER" ? "booking.cancel_user_before_start_hours" : "booking.cancel_technician_window_hours", 24);
      const isLate = actor === "TECHNICIAN" && Date.now() > booking.acceptedAt.getTime() + lateWindow * 3600000;
      await tx.booking.update({ where: { id: bookingId }, data: { status } }); await tx.jobRequest.update({ where: { id: booking.jobRequestId }, data: { status } });
      await tx.bookingStatusHistory.create({ data: { id: newUlid(), bookingId, fromStatus: booking.status, toStatus: status, actorUserId: userId, actorRole: actor, reason: sanitizeMessageText(dto.reason), clientActionKey: dto.idempotencyKey } });
      await tx.cancellation.create({ data: { id: newUlid(), bookingId, actorUserId: userId, reasonCode: dto.reasonCode, reason: sanitizeMessageText(dto.reason), isLate, clientIdempotencyKey: dto.idempotencyKey } });
      return { booking, actor };
    }, { isolationLevel: "Serializable" });
    await this.paymentGate.onCancelled({ id: result.booking.id, paymentMethod: result.booking.paymentMethod, priceKobo: result.booking.priceKobo, platformFeePreviewKobo: result.booking.platformFeePreviewKobo, currencyCode: result.booking.currencyCode }).catch(() => undefined);
    await this.audit(req, userId, "booking.cancelled", "booking", bookingId, { actor: result.actor }); return this.bookingDetail(userId, bookingId);
  }
  async revealContact(userId: string, bookingId: string, req: Request) {
    const booking = await this.db.booking.findUnique({ where: { id: bookingId }, include: { technician: { include: { user: { select: { id: true, phoneE164: true } } } }, customer: { select: { id: true, phoneE164: true } } } });
    if (!booking || (booking.customerId !== userId && booking.technician.userId !== userId)) throw new NotFoundException("Booking not found");
    const allowed = ["ACCEPTED", "TECHNICIAN_EN_ROUTE", "IN_PROGRESS", "COMPLETED_PENDING_CONFIRMATION"].includes(booking.status) || booking.status === "COMPLETED" && Date.now() <= booking.updatedAt.getTime() + await this.setting("booking.phone_reveal_after_completion_hours", 24) * 3600000;
    if (!allowed) throw new ForbiddenException("Contact details are not available for this booking");
    const other = booking.customerId === userId ? booking.technician.user : booking.customer; if (!other.phoneE164) throw new NotFoundException("Contact details are not available");
    await this.audit(req, userId, "booking.contact.revealed", "booking", bookingId, { counterpartUserId: other.id }); return { phoneNumber: other.phoneE164 };
  }
  async listConversations(userId: string) {
    return this.db.conversation.findMany({
      where: { participants: { some: { userId } } }, orderBy: { updatedAt: "desc" }, take: 50,
      include: { request: { select: { id: true, status: true, service: { select: { name: true } }, area: { select: { name: true } } } }, messages: { orderBy: { createdAt: "desc" }, take: 1, select: { body: true, createdAt: true } } }
    });
  }
  async signChatImage(userId: string, conversationId: string, dto: RequestUploadDto) { await this.messages(userId, conversationId); if (dto.size > 8_000_000) throw new BadRequestException("Choose an image smaller than 8 MB"); const objectKey = this.storage.newObjectKey(`messages/${conversationId}/${userId}`, dto.contentType.split("/")[1]!.replace("jpeg", "jpg")); return { uploadUrl: this.storage.presignPut(objectKey), objectKey, contentType: dto.contentType, expiresInSeconds: 300 }; }
  async availabilityBlocks(userId: string) { const profile = await this.technician(userId); return this.db.technicianAvailabilityBlock.findMany({ where: { technicianProfileId: profile.id, endsAt: { gt: new Date() } }, orderBy: { startsAt: "asc" } }); }
  async createAvailabilityBlock(userId: string, dto: AvailabilityDto) { const profile = await this.technician(userId); const startsAt = new Date(dto.startsAt), endsAt = new Date(dto.endsAt); if (startsAt <= new Date() || endsAt <= startsAt) throw new BadRequestException("Choose a future time window"); return this.db.technicianAvailabilityBlock.create({ data: { id: newUlid(), technicianProfileId: profile.id, startsAt, endsAt, reason: dto.reason ? sanitizeMessageText(dto.reason) : null } }); }
  async listAdminBookings() { return this.db.booking.findMany({ orderBy: { updatedAt: "desc" }, take: 100, select: { id: true, status: true, priceKobo: true, updatedAt: true, request: { select: { nearestLandmark: true, service: { select: { name: true } }, area: { select: { name: true } } } }, history: { orderBy: { createdAt: "desc" }, take: 10 } } }); }
  async listFlags() { return this.db.messageFlag.findMany({ where: { status: "OPEN" }, orderBy: { createdAt: "desc" }, take: 100, include: { message: { select: { id: true, body: true, createdAt: true, conversationId: true } } } }); }
  async reviewFlag(id: string, userId: string, dto: ModerationDto, req: Request) { const row = await this.db.messageFlag.update({ where: { id }, data: { status: dto.status, reviewedById: userId, reviewedAt: new Date(), reviewNote: dto.note ? sanitizeMessageText(dto.note) : null } }); await this.audit(req, userId, "chat.flag.reviewed", "message_flag", id, { status: dto.status }); return row; }
  async readSettings() { return this.db.setting.findMany({ where: { scopeType: "GLOBAL", scopeId: "global", key: { startsWith: "booking." } }, orderBy: { key: "asc" } }); }
  async updateSetting(userId: string, dto: JobSettingsDto, req: Request) { if (!/^(booking|matching|message|request|quote)\./.test(dto.key)) throw new BadRequestException("This setting is not managed here"); const where = { scopeType_scopeId_key: { scopeType: "GLOBAL" as const, scopeId: "global", key: dto.key } }; const before = await this.db.setting.findUnique({ where }); const row = await this.db.setting.upsert({ where, create: { ...where.scopeType_scopeId_key, valueJson: dto.value as object }, update: { valueJson: dto.value as object } }); await this.audit(req, userId, "jobs.setting.updated", "setting", dto.key, { before: before?.valueJson, after: dto.value }); return row; }
  async runScheduledJobs() {
    const now = new Date();
    const expired = await this.db.jobRequest.findMany({ where: { status: { in: [...nonterminalRequestStatuses] }, expiresAt: { lte: now }, deletedAt: null }, take: 100 });
    for (const request of expired) await this.db.$transaction(async tx => {
      await this.lockRequest(tx, request.id);
      const current = await tx.jobRequest.findUnique({ where: { id: request.id } });
      if (!current || !nonterminalRequestStatuses.includes(current.status as never) || current.expiresAt > now) return;
      await tx.jobRequest.update({ where: { id: current.id }, data: { status: "EXPIRED" } });
      await tx.quote.updateMany({ where: { jobRequestId: current.id, status: "ACTIVE" }, data: { status: "EXPIRED", activeSlot: null } });
      void this.notify(current.customerId, "request_expired", "Request expired", "Your request expired before a quote was accepted.");
    });
    const autoHours = await this.setting("booking.auto_complete_hours", 48);
    const pending = await this.db.booking.findMany({ where: { status: "COMPLETED_PENDING_CONFIRMATION", completedByTechnicianAt: { lte: new Date(now.getTime() - autoHours * 3_600_000) } }, take: 100 });
    for (const booking of pending) await this.db.$transaction(async tx => {
      await tx.$queryRaw`SELECT id FROM bookings WHERE id = ${booking.id} FOR UPDATE`;
      const current = await tx.booking.findUnique({ where: { id: booking.id } });
      if (!current || current.status !== "COMPLETED_PENDING_CONFIRMATION") return;
      await tx.booking.update({ where: { id: current.id }, data: { status: "COMPLETED", confirmedCompletedAt: now } });
      await tx.bookingStatusHistory.create({ data: { id: newUlid(), bookingId: current.id, fromStatus: current.status, toStatus: "COMPLETED", actorRole: "SYSTEM", reason: "Automatically completed after the confirmation window" } });
      await tx.jobRequest.update({ where: { id: current.jobRequestId }, data: { status: "COMPLETED" } });
      void this.notify(current.customerId, "booking_auto_completed", "Booking completed", "The booking was marked complete after the confirmation window.");
    });
  }
}

function haversineMeters(lat1: number, lon1: number, lat2: number, lon2: number) { const rad = (v: number) => v * Math.PI / 180; const dLat = rad(lat2-lat1), dLon = rad(lon2-lon1); const a = Math.sin(dLat/2)**2 + Math.cos(rad(lat1))*Math.cos(rad(lat2))*Math.sin(dLon/2)**2; return 6371000 * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); }
function quoteSnapshot(v: { id: string; version: number; status: string; priceKobo: number; laborKobo: number | null; materialsKobo: number | null; message: string | null; estimatedStartAt: Date | null; estimatedArrivalMins: number | null; validUntil: Date }) { return { id: v.id, version: v.version, status: v.status, priceKobo: v.priceKobo, laborKobo: v.laborKobo, materialsKobo: v.materialsKobo, message: v.message, estimatedStartAt: v.estimatedStartAt?.toISOString() || null, estimatedArrivalMins: v.estimatedArrivalMins, validUntil: v.validUntil.toISOString() }; }

@Controller("jobs") @UseGuards(AccessGuard)
class JobsController {
  constructor(@Inject(JobsService) private jobs: JobsService) {}
  @Post("uploads/sign") signUpload(@Req() r: AuthenticatedRequest, @Body() d: RequestUploadDto) { return this.jobs.signRequestImage(r.authUser!.id, d); }
  @Post("requests") @Throttle({ default: { limit: 5, ttl: 60000 } }) create(@Req() r: AuthenticatedRequest, @Body() d: CreateJobRequestDto) { return this.jobs.createRequest(r.authUser!.id, d, r); }
  @Get("requests/mine") mine(@Req() r: AuthenticatedRequest) { return this.jobs.myRequests(r.authUser!.id); }
  @Get("requests/:id") request(@Req() r: AuthenticatedRequest, @Param("id") id: string) { return this.jobs.requestDetail(r.authUser!.id, id); }
  @Get("technician/feed") feed(@Req() r: AuthenticatedRequest) { return this.jobs.technicianFeed(r.authUser!.id); }
  @Post("requests/:id/quotes") @Throttle({ default: { limit: 10, ttl: 60000 } }) quote(@Req() r: AuthenticatedRequest, @Param("id") id: string, @Body() d: QuoteDto) { return this.jobs.createQuote(r.authUser!.id, id, d, r); }
  @Get("requests/:id/quotes") quotes(@Req() r: AuthenticatedRequest, @Param("id") id: string) { return this.jobs.quoteResponse(r.authUser!.id, id); }
  @Post("quotes/:id/accept") accept(@Req() r: AuthenticatedRequest, @Param("id") id: string, @Body() d: AcceptQuoteDto) { return this.jobs.acceptQuote(r.authUser!.id, id, d, r); }
  @Post("requests/:id/cancel") cancelRequest(@Req() r: AuthenticatedRequest, @Param("id") id: string, @Body() d: CancelDto) { return this.jobs.cancelRequest(r.authUser!.id, id, d, r); }
  @Get("bookings/mine") bookings(@Req() r: AuthenticatedRequest) { return this.jobs.myBookings(r.authUser!.id); }
  @Get("bookings/:id") booking(@Req() r: AuthenticatedRequest, @Param("id") id: string) { return this.jobs.bookingDetail(r.authUser!.id, id); }
  @Patch("bookings/:id/status") status(@Req() r: AuthenticatedRequest, @Param("id") id: string, @Body() d: StatusDto) { return this.jobs.changeBookingStatus(r.authUser!.id, id, d, r); }
  @Post("bookings/:id/cancel") cancelBooking(@Req() r: AuthenticatedRequest, @Param("id") id: string, @Body() d: CancelDto) { return this.jobs.cancelBooking(r.authUser!.id, id, d, r); }
  @Get("bookings/:id/contact") contact(@Req() r: AuthenticatedRequest, @Param("id") id: string) { return this.jobs.revealContact(r.authUser!.id, id, r); }
  @Get("conversations") conversations(@Req() r: AuthenticatedRequest) { return this.jobs.listConversations(r.authUser!.id); }
  @Post("conversations/:id/uploads/sign") signChat(@Req() r: AuthenticatedRequest, @Param("id") id: string, @Body() d: RequestUploadDto) { return this.jobs.signChatImage(r.authUser!.id, id, d); }
  @Get("conversations/:id/messages") messages(@Req() r: AuthenticatedRequest, @Param("id") id: string, @Query("before") before?: string) { return this.jobs.messages(r.authUser!.id, id, before); }
  @Post("conversations/:id/messages") @Throttle({ default: { limit: 30, ttl: 60000 } }) message(@Req() r: AuthenticatedRequest, @Param("id") id: string, @Body() d: CreateMessageDto) { return this.jobs.postMessage(r.authUser!.id, id, d, r); }
  @Get("technician/availability") availability(@Req() r: AuthenticatedRequest) { return this.jobs.availabilityBlocks(r.authUser!.id); }
  @Post("technician/availability") availabilityAdd(@Req() r: AuthenticatedRequest, @Body() d: AvailabilityDto) { return this.jobs.createAvailabilityBlock(r.authUser!.id, d); }
}
@Controller("admin/jobs") @UseGuards(AccessGuard, PermissionGuard)
class AdminJobsController {
  constructor(@Inject(JobsService) private jobs: JobsService) {}
  @Get("bookings") @RequirePermissions("bookings.manage") bookings() { return this.jobs.listAdminBookings(); }
  @Get("flags") @RequirePermissions("chat.moderate") flags() { return this.jobs.listFlags(); }
  @Patch("flags/:id") @RequirePermissions("chat.moderate") review(@Req() r: AuthenticatedRequest, @Param("id") id: string, @Body() d: ModerationDto) { return this.jobs.reviewFlag(id, r.authUser!.id, d, r); }
  @Get("settings") @RequirePermissions("jobs.manage") settings() { return this.jobs.readSettings(); }
  @Patch("settings") @RequirePermissions("jobs.manage") updateSetting(@Req() r: AuthenticatedRequest, @Body() d: JobSettingsDto) { return this.jobs.updateSetting(r.authUser!.id, d, r); }
}
@Module({ imports: [AuthModule], controllers: [JobsController, AdminJobsController], providers: [JobsService, { provide: "JOBS_SERVICE", useExisting: JobsService }, PrismaService, NotificationService, RealtimeHub, JobsGateway, JobsSocketAdapter, DefaultCommissionRuleProvider, PermissionGuard, { provide: "PAYMENT_GATE", useClass: NoopPaymentGate }] })
export class JobsModule {}
