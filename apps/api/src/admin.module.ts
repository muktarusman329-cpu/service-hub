import { Body, Controller, Get, Inject, Injectable, Module, Param, Patch, Post, Query, Req, UseGuards, BadRequestException } from "@nestjs/common";
import { ArrayUnique, IsArray, IsIn, IsOptional, IsString, Length } from "class-validator";
import type { Request } from "express";
import { PrismaService } from "./prisma.service";
import { AuthModule } from "./auth.module";
import { AccessGuard, AuthenticatedRequest, digest, PermissionGuard, RequirePermissions } from "./security";

class AccountStatusDto { @IsIn(["ACTIVE", "SUSPENDED"]) status!: "ACTIVE" | "SUSPENDED"; }
class AssignRoleDto { @IsString() roleKey!: string; }
class RoleCreateDto { @IsString() @Length(2, 60) key!: string; @IsString() @Length(2, 100) name!: string; @IsOptional() @IsString() description?: string; }
class PermissionCreateDto { @IsString() @Length(3, 120) key!: string; @IsOptional() @IsString() description?: string; }
class RolePermissionDto { @IsArray() @ArrayUnique() @IsString({ each: true }) permissionKeys!: string[]; }
class DataRequestReviewDto { @IsIn(["VERIFIED", "PROCESSING", "REJECTED", "COMPLETED"]) status!: "VERIFIED" | "PROCESSING" | "REJECTED" | "COMPLETED"; @IsOptional() @IsString() decisionNote?: string; }

