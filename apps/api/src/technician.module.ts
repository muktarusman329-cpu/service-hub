import { BadRequestException, Body, Controller, ForbiddenException, Get, Inject, Injectable, Module, NotFoundException, Param, Patch, Post, Query, Req, UseGuards } from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import { ArrayMaxSize, ArrayMinSize, IsArray, IsBoolean, IsIn, IsInt, IsNumber, IsObject, IsOptional, IsPhoneNumber, IsString, IsUUID, Length, Matches, Max, Min } from "class-validator";
import type { Request } from "express";
import { env } from "@servicehub/config/env";
import { AuthModule } from "./auth.module";
import { PrismaService } from "./prisma.service";
import { AccessGuard, AuthenticatedRequest, digest, PermissionGuard, RequirePermissions } from "./security";
import { assertTechnicianTransition, isAllowedImage, stripImageExif, type TechnicianStatus } from "./technician-primitives";
import { encryptIdNumber, decryptIdNumber, idBlindIndex, maskIdNumber } from "./kyc-crypto";
import { PrivateObjectStorage } from "./object-storage";
import { NotificationService } from "./notifications";

class ProfileDto {
  @IsOptional() @IsString() @Length(2, 120) legalName?: string;
  @IsOptional() @IsString() @Length(2, 120) displayName?: string;
  @IsOptional() @IsString() @Length(20, 1200) bio?: string;
  @IsOptional() @IsString() profilePhotoKey?: string;
  @IsOptional() @IsUUID() cityId?: string;
  @IsOptional() @IsArray() @ArrayMaxSize(40) @IsUUID("4", { each: true }) areaIds?: string[];
  @IsOptional() @IsArray() @ArrayMaxSize(30) @IsObject({ each: true }) skills?: Array<{ serviceId: string; yearsExperience: number }>;
  @IsOptional() @IsObject() weeklyAvailability?: Record<string, unknown>;
  @IsOptional() @IsString() guarantorName?: string;
  @IsOptional() @IsString() @IsPhoneNumber("NG") guarantorPhone?: string;
  @IsOptional() @IsString() guarantorRelationship?: string;
  @IsOptional() @IsBoolean() guarantorAgreed?: boolean;
  @IsOptional() @IsArray() @ArrayMaxSize(20) @IsObject({ each: true }) portfolio?: Array<{ objectKey: string; caption?: string }>;
}
class KycConsentDto { @IsBoolean() accepted!: boolean; }
class UploadUrlDto { @IsIn(["ID_PHOTO", "SELFIE", "PORTFOLIO", "PROFILE_PHOTO"]) kind!: "ID_PHOTO" | "SELFIE" | "PORTFOLIO" | "PROFILE_PHOTO"; @IsIn(["image/jpeg", "image/png", "image/webp"]) contentType!: string; @IsInt() @Min(1) @Max(8_000_000) size!: number; }
class KycSubmitDto { @IsIn(["NIN", "VOTER_CARD", "DRIVERS_LICENCE", "PASSPORT", "OTHER"]) idType!: string; @IsString() @Length(4, 40) @Matches(/^[A-Za-z0-9/-]+$/) idNumber!: string; @IsString() idPhotoKey!: string; @IsString() selfieKey!: string; }
class ReviewDto { @IsIn(["UNDER_REVIEW", "APPROVED", "REJECTED", "CHANGES_REQUESTED", "SUSPENDED", "REACTIVATED"]) status!: TechnicianStatus; @IsOptional() @IsString() @Length(4, 1000) reason?: string; @IsOptional() @IsString() @Length(0, 2000) internalNote?: string; }
class ManualOnboardDto { @IsString() @Length(5, 120) displayName!: string; @IsPhoneNumber("NG") phone!: string; @IsUUID() cityId!: string; }
class RevealDto { @IsString() @Length(8, 1000) reason!: string; }
class CitySettingDto { @IsBoolean() guarantorRequired!: boolean; @IsOptional() @IsInt() @Min(1) @Max(3650) retentionDays?: number; }

type DocKind = "idPhotoKey" | "selfieKey";
const documentKeys: Record<string, DocKind> = { ID_PHOTO: "idPhotoKey", SELFIE: "selfieKey" };

export interface IdVerificationProvider {
  verify(input: { idType: string; blindIndex: string }): Promise<{ verified: boolean; reference: string }>;
}
export class ManualIdVerificationProvider implements IdVerificationProvider {
  async verify() { return { verified: false, reference: "manual-review-required" }; }
}
export interface MalwareScanner { scan(bytes: Uint8Array): Promise<{ clean: boolean; reason?: string }> }
export class NoopMalwareScanner implements MalwareScanner { async scan() { return { clean: true }; } }

