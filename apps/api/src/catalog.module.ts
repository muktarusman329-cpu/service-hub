import { BadRequestException, Body, Controller, Get, Inject, Injectable, Module, Param, Patch, Post, Query, Req, UseGuards } from "@nestjs/common";
import { IsBoolean, IsInt, IsNumber, IsOptional, IsString, Length, Max, Min } from "class-validator";
import type { Request } from "express";
import { PrismaService } from "./prisma.service";
import { AuthModule } from "./auth.module";
import { AccessGuard, AuthenticatedRequest, digest, PermissionGuard, RequirePermissions } from "./security";
import { validatePriceGuide } from "./technician-primitives";

class CategoryDto { @IsString() @Length(2, 120) name!: string; @IsString() @Length(2, 100) slug!: string; @IsOptional() @IsString() description?: string; @IsOptional() @IsString() iconKey?: string; @IsOptional() @IsInt() sortOrder?: number; @IsOptional() @IsBoolean() isActive?: boolean; @IsOptional() @IsBoolean() marketplaceOnly?: boolean; }
class ServiceDto extends CategoryDto { @IsString() categoryId!: string; }
class CategoryUpdateDto { @IsOptional() @IsString() @Length(2, 120) name?: string; @IsOptional() @IsString() @Length(2, 100) slug?: string; @IsOptional() @IsString() description?: string; @IsOptional() @IsString() iconKey?: string; @IsOptional() @IsInt() sortOrder?: number; @IsOptional() @IsBoolean() isActive?: boolean; @IsOptional() @IsBoolean() marketplaceOnly?: boolean; @IsOptional() @IsString() categoryId?: string; }
class PriceDto { @IsString() cityId!: string; @IsNumber() @Min(0) minPrice!: number; @IsNumber() @Min(0) maxPrice!: number; }
class CategoryFlagDto { @IsString() cityId!: string; @IsBoolean() enabled!: boolean; }

@Injectable()
class CatalogService {
  private cache = new Map<string, { expires: number; value: unknown }>();
  constructor(@Inject(PrismaService) private db: PrismaService) {}
  private async audit(req: Request, actor: string, action: string, type: string, id: string, before?: unknown, after?: unknown) {
    await this.db.auditLog.create({ data: { actorUserId: actor, action, entityType: type, entityId: id, ipHash: req.ip ? digest(req.ip) : null, userAgent: String(req.headers["user-agent"] || "").slice(0, 500), metadata: { before, after } as object } });
  }
  async publicCatalog(citySlug: string, offset: number, limit: number) {
    const cacheKey = `${citySlug}:${offset}:${limit}`; const cached = this.cache.get(cacheKey); if (cached && cached.expires > Date.now()) return cached.value;
    const city = await this.db.city.findUnique({ where: { slug: citySlug }, select: { id: true, slug: true, name: true, isActive: true } });
    if (!city?.isActive) throw new BadRequestException("City is not available yet");
    const categories = await this.db.category.findMany({ where: { isActive: true, cityFlags: { some: { cityId: city.id, enabled: true } } }, orderBy: [{ sortOrder: "asc" }, { name: "asc" }], skip: offset, take: limit, include: { services: { where: { isActive: true, cities: { some: { cityId: city.id, isActive: true } } }, orderBy: [{ sortOrder: "asc" }, { name: "asc" }], include: { prices: { where: { cityId: city.id }, select: { minPrice: true, maxPrice: true, currency: true, label: true } } } } } });
    const value = { city, items: categories.map((category) => ({ ...category, services: category.services.map(({ prices, ...service }) => ({ ...service, priceGuidance: prices[0] || null })) })), offset, limit };
    this.cache.set(cacheKey, { expires: Date.now() + 60_000, value }); return value;
  }
  async listCategories(citySlug = "minna") {
    const city = await this.db.city.findUnique({ where: { slug: citySlug }, select: { id: true, slug: true } });
    if (!city) throw new BadRequestException("City not found");
    const rows = await this.db.category.findMany({ orderBy: [{ sortOrder: "asc" }, { name: "asc" }], include: {
      cityFlags: { where: { cityId: city.id }, select: { enabled: true } },
      services: { orderBy: [{ sortOrder: "asc" }, { name: "asc" }], select: { id: true, name: true, slug: true, isActive: true, cities: { where: { cityId: city.id }, select: { isActive: true } }, prices: { where: { cityId: city.id }, select: { minPrice: true, maxPrice: true, currency: true, label: true } } } }
    } });
    return rows.map(({ cityFlags, services, ...category }) => ({ ...category, cityId: city.id, cityEnabled: cityFlags[0]?.enabled ?? false, services: services.map(({ cities, prices, ...service }) => ({ ...service, cityEnabled: cities[0]?.isActive ?? false, priceGuidance: prices[0] || null })) }));
  }
  async listAreas(citySlug: string) {
    const city = await this.db.city.findUnique({ where: { slug: citySlug }, select: { id: true, isActive: true } });
    if (!city?.isActive) throw new BadRequestException("City is not available yet");
    return this.db.area.findMany({ where: { cityId: city.id, isActive: true }, orderBy: { name: "asc" }, select: { id: true, name: true, slug: true } });
  }
  async createCategory(dto: CategoryDto, actor: string, req: Request) {
    const row = await this.db.category.create({ data: dto }); this.cache.clear(); await this.audit(req, actor, "catalog.category.created", "category", row.id, null, row); return row;
  }
  async updateCategory(id: string, dto: Partial<CategoryDto>, actor: string, req: Request) {
    const before = await this.db.category.findUnique({ where: { id } }); if (!before) throw new BadRequestException("Category not found");
    const row = await this.db.category.update({ where: { id }, data: dto }); this.cache.clear(); await this.audit(req, actor, "catalog.category.updated", "category", id, before, row); return row;
  }
  async createService(dto: ServiceDto, actor: string, req: Request) {
    const { categoryId, ...data } = dto; const row = await this.db.service.create({ data: { ...data, categoryId } }); this.cache.clear(); await this.audit(req, actor, "catalog.service.created", "service", row.id, null, row); return row;
  }
  async updateService(id: string, dto: Partial<ServiceDto>, actor: string, req: Request) {
    const before = await this.db.service.findUnique({ where: { id } }); if (!before) throw new BadRequestException("Service not found");
    const row = await this.db.service.update({ where: { id }, data: dto }); this.cache.clear(); await this.audit(req, actor, "catalog.service.updated", "service", id, before, row); return row;
  }
  async cityService(cityId: string, serviceId: string, active: boolean, actor: string, req: Request) {
    const before = await this.db.cityService.findUnique({ where: { cityId_serviceId: { cityId, serviceId } } });
    const row = await this.db.cityService.upsert({ where: { cityId_serviceId: { cityId, serviceId } }, create: { cityId, serviceId, isActive: active }, update: { isActive: active } });
    this.cache.clear(); await this.audit(req, actor, "catalog.city_service.updated", "service", serviceId, before, row); return row;
  }
  async setPrice(serviceId: string, dto: PriceDto, actor: string, req: Request) {
    validatePriceGuide(dto.minPrice, dto.maxPrice);
    const before = await this.db.priceGuidance.findUnique({ where: { cityId_serviceId: { cityId: dto.cityId, serviceId } } });
    const row = await this.db.priceGuidance.upsert({ where: { cityId_serviceId: { cityId: dto.cityId, serviceId } }, create: { ...dto, minPrice: dto.minPrice, maxPrice: dto.maxPrice, serviceId }, update: { minPrice: dto.minPrice, maxPrice: dto.maxPrice } });
    this.cache.clear(); await this.audit(req, actor, "catalog.price_guidance.updated", "price_guidance", row.id, before, row); return row;
  }
  async setCategoryFlag(id: string, categoryId: string, dto: CategoryFlagDto, actor: string, req: Request) {
    const before = await this.db.cityCategoryFlag.findUnique({ where: { cityId_categoryId: { cityId: dto.cityId, categoryId } } });
    const row = await this.db.cityCategoryFlag.upsert({ where: { cityId_categoryId: { cityId: dto.cityId, categoryId } }, create: { cityId: dto.cityId, categoryId, enabled: dto.enabled }, update: { enabled: dto.enabled } });
    this.cache.clear(); await this.audit(req, actor, "catalog.category_flag.updated", "category", categoryId, before, row); return row;
  }
}