@Injectable()
class AdminService {
  constructor(@Inject(PrismaService) private db: PrismaService, @Inject(PermissionGuard) private permissions: PermissionGuard) {}
  private async audit(req: Request, actorId: string, action: string, entityType: string, entityId: string, metadata?: object) {
    await this.db.auditLog.create({ data: { actorUserId: actorId, action, entityType, entityId, ipHash: req.ip ? digest(req.ip) : null, userAgent: String(req.headers["user-agent"] || "").slice(0, 500), metadata } });
  }
  async users(query: string | undefined, actorId: string, req: Request) {
    await this.audit(req, actorId, "admin.users.read", "user", "list", { filtered: !!query });
    return this.db.user.findMany({ where: { deletedAt: null, ...(query ? { OR: [{ email: { contains: query, mode: "insensitive" as const } }, { phoneE164: { contains: query } }, { displayName: { contains: query, mode: "insensitive" as const } }] } : {}) }, select: { id: true, phoneE164: true, email: true, displayName: true, status: true, createdAt: true, roles: { include: { role: { select: { key: true } } } } }, take: 50, orderBy: { createdAt: "desc" } });
  }
  async setStatus(actorId: string, userId: string, status: "ACTIVE" | "SUSPENDED", req: Request) {
    const existing = await this.db.user.findUnique({ where: { id: userId }, select: { id: true, status: true, deletedAt: true } });
    if (!existing || existing.deletedAt) throw new BadRequestException("User not found");
    const updated = await this.db.user.update({ where: { id: userId }, data: { status } });
    if (status === "SUSPENDED") await this.db.session.updateMany({ where: { userId, revokedAt: null }, data: { revokedAt: new Date() } });
    this.permissions.invalidate(userId);
    await this.audit(req, actorId, status === "SUSPENDED" ? "admin.user.suspended" : "admin.user.reactivated", "user", userId, { before: existing.status, after: status });
    return { id: updated.id, status: updated.status };
  }
  async listRoles(actorId: string, req: Request) { await this.audit(req, actorId, "admin.roles.read", "role", "list"); return this.db.role.findMany({ include: { permissions: { include: { permission: true } } }, orderBy: { key: "asc" } }); }
  async listPermissions(actorId: string, req: Request) { await this.audit(req, actorId, "admin.permissions.read", "permission", "list"); return this.db.permission.findMany({ orderBy: { key: "asc" } }); }
  async createRole(actorId: string, dto: RoleCreateDto, req: Request) {
    const role = await this.db.role.create({ data: { key: dto.key.toUpperCase(), name: dto.name, description: dto.description, isSystem: false } });
    await this.audit(req, actorId, "admin.role.created", "role", role.id, { key: role.key }); return role;
  }
  async createPermission(actorId: string, dto: PermissionCreateDto, req: Request) {
    const permission = await this.db.permission.create({ data: { key: dto.key, description: dto.description } });
    await this.audit(req, actorId, "admin.permission.created", "permission", permission.id, { key: permission.key }); return permission;
  }
  async setRolePermissions(actorId: string, key: string, permissionKeys: string[], req: Request) {
    const role = await this.db.role.findUnique({ where: { key } });
    if (!role) throw new BadRequestException("Role not found");
    const rows = await this.db.permission.findMany({ where: { key: { in: permissionKeys } }, select: { id: true, key: true } });
    if (rows.length !== permissionKeys.length) throw new BadRequestException("One or more permissions were not found");
    const before = await this.db.rolePermission.findMany({ where: { roleId: role.id }, select: { permission: { select: { key: true } } } });
    await this.db.$transaction([
      this.db.rolePermission.deleteMany({ where: { roleId: role.id } }),
      ...rows.map((permission) => this.db.rolePermission.create({ data: { roleId: role.id, permissionId: permission.id } }))
    ]);
    this.permissions.invalidate();
    await this.audit(req, actorId, "admin.role.permissions_updated", "role", role.id, { before: before.map((r) => r.permission.key), after: permissionKeys });
    return { roleKey: key, permissionKeys };
  }
  async assignRole(actorId: string, userId: string, roleKey: string, req: Request) {
    const [role, user] = await Promise.all([this.db.role.findUnique({ where: { key: roleKey } }), this.db.user.findUnique({ where: { id: userId }, select: { id: true } })]);
    if (!role || !user) throw new BadRequestException("User or role not found");
    await this.db.userRole.upsert({ where: { userId_roleId: { userId, roleId: role.id } }, update: {}, create: { userId, roleId: role.id, assignedBy: actorId } });
    this.permissions.invalidate(userId);
    await this.audit(req, actorId, "admin.user.role_assigned", "user", userId, { roleKey }); return { ok: true };
  }
  async revokeRole(actorId: string, userId: string, roleKey: string, req: Request) {
    const role = await this.db.role.findUnique({ where: { key: roleKey } });
    if (!role) throw new BadRequestException("Role not found");
    await this.db.userRole.deleteMany({ where: { userId, roleId: role.id } });
    this.permissions.invalidate(userId);
    await this.audit(req, actorId, "admin.user.role_removed", "user", userId, { roleKey }); return { ok: true };
  }
  async auditLogs(query: { actor?: string; action?: string; entityId?: string; after?: string; before?: string }, actorId: string, req: Request) {
    await this.audit(req, actorId, "admin.audit.read", "audit_log", "list", { filtered: !!(query.actor || query.action || query.entityId) });
    return this.db.auditLog.findMany({ where: { ...(query.actor ? { actorUserId: query.actor } : {}), ...(query.action ? { action: { contains: query.action } } : {}), ...(query.entityId ? { entityId: query.entityId } : {}), createdAt: { ...(query.after ? { gte: new Date(query.after) } : {}), ...(query.before ? { lte: new Date(query.before) } : {}) } }, orderBy: { createdAt: "desc" }, take: 100 });
  }
  async dataRequests(actorId: string, req: Request) { await this.audit(req, actorId, "admin.privacy_requests.read", "data_subject_request", "list"); return this.db.dataSubjectRequest.findMany({ include: { user: { select: { id: true, email: true, phoneE164: true } } }, orderBy: { requestedAt: "asc" }, take: 100 }); }
  async reviewDataRequest(actorId: string, id: string, dto: DataRequestReviewDto, req: Request) {
    const existing = await this.db.dataSubjectRequest.findUnique({ where: { id } });
    if (!existing || ["COMPLETED", "REJECTED"].includes(existing.status)) throw new BadRequestException("Request is not available for review");
    if (dto.status === "COMPLETED" && dto.decisionNote?.trim().length === 0) throw new BadRequestException("Add a completion note");
    const result = await this.db.dataSubjectRequest.update({ where: { id }, data: { status: dto.status, decisionNote: dto.decisionNote?.slice(0, 500), reviewerId: actorId, ...(dto.status === "COMPLETED" || dto.status === "REJECTED" ? { completedAt: new Date() } : {}) } });
    await this.audit(req, actorId, "admin.privacy_request.updated", "data_subject_request", id, { before: existing.status, after: dto.status, requestType: existing.requestType });
    return { id: result.id, status: result.status, completedAt: result.completedAt };
  }
}