@Injectable()
export class TechnicianService {
  private readonly storage = new PrivateObjectStorage();
  private readonly scanner: MalwareScanner = new NoopMalwareScanner();
  private readonly verificationProvider: IdVerificationProvider = new ManualIdVerificationProvider();
  private retentionTimer?: NodeJS.Timeout;
  constructor(@Inject(PrismaService) private db: PrismaService, @Inject(NotificationService) private notifications: NotificationService) {}
  onModuleInit() { void this.storage.ensureBucket().catch((error) => console.error("Private object storage bucket is unavailable", error instanceof Error ? error.message : "storage_error")); this.retentionTimer = setInterval(() => void this.cleanupRetention(), 60 * 60 * 1000); this.retentionTimer.unref(); }
  onModuleDestroy() { if (this.retentionTimer) clearInterval(this.retentionTimer); }
  private async audit(req: Request, actor: string | undefined, action: string, type: string, id: string, metadata?: object) {
    await this.db.auditLog.create({ data: { actorUserId: actor, action, entityType: type, entityId: id, ipHash: req.ip ? digest(req.ip) : null, userAgent: String(req.headers["user-agent"] || "").slice(0, 500), metadata } });
  }
  private async profileForUser(userId: string) {
    const profile = await this.db.technicianProfile.findFirst({ where: { userId, deletedAt: null }, include: { user: { select: { id: true, displayName: true, phoneVerifiedAt: true } }, skills: { include: { service: { select: { id: true, name: true, slug: true } } } }, areas: { include: { area: { select: { id: true, name: true, cityId: true } } } }, portfolio: { orderBy: { sortOrder: "asc" } }, kyc: { select: { status: true, idType: true, submittedAt: true } } } });
    if (!profile) throw new NotFoundException("Technician profile not found");
    return profile;
  }
  private async guarantorRequired(cityId: string) {
    const city = await this.db.city.findUnique({ where: { id: cityId }, select: { slug: true } }); if (!city) return false;
    const setting = await this.db.setting.findUnique({ where: { scopeType_scopeId_key: { scopeType: "CITY", scopeId: city.slug, key: "technician.guarantor_required" } } });
    return setting?.valueJson === true;
  }
  private async retentionDays(cityId: string | null) {
    if (cityId) {
      const city = await this.db.city.findUnique({ where: { id: cityId }, select: { slug: true } });
      if (city) {
        const configured = await this.db.setting.findUnique({ where: { scopeType_scopeId_key: { scopeType: "CITY", scopeId: city.slug, key: "kyc.retention_days" } } });
        if (typeof configured?.valueJson === "number" && Number.isInteger(configured.valueJson) && configured.valueJson > 0) return configured.valueJson;
      }
    }
    return env.KYC_RETENTION_DAYS;
  }
  async saveOnboarding(userId: string, dto: ProfileDto, req: Request) {
    const profile = await this.profileForUser(userId);
    if (["APPROVED", "REJECTED", "SUSPENDED"].includes(profile.approvalStatus)) throw new BadRequestException("This profile is locked. Contact support if you need help.");
    if (dto.profilePhotoKey) {
      if (!dto.profilePhotoKey.startsWith(`profiles/${userId}/profile/`)) throw new ForbiddenException("That photo is not yours");
      await this.validateAndSanitize(dto.profilePhotoKey, userId);
    }
    if (dto.skills) for (const skill of dto.skills) if (!Number.isInteger(skill.yearsExperience) || skill.yearsExperience < 0 || skill.yearsExperience > 60) throw new BadRequestException("Enter experience between 0 and 60 years");
    const update: Record<string, unknown> = {};
    for (const key of ["legalName", "bio", "profilePhotoKey", "weeklyAvailability", "guarantorName", "guarantorRelationship"] as const) if (dto[key] !== undefined) update[key] = dto[key];
    if (dto.cityId !== undefined) update.city = { connect: { id: dto.cityId } };
    if (dto.displayName !== undefined) update.user = { update: { displayName: dto.displayName.slice(0, 120) } };
    if (dto.guarantorPhone !== undefined) update.guarantorPhoneEncrypted = (await encryptIdNumber(dto.guarantorPhone)).value;
    if (dto.guarantorAgreed === true) update.guarantorConsentAt = new Date();
    await this.db.$transaction(async (tx) => {
      await tx.technicianProfile.update({ where: { id: profile.id }, data: update as never });
      if (dto.skills) {
        await tx.technicianSkill.deleteMany({ where: { profileId: profile.id } });
        const serviceIds = dto.skills.map((skill) => skill.serviceId);
        const activeServices = await tx.service.findMany({ where: { id: { in: serviceIds }, isActive: true }, select: { id: true } });
        if (activeServices.length !== serviceIds.length) throw new BadRequestException("Choose an active service from the list");
        await tx.technicianSkill.createMany({ data: dto.skills.map((skill) => ({ profileId: profile.id, serviceId: skill.serviceId, yearsExperience: skill.yearsExperience })) });
      }
      if (dto.areaIds) {
        await tx.technicianArea.deleteMany({ where: { profileId: profile.id } });
        if (dto.areaIds.length) {
          const areas = await tx.area.findMany({ where: { id: { in: dto.areaIds }, cityId: dto.cityId ?? profile.cityId ?? "", isActive: true }, select: { id: true } });
          if (areas.length !== dto.areaIds.length) throw new BadRequestException("Choose service areas in your selected city");
          await tx.technicianArea.createMany({ data: dto.areaIds.map((areaId) => ({ profileId: profile.id, areaId })) });
        }
      }
      if (dto.portfolio) {
        if (dto.portfolio.length > env.MAX_PORTFOLIO_PHOTOS) throw new BadRequestException(`Add no more than ${env.MAX_PORTFOLIO_PHOTOS} portfolio photos`);
        if (dto.portfolio.some((photo) => !photo.objectKey.startsWith(`profiles/${userId}/portfolio/`))) throw new ForbiddenException("A portfolio photo is not yours");
        await Promise.all(dto.portfolio.map((photo) => this.validateAndSanitize(photo.objectKey, userId)));
        await tx.technicianPortfolio.deleteMany({ where: { profileId: profile.id } });
        if (dto.portfolio.length) await tx.technicianPortfolio.createMany({ data: dto.portfolio.map((photo, sortOrder) => ({ profileId: profile.id, objectKey: photo.objectKey, caption: photo.caption?.slice(0, 240), sortOrder })) });
      }
    });
    await this.audit(req, userId, "technician.onboarding.saved", "technician_profile", profile.id);
    return this.onboarding(userId);
  }
  async onboarding(userId: string) {
    const profile = await this.profileForUser(userId);
    const consent = await this.db.consent.findFirst({ where: { userId, purpose: "KYC", granted: true, withdrawnAt: null }, orderBy: { capturedAt: "desc" } });
    const checklist = [
      { key: "profile", label: "Basic profile", complete: !!(profile.legalName && profile.user.displayName && profile.bio && profile.profilePhotoKey) },
      { key: "phone", label: "Verified phone", complete: !!profile.user.phoneVerifiedAt },
      { key: "skills", label: "Services and experience", complete: profile.skills.length > 0 },
      { key: "areas", label: "Service areas", complete: profile.areas.length > 0 },
      { key: "availability", label: "Weekly availability", complete: !!profile.weeklyAvailability },
      { key: "portfolio", label: "Work photos", complete: profile.portfolio.length > 0 },
      { key: "kyc", label: "Identity check", complete: !!profile.kyc && !!consent },
      { key: "guarantor", label: "Guarantor (optional)", complete: !!profile.guarantorConsentAt, optional: true }
    ];
    return { profile: { id: profile.id, status: profile.approvalStatus, legalName: profile.legalName, displayName: profile.user.displayName, bio: profile.bio, profilePhotoKey: profile.profilePhotoKey, cityId: profile.cityId, weeklyAvailability: profile.weeklyAvailability, guarantorName: profile.guarantorName, guarantorRelationship: profile.guarantorRelationship, guarantorProvided: !!profile.guarantorPhoneEncrypted, skills: profile.skills.map((x) => ({ serviceId: x.serviceId, service: x.service, yearsExperience: x.yearsExperience })), areas: profile.areas.map((x) => x.area), portfolio: profile.portfolio.map((x) => ({ id: x.id, objectKey: x.objectKey, caption: x.caption })), kycStatus: profile.kyc?.status || "NOT_STARTED" }, checklist, progress: checklist.filter((item) => item.complete || item.optional).length / checklist.length, editable: !["APPROVED", "REJECTED", "SUSPENDED"].includes(profile.approvalStatus) };
  }
  async kycConsent(userId: string, accepted: boolean, req: Request) {
    if (!accepted) throw new BadRequestException("Accept the identity-check consent before uploading documents");
    const consent = await this.db.consent.create({ data: { userId, purpose: "KYC", policyVersion: env.PRIVACY_VERSION, granted: true, source: "technician-onboarding" } });
    await this.audit(req, userId, "technician.kyc.consent.accepted", "consent", consent.id, { version: env.PRIVACY_VERSION }); return { accepted: true, version: env.PRIVACY_VERSION };
  }
  async uploadUrl(userId: string, kind: UploadUrlDto["kind"], contentType: string, size: number, req: Request) {
    if (size > env.KYC_MAX_FILE_BYTES) throw new BadRequestException(`Choose a file smaller than ${Math.round(env.KYC_MAX_FILE_BYTES / 1_000_000)} MB`);
    if (!["image/jpeg", "image/png", "image/webp"].includes(contentType)) throw new BadRequestException("Choose a JPG, PNG or WebP image");
    if (["ID_PHOTO", "SELFIE"].includes(kind)) {
      const consent = await this.db.consent.findFirst({ where: { userId, purpose: "KYC", granted: true, withdrawnAt: null } }); if (!consent) throw new ForbiddenException("Accept the identity-check consent first");
    }
    const profile = await this.profileForUser(userId); const prefix = kind === "PORTFOLIO" ? "portfolio" : kind === "PROFILE_PHOTO" ? "profile" : "kyc";
    const ext = contentType.split("/")[1]!.replace("jpeg", "jpg"); const key = this.storage.newObjectKey(`profiles/${userId}/${prefix}`, ext);
    await this.audit(req, userId, "technician.upload_url.created", "object", kind, { maxBytes: env.KYC_MAX_FILE_BYTES });
    return { uploadUrl: this.storage.presignPut(key), objectKey: key, expiresInSeconds: 300, maxBytes: env.KYC_MAX_FILE_BYTES, contentType };
  }
  private async validateAndSanitize(key: string, userId: string) {
    if (!key.startsWith(`profiles/${userId}/`)) throw new ForbiddenException("That file is not yours");
    const metadata = await this.storage.metadata(key); if (!metadata.size || metadata.size > env.KYC_MAX_FILE_BYTES) throw new BadRequestException("The uploaded file is empty or too large");
    const bytes = await this.storage.read(key); if (!isAllowedImage(metadata.type, bytes)) throw new BadRequestException("File contents do not match the selected image type");
    const scan = await this.scanner.scan(bytes); if (!scan.clean) throw new BadRequestException("This file could not be accepted. Choose another image.");
    const sanitized = stripImageExif(metadata.type, bytes); if (sanitized.length !== bytes.length) await this.storage.write(key, sanitized, metadata.type);
  }
  async submitKyc(userId: string, dto: KycSubmitDto, req: Request) {
    const profile = await this.profileForUser(userId);
    const consent = await this.db.consent.findFirst({ where: { userId, purpose: "KYC", granted: true, withdrawnAt: null } }); if (!consent) throw new ForbiddenException("Accept the identity-check consent before submitting");
    const [idBytes] = await Promise.all([this.validateAndSanitize(dto.idPhotoKey, userId), this.validateAndSanitize(dto.selfieKey, userId)]);
    const index = idBlindIndex(dto.idType, dto.idNumber);
    const duplicate = await this.db.technicianKyc.findUnique({ where: { idNumberBlindIndex: index }, select: { profileId: true } });
    if (duplicate && duplicate.profileId !== profile.id) throw new BadRequestException("This identity number is already linked to a technician profile");
    const encrypted = await encryptIdNumber(dto.idNumber);
    const verification = await this.verificationProvider.verify({ idType: dto.idType, blindIndex: index });
    await this.db.technicianKyc.upsert({ where: { profileId: profile.id }, create: { profileId: profile.id, idType: dto.idType, idNumberEncrypted: encrypted.value, idNumberBlindIndex: index, keyId: encrypted.keyId, idPhotoKey: dto.idPhotoKey, selfieKey: dto.selfieKey, status: verification.verified ? "VERIFIED" : "PENDING_MANUAL", provider: "MANUAL", minimalVerificationRecord: verification.reference }, update: { idType: dto.idType, idNumberEncrypted: encrypted.value, idNumberBlindIndex: index, keyId: encrypted.keyId, idPhotoKey: dto.idPhotoKey, selfieKey: dto.selfieKey, status: verification.verified ? "VERIFIED" : "PENDING_MANUAL", provider: "MANUAL", minimalVerificationRecord: verification.reference, submittedAt: new Date(), retentionAt: null, clearedAt: null } });
    await this.audit(req, userId, "technician.kyc.submitted", "technician_profile", profile.id, { idType: dto.idType, filesValidated: true });
    void idBytes;
    return { status: verification.verified ? "VERIFIED" : "PENDING_MANUAL", message: "Your identity documents were sent for a manual check." };
  }
  async submitProfile(userId: string, req: Request) {
    const profile = await this.profileForUser(userId); const onboarding = await this.onboarding(userId);
    const required = onboarding.checklist.filter((item) => item.key !== "guarantor");
    if (required.some((item) => !item.complete)) throw new BadRequestException("Complete each required item before you submit");
    if (profile.cityId && await this.guarantorRequired(profile.cityId) && !profile.guarantorConsentAt) throw new BadRequestException("Add a guarantor who has agreed to be contacted before submitting");
    if (!profile.user.phoneVerifiedAt) throw new BadRequestException("Verify your phone number before submitting");
    await this.transition(profile.id, "SUBMITTED", undefined, undefined, userId, req);
    await this.db.technicianProfile.update({ where: { id: profile.id }, data: { submittedAt: new Date() } });
    return this.onboarding(userId);
  }
  private async transition(profileId: string, to: TechnicianStatus, reason: string | undefined, internalNote: string | undefined, actorId: string | undefined, req: Request) {
    const profile = await this.db.technicianProfile.findUnique({ where: { id: profileId }, include: { user: { select: { id: true, phoneVerifiedAt: true } } } });
    if (!profile) throw new NotFoundException("Technician profile not found");
    try { assertTechnicianTransition(profile.approvalStatus as TechnicianStatus, to, reason); }
    catch (error) { throw new BadRequestException(error instanceof Error ? error.message : "This status change is not allowed"); }
    if (to === "APPROVED" && !profile.user.phoneVerifiedAt) throw new BadRequestException("The technician must verify their phone before approval");
    const retentionAt = to === "REJECTED" ? new Date(Date.now() + await this.retentionDays(profile.cityId) * 86_400_000) : undefined;
    await this.db.$transaction(async (tx) => {
      await tx.technicianProfile.update({ where: { id: profileId }, data: { approvalStatus: to, ...(to === "SUBMITTED" ? { submittedAt: new Date() } : {}) } });
      await tx.technicianStatusHistory.create({ data: { profileId, fromStatus: profile.approvalStatus, toStatus: to, actorId, reason: reason?.trim() || null, internalNote: internalNote?.trim() || null } });
      if (retentionAt) await tx.technicianKyc.updateMany({ where: { profileId }, data: { retentionAt, status: "REJECTED", minimalVerificationRecord: "Rejected; limited record retained pending approved cleanup" } });
      if (to === "APPROVED") await tx.technicianKyc.updateMany({ where: { profileId }, data: { status: "APPROVED", minimalVerificationRecord: "Approved after manual review" } });
      await tx.userInboxNotification.create({ data: { userId: profile.userId, title: "Technician application update", body: `Your application status is ${to.toLowerCase().replaceAll("_", " ")}. Sign in to see the details.` } });
    });
    await this.audit(req, actorId, "technician.status.changed", "technician_profile", profileId, { from: profile.approvalStatus, to, reason: reason?.slice(0, 1000) });
    await this.notifications.sendTechnicianStatus(profile.userId, to).catch(() => undefined);
    return { id: profileId, status: to };
  }
  async reviewQueue(filters: { status?: string; areaId?: string; categoryId?: string; serviceId?: string; after?: string; before?: string; q?: string }) {
    const statuses = ["DRAFT", "SUBMITTED", "UNDER_REVIEW", "CHANGES_REQUESTED", "APPROVED", "REJECTED", "SUSPENDED", "REACTIVATED", "PENDING_APPROVAL"];
    if (filters.status && !statuses.includes(filters.status)) throw new BadRequestException("Choose a valid application status");
    return this.db.technicianProfile.findMany({ where: { deletedAt: null, ...(filters.status ? { approvalStatus: filters.status as never } : { approvalStatus: { in: ["SUBMITTED", "UNDER_REVIEW", "CHANGES_REQUESTED"] } }), ...(filters.areaId ? { areas: { some: { areaId: filters.areaId } } } : {}), ...(filters.serviceId ? { skills: { some: { serviceId: filters.serviceId } } } : {}), ...(filters.categoryId ? { skills: { some: { service: { categoryId: filters.categoryId } } } } : {}), ...(filters.q ? { OR: [{ legalName: { contains: filters.q, mode: "insensitive" } }, { user: { displayName: { contains: filters.q, mode: "insensitive" } } }, { user: { phoneE164: { contains: filters.q } } }] } : {}), ...(filters.after || filters.before ? { submittedAt: { ...(filters.after ? { gte: new Date(filters.after) } : {}), ...(filters.before ? { lte: new Date(filters.before) } : {}) } } : {}) }, orderBy: { submittedAt: "asc" }, take: 100, select: { id: true, approvalStatus: true, legalName: true, cityId: true, submittedAt: true, user: { select: { id: true, displayName: true, phoneVerifiedAt: true } }, skills: { include: { service: { select: { name: true, category: { select: { name: true } } } } } }, areas: { include: { area: { select: { id: true, name: true } } } }, portfolio: { orderBy: { sortOrder: "asc" }, select: { id: true, objectKey: true, caption: true } } } });
  }
  async review(profileId: string, dto: ReviewDto, actor: string, req: Request) { return this.transition(profileId, dto.status, dto.reason, dto.internalNote, actor, req); }
  async technicianDetail(profileId: string) {
    const value = await this.db.technicianProfile.findUnique({ where: { id: profileId }, include: { user: { select: { displayName: true, phoneVerifiedAt: true } }, skills: { include: { service: { include: { category: true } } } }, areas: { include: { area: true } }, portfolio: { orderBy: { sortOrder: "asc" } }, statusHistory: { orderBy: { createdAt: "desc" } } } });
    if (!value) throw new NotFoundException("Technician not found");
    const auditTrail = await this.db.auditLog.findMany({ where: { entityId: { in: [profileId, ...(await this.db.technicianKyc.findUnique({ where: { profileId }, select: { id: true } }).then(x => x ? [x.id] : []))] } }, orderBy: { createdAt: "desc" }, take: 100, select: { actorUserId: true, action: true, entityType: true, metadata: true, createdAt: true } });
    const { guarantorPhoneEncrypted: _privatePhone, ...safeProfile } = value;
    return { ...safeProfile, auditTrail };
  }
  async kycReview(profileId: string, actor: string, req: Request) {
    const row = await this.db.technicianKyc.findUnique({ where: { profileId } }); if (!row) throw new NotFoundException("Identity documents not found");
    if (!row.idNumberEncrypted) throw new NotFoundException("Identity number has been removed under the retention policy");
    const idNumber = await decryptIdNumber(row.idNumberEncrypted, row.keyId);
    await this.audit(req, actor, "technician.kyc.viewed", "technician_kyc", row.id, { document: "summary" });
    return { id: row.id, idType: row.idType, idNumberMasked: maskIdNumber(idNumber), status: row.status, submittedAt: row.submittedAt, provider: "MANUAL" };
  }
  async revealKyc(profileId: string, reason: string, actor: string, req: Request) {
    const row = await this.db.technicianKyc.findUnique({ where: { profileId } }); if (!row) throw new NotFoundException("Identity documents not found");
    if (!row.idNumberEncrypted) throw new NotFoundException("Identity number has been removed under the retention policy");
    const value = await decryptIdNumber(row.idNumberEncrypted, row.keyId);
    await this.audit(req, actor, "technician.kyc.id_revealed", "technician_kyc", row.id, { reason: reason.trim() }); return { idType: row.idType, idNumber: value };
  }
  async kycDocument(profileId: string, kind: string, actor: string, req: Request) {
    const row = await this.db.technicianKyc.findUnique({ where: { profileId } }); if (!row) throw new NotFoundException("Identity document not found");
    const field = documentKeys[kind]; if (!field) throw new BadRequestException("Document type not found");
    if (!row[field]) throw new NotFoundException("This document has been removed under the retention policy");
    await this.audit(req, actor, "technician.kyc.document_accessed", "technician_kyc", row.id, { document: kind });
    return { url: this.storage.signedDownload(row[field]!), expiresInSeconds: 300 };
  }
  async manualOnboard(dto: ManualOnboardDto, actor: string, req: Request) {
    const role = await this.db.role.findUniqueOrThrow({ where: { key: "TECHNICIAN" } });
    const phone = dto.phone.replace(/\D/g, "").replace(/^234/, "0"); const phoneE164 = phone.startsWith("0") ? `+234${phone.slice(1)}` : `+${phone}`;
    const existing = await this.db.user.findUnique({ where: { phoneE164 } }); if (existing) throw new BadRequestException("A user already uses this phone number");
    const profile = await this.db.technicianProfile.create({ data: { city: { connect: { id: dto.cityId } }, legalName: dto.displayName, approvalStatus: "DRAFT", user: { create: { phoneE164, displayName: dto.displayName } } } });
    await this.db.userRole.create({ data: { userId: profile.userId, roleId: role.id, assignedBy: actor } });
    await this.db.technicianStatusHistory.create({ data: { profileId: profile.id, toStatus: "DRAFT", actorId: actor, reason: "Manual field onboarding" } });
    await this.audit(req, actor, "technician.manual_onboarded", "technician_profile", profile.id, { phoneVerified: false });
    return { profileId: profile.id, status: "DRAFT", phoneVerified: false };
  }
  async publicListing(city: string, filters: { serviceId?: string; areaId?: string; day?: string; offset?: number; limit?: number }) {
    const cityRow = await this.db.city.findUnique({ where: { slug: city }, select: { id: true } }); if (!cityRow) throw new NotFoundException("City not found");
    const rows = await this.db.technicianProfile.findMany({
      where: {
        cityId: cityRow.id,
        approvalStatus: { in: ["APPROVED", "REACTIVATED"] },
        deletedAt: null,
        ...(filters.serviceId ? { skills: { some: { serviceId: filters.serviceId } } } : {}),
        ...(filters.areaId ? { areas: { some: { areaId: filters.areaId } } } : {}),
      },
      orderBy: { submittedAt: "asc" },
      skip: Math.max(0, filters.offset || 0),
      take: Math.min(50, Math.max(1, filters.limit || 20)),
      select: {
        id: true,
        user: { select: { displayName: true } },
        profilePhotoKey: true,
        weeklyAvailability: true,
        skills: {
          select: {
            yearsExperience: true,
            service: { select: { id: true, name: true, slug: true, category: { select: { name: true, slug: true } } } },
          },
        },
        areas: { select: { area: { select: { id: true, name: true } } } },
        portfolio: { orderBy: { sortOrder: "asc" }, take: 1, select: { objectKey: true } },
      },
    });
    return rows.map((row) => ({ id: row.id, displayName: row.user.displayName, photoUrl: row.profilePhotoKey ? this.storage.signedDownload(row.profilePhotoKey) : null, skills: row.skills.map((x) => ({ service: x.service, yearsExperience: x.yearsExperience })), areas: row.areas.map((x) => x.area), available: filters.day ? !!(row.weeklyAvailability as Record<string, unknown> | null)?.[filters.day] : null, rating: { average: null, count: 0 } }));
  }
  async setCitySettings(cityId: string, dto: CitySettingDto, actor: string, req: Request) {
    const city = await this.db.city.findUnique({ where: { id: cityId }, select: { slug: true } }); if (!city) throw new NotFoundException("City not found");
    const values = [await this.db.setting.upsert({ where: { scopeType_scopeId_key: { scopeType: "CITY", scopeId: city.slug, key: "technician.guarantor_required" } }, create: { scopeType: "CITY", scopeId: city.slug, key: "technician.guarantor_required", valueJson: dto.guarantorRequired, updatedById: actor }, update: { valueJson: dto.guarantorRequired, updatedById: actor } })];
    if (dto.retentionDays) values.push(await this.db.setting.upsert({ where: { scopeType_scopeId_key: { scopeType: "CITY", scopeId: city.slug, key: "kyc.retention_days" } }, create: { scopeType: "CITY", scopeId: city.slug, key: "kyc.retention_days", valueJson: dto.retentionDays, updatedById: actor }, update: { valueJson: dto.retentionDays, updatedById: actor } }));
    await this.audit(req, actor, "technician.city_settings.updated", "city", cityId, { guarantorRequired: dto.guarantorRequired, retentionDays: dto.retentionDays, retentionNeedsCounselApproval: true }); return { city: city.slug, guarantorRequired: dto.guarantorRequired, retentionDays: dto.retentionDays || env.KYC_RETENTION_DAYS, retentionNeedsCounselApproval: true };
  }
  async cleanupRetention(now = new Date()) {
    const due = await this.db.technicianKyc.findMany({ where: { retentionAt: { lte: now }, clearedAt: null }, take: 200 });
    for (const row of due) {
      await Promise.all([row.idPhotoKey, row.selfieKey].filter((key): key is string => Boolean(key)).map((key) => this.storage.remove(key).catch(() => undefined)));
      await this.db.technicianKyc.update({ where: { id: row.id }, data: { idNumberEncrypted: null, idNumberBlindIndex: null, idPhotoKey: null, selfieKey: null, clearedAt: now, status: "RETAINED_RECORD", minimalVerificationRecord: "KYC data removed after configured retention window" } });
    }
    return due.length;
  }
}