@Controller("catalog")
class PublicCatalogController {
  constructor(@Inject(CatalogService) private service: CatalogService) {}
  @Get(":city/categories") categories(@Param("city") city: string, @Query("offset") offset = "0", @Query("limit") limit = "20") {
    const pageOffset = Math.max(0, Number.parseInt(offset, 10) || 0); const pageLimit = Math.min(50, Math.max(1, Number.parseInt(limit, 10) || 20));
    return this.service.publicCatalog(city, pageOffset, pageLimit);
  }
  @Get(":city/areas") areas(@Param("city") city: string) { return this.service.listAreas(city); }
}

@Controller("admin/catalog")
@UseGuards(AccessGuard, PermissionGuard)
class AdminCatalogController {
  constructor(@Inject(CatalogService) private service: CatalogService) {}
  @Get("categories") @RequirePermissions("catalog.manage") categories(@Query("city") city = "minna") { return this.service.listCategories(city); }
  @Post("categories") @RequirePermissions("catalog.manage") category(@Body() dto: CategoryDto, @Req() req: AuthenticatedRequest) { return this.service.createCategory(dto, req.authUser!.id, req); }
  @Patch("categories/:id") @RequirePermissions("catalog.manage") updateCategory(@Param("id") id: string, @Body() dto: CategoryUpdateDto, @Req() req: AuthenticatedRequest) { return this.service.updateCategory(id, dto, req.authUser!.id, req); }
  @Post("services") @RequirePermissions("catalog.manage") createService(@Body() dto: ServiceDto, @Req() req: AuthenticatedRequest) { return this.service.createService(dto, req.authUser!.id, req); }
  @Patch("services/:id") @RequirePermissions("catalog.manage") updateService(@Param("id") id: string, @Body() dto: CategoryUpdateDto, @Req() req: AuthenticatedRequest) { return this.service.updateService(id, dto, req.authUser!.id, req); }
  @Post("services/:id/cities") @RequirePermissions("catalog.manage") cityService(@Param("id") id: string, @Body() body: CategoryFlagDto, @Req() req: AuthenticatedRequest) { return this.service.cityService(body.cityId, id, body.enabled, req.authUser!.id, req); }
  @Post("services/:id/price-guidance") @RequirePermissions("catalog.manage") price(@Param("id") id: string, @Body() body: PriceDto, @Req() req: AuthenticatedRequest) { return this.service.setPrice(id, body, req.authUser!.id, req); }
  @Patch("categories/:id/cities") @RequirePermissions("catalog.manage") flag(@Param("id") id: string, @Body() body: CategoryFlagDto, @Req() req: AuthenticatedRequest) { return this.service.setCategoryFlag(id, id, body, req.authUser!.id, req); }
}

@Module({ imports: [AuthModule], controllers: [PublicCatalogController, AdminCatalogController], providers: [CatalogService, PrismaService, PermissionGuard] })
export class CatalogModule {}
