import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { ForbiddenException } from "@nestjs/common";
import type { ExecutionContext } from "@nestjs/common";
import type { Reflector } from "@nestjs/core";
import type { PrismaService } from "./prisma.service";
import { PermissionGuard } from "./security";

function context(userId = "user-1") {
  return {
    getHandler: () => () => undefined,
    getClass: () => class TestController {},
    switchToHttp: () => ({ getRequest: () => ({ authUser: { id: userId } }) })
  } as unknown as ExecutionContext;
}

describe("PermissionGuard", () => {
  it("allows a request when the role grants every required permission", async () => {
    const reflector = { getAllAndOverride: () => ["users.read", "roles.read"] } as unknown as Reflector;
    const db = { userRole: { findMany: async () => [{ role: { permissions: [{ permission: { key: "users.read" } }, { permission: { key: "roles.read" } }] } }] } } as unknown as PrismaService;
    assert.equal(await new PermissionGuard(reflector, db).canActivate(context()), true);
  });

  it("rejects a missing permission and refreshes cached permissions after invalidation", async () => {
    let granted = true;
    const reflector = { getAllAndOverride: () => ["roles.manage"] } as unknown as Reflector;
    const db = { userRole: { findMany: async () => [{ role: { permissions: granted ? [{ permission: { key: "roles.manage" } }] : [] } }] } } as unknown as PrismaService;
    const guard = new PermissionGuard(reflector, db);
    assert.equal(await guard.canActivate(context()), true);
    granted = false;
    guard.invalidate("user-1");
    await assert.rejects(guard.canActivate(context()), (error: unknown) => error instanceof ForbiddenException);
  });
});