@Controller("admin")
@UseGuards(AccessGuard, PermissionGuard)
class AdminController {
  constructor(@Inject(AdminService) private admin: AdminService) {}
  @Get("users") @RequirePermissions("users.read") users(@Query("q") query: string | undefined, @Req() req: AuthenticatedRequest) { return this.admin.users(query?.slice(0, 100), req.authUser!.id, req); }
  @Patch("users/:id/status") @RequirePermissions("users.manage") status(@Param("id") id: string, @Body() body: AccountStatusDto, @Req() req: AuthenticatedRequest) { return this.admin.setStatus(req.authUser!.id, id, body.status, req); }
  @Post("users/:id/roles") @RequirePermissions("roles.manage") assignRole(@Param("id") id: string, @Body() body: AssignRoleDto, @Req() req: AuthenticatedRequest) { return this.admin.assignRole(req.authUser!.id, id, body.roleKey, req); }
  @Post("users/:id/roles/:key/remove") @RequirePermissions("roles.manage") revokeRole(@Param("id") id: string, @Param("key") key: string, @Req() req: AuthenticatedRequest) { return this.admin.revokeRole(req.authUser!.id, id, key, req); }
  @Get("roles") @RequirePermissions("roles.read") roles(@Req() req: AuthenticatedRequest) { return this.admin.listRoles(req.authUser!.id, req); }
  @Get("permissions") @RequirePermissions("roles.read") permissions(@Req() req: AuthenticatedRequest) { return this.admin.listPermissions(req.authUser!.id, req); }
  @Post("roles") @RequirePermissions("roles.manage") createRole(@Body() body: RoleCreateDto, @Req() req: AuthenticatedRequest) { return this.admin.createRole(req.authUser!.id, body, req); }
  @Post("permissions") @RequirePermissions("roles.manage") createPermission(@Body() body: PermissionCreateDto, @Req() req: AuthenticatedRequest) { return this.admin.createPermission(req.authUser!.id, body, req); }
  @Patch("roles/:key/permissions") @RequirePermissions("roles.manage") setRolePermissions(@Param("key") key: string, @Body() body: RolePermissionDto, @Req() req: AuthenticatedRequest) { return this.admin.setRolePermissions(req.authUser!.id, key, body.permissionKeys, req); }
  @Get("audit") @RequirePermissions("audit.read") audit(@Query() query: { actor?: string; action?: string; entityId?: string; after?: string; before?: string }, @Req() req: AuthenticatedRequest) { return this.admin.auditLogs(query, req.authUser!.id, req); }
  @Get("data-requests") @RequirePermissions("privacy.requests.manage") dataRequests(@Req() req: AuthenticatedRequest) { return this.admin.dataRequests(req.authUser!.id, req); }
  @Patch("data-requests/:id") @RequirePermissions("privacy.requests.manage") reviewDataRequest(@Param("id") id: string, @Body() body: DataRequestReviewDto, @Req() req: AuthenticatedRequest) { return this.admin.reviewDataRequest(req.authUser!.id, id, body, req); }
}

@Module({ imports: [AuthModule], controllers: [AdminController], providers: [AdminService, PermissionGuard] })
export class AdminModule {}