@Controller("technician/onboarding")
@UseGuards(AccessGuard)
class TechnicianOnboardingController {
  constructor(@Inject(TechnicianService) private service: TechnicianService) {}
  @Get() get(@Req() req: AuthenticatedRequest) { return this.service.onboarding(req.authUser!.id); }
  @Patch() save(@Body() dto: ProfileDto, @Req() req: AuthenticatedRequest) { return this.service.saveOnboarding(req.authUser!.id, dto, req); }
  @Post("submit") submit(@Req() req: AuthenticatedRequest) { return this.service.submitProfile(req.authUser!.id, req); }
  @Post("kyc/consent") consent(@Body() dto: KycConsentDto, @Req() req: AuthenticatedRequest) { return this.service.kycConsent(req.authUser!.id, dto.accepted, req); }
  @Post("uploads/sign") @Throttle({ default: { limit: 10, ttl: 60_000 } }) sign(@Body() dto: UploadUrlDto, @Req() req: AuthenticatedRequest) { return this.service.uploadUrl(req.authUser!.id, dto.kind, dto.contentType, dto.size, req); }
  @Post("kyc/submit") @Throttle({ default: { limit: 5, ttl: 60_000 } }) submitKyc(@Body() dto: KycSubmitDto, @Req() req: AuthenticatedRequest) { return this.service.submitKyc(req.authUser!.id, dto, req); }
}

@Controller("admin/technicians")
@UseGuards(AccessGuard, PermissionGuard)
class AdminTechnicianController {
  constructor(@Inject(TechnicianService) private service: TechnicianService) {}
  @Get() @RequirePermissions("technician.review") queue(@Query() filters: { status?: string; areaId?: string; categoryId?: string; serviceId?: string; after?: string; before?: string; q?: string }) { return this.service.reviewQueue(filters); }
  @Get(":id") @RequirePermissions("technician.review") detail(@Param("id") id: string) { return this.service.technicianDetail(id); }
  @Post() @RequirePermissions("technician.review") manual(@Body() dto: ManualOnboardDto, @Req() req: AuthenticatedRequest) { return this.service.manualOnboard(dto, req.authUser!.id, req); }
  @Post(":id/review") @RequirePermissions("technician.review") review(@Param("id") id: string, @Body() dto: ReviewDto, @Req() req: AuthenticatedRequest) { const permission = dto.status === "APPROVED" ? "technician.approve" : ["REJECTED", "CHANGES_REQUESTED"].includes(dto.status) ? "technician.reject" : ["SUSPENDED", "REACTIVATED"].includes(dto.status) ? "technician.suspend" : "technician.review"; if (!req.authUser!.permissions.includes(permission)) throw new ForbiddenException("Permission required"); return this.service.review(id, dto, req.authUser!.id, req); }
  @Get(":id/kyc") @RequirePermissions("kyc.view") kyc(@Param("id") id: string, @Req() req: AuthenticatedRequest) { return this.service.kycReview(id, req.authUser!.id, req); }
  @Post(":id/kyc/reveal") @RequirePermissions("kyc.view_sensitive") reveal(@Param("id") id: string, @Body() dto: RevealDto, @Req() req: AuthenticatedRequest) { return this.service.revealKyc(id, dto.reason, req.authUser!.id, req); }
  @Get(":id/kyc/documents/:kind") @RequirePermissions("kyc.view") @Throttle({ default: { limit: 20, ttl: 60_000 } }) document(@Param("id") id: string, @Param("kind") kind: string, @Req() req: AuthenticatedRequest) { return this.service.kycDocument(id, kind, req.authUser!.id, req); }
  @Patch("cities/:cityId/settings") @RequirePermissions("technician.review") citySettings(@Param("cityId") cityId: string, @Body() dto: CitySettingDto, @Req() req: AuthenticatedRequest) { return this.service.setCitySettings(cityId, dto, req.authUser!.id, req); }
}

@Controller("technicians")
class PublicTechnicianController {
  constructor(@Inject(TechnicianService) private service: TechnicianService) {}
  @Get(":city") list(@Param("city") city: string, @Query() filters: { serviceId?: string; areaId?: string; day?: string; offset?: string; limit?: string }) { return this.service.publicListing(city, { ...filters, offset: Number(filters.offset), limit: Number(filters.limit) }); }
}

@Module({ imports: [AuthModule], controllers: [TechnicianOnboardingController, AdminTechnicianController, PublicTechnicianController], providers: [TechnicianService, PermissionGuard, PrivateObjectStorage] })
export class TechnicianModule {}
