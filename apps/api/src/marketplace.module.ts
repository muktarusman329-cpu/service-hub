import { BadRequestException, Body, ConflictException, Controller, Get, Inject, Injectable, Module, NotFoundException, Param, ParseUUIDPipe, Patch, Post, Query, Req, UseGuards } from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import { IsIn, IsInt, IsOptional, IsString, IsUUID, Length, Max, Min } from "class-validator";
import type { Request } from "express";
import { Prisma } from "@servicehub/db";
import { AuthModule } from "./auth.module";
import { PrismaService } from "./prisma.service";
import { AccessGuard, AuthenticatedRequest, digest, PermissionGuard, RequirePermissions } from "./security";

const listingCategories = ["clothing", "home-goods", "electronics", "books", "furniture", "other"] as const;
const listingConditions = ["NEW", "LIKE_NEW", "GOOD", "FAIR"] as const;

class CreateMarketListingDto {
  @IsString() @Length(4, 120) title!: string;
  @IsString() @Length(20, 2000) description!: string;
  @IsIn(listingCategories) category!: typeof listingCategories[number];
  @IsIn(listingConditions) condition!: typeof listingConditions[number];
  @IsInt() @Min(100) @Max(2_000_000_000) priceKobo!: number;
  @IsUUID() cityId!: string;
  @IsUUID() areaId!: string;
}

class ReviewMarketListingDto {
  @IsIn(["PUBLISHED", "REJECTED"]) status!: "PUBLISHED" | "REJECTED";
  @IsOptional() @IsString() @Length(0, 500) moderationNote?: string;
}

@Injectable()
class MarketplaceService {
  constructor(@Inject(PrismaService) private readonly db: PrismaService) {}

  private listingInclude = {
    seller: { select: { id: true, displayName: true } },
    city: { select: { name: true, slug: true } },
    area: { select: { name: true } },
  } satisfies Prisma.MarketListingInclude;

  async listPublic(input: { city: string; category?: string; q?: string }) {
    if (input.category && !listingCategories.includes(input.category as typeof listingCategories[number])) {
      throw new BadRequestException("Choose a valid marketplace category");
    }

    const city = await this.db.city.findUnique({ where: { slug: input.city }, select: { id: true, slug: true, name: true, isActive: true } });
    if (!city?.isActive) throw new BadRequestException("Marketplace is not available in this city yet");

    const q = input.q?.trim().slice(0, 100);
    const where: Prisma.MarketListingWhereInput = {
      cityId: city.id,
      status: "PUBLISHED",
      ...(input.category ? { category: input.category } : {}),
      ...(q ? { OR: [
        { title: { contains: q, mode: "insensitive" } },
        { description: { contains: q, mode: "insensitive" } },
        { area: { name: { contains: q, mode: "insensitive" } } },
      ] } : {}),
    };

    const [items, total] = await Promise.all([
      this.db.marketListing.findMany({ where, orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }], take: 60, include: this.listingInclude }),
      this.db.marketListing.count({ where }),
    ]);

    return { city, items, total };
  }

  async listing(id: string) {
    const listing = await this.db.marketListing.findFirst({ where: { id, status: "PUBLISHED" }, include: this.listingInclude });
    if (!listing) throw new NotFoundException("Listing not found");
    return listing;
  }

  async create(userId: string, dto: CreateMarketListingDto, req: Request) {
    const city = await this.db.city.findFirst({ where: { id: dto.cityId, isActive: true }, select: { id: true } });
    if (!city) throw new BadRequestException("Choose an active marketplace city");
    const area = await this.db.area.findFirst({ where: { id: dto.areaId, cityId: dto.cityId, isActive: true }, select: { id: true } });
    if (!area) throw new BadRequestException("Choose an active area in the selected city");

    const listing = await this.db.marketListing.create({
      data: {
        sellerId: userId,
        cityId: dto.cityId,
        areaId: dto.areaId,
        title: dto.title.trim(),
        description: dto.description.trim(),
        category: dto.category,
        condition: dto.condition,
        priceKobo: dto.priceKobo,
      },
      include: this.listingInclude,
    });

    await this.audit(req, userId, "marketplace.listing.submitted", listing.id, { category: listing.category });
    return listing;
  }

  async mine(userId: string) {
    return this.db.marketListing.findMany({
      where: { sellerId: userId },
      orderBy: { createdAt: "desc" },
      include: this.listingInclude,
    });
  }

  async markSold(userId: string, id: string, req: Request) {
    const listing = await this.db.marketListing.findFirst({ where: { id, sellerId: userId } });
    if (!listing) throw new NotFoundException("Listing not found");
    if (listing.status !== "PUBLISHED") throw new ConflictException("Only a published listing can be marked sold");

    const updated = await this.db.marketListing.update({ where: { id }, data: { status: "SOLD" }, include: this.listingInclude });
    await this.audit(req, userId, "marketplace.listing.sold", id);
    return updated;
  }

  async pending() {
    return this.db.marketListing.findMany({
      where: { status: "PENDING_REVIEW" },
      orderBy: { createdAt: "asc" },
      include: this.listingInclude,
    });
  }

  async review(id: string, dto: ReviewMarketListingDto, reviewerId: string, req: Request) {
    const existing = await this.db.marketListing.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException("Listing not found");
    if (existing.status !== "PENDING_REVIEW") throw new ConflictException("This listing has already been reviewed");

    const reviewedAt = new Date();
    const updated = await this.db.marketListing.update({
      where: { id },
      data: {
        status: dto.status,
        moderationNote: dto.moderationNote?.trim() || null,
        reviewedById: reviewerId,
        reviewedAt,
        publishedAt: dto.status === "PUBLISHED" ? reviewedAt : null,
      },
      include: this.listingInclude,
    });
    await this.audit(req, reviewerId, `marketplace.listing.${dto.status.toLowerCase()}`, id, { moderationNote: updated.moderationNote });
    return updated;
  }

  private async audit(req: Request, actorUserId: string, action: string, listingId: string, metadata?: object) {
    await this.db.auditLog.create({
      data: {
        actorUserId,
        action,
        entityType: "market_listing",
        entityId: listingId,
        ipHash: req.ip ? digest(req.ip) : null,
        userAgent: String(req.headers["user-agent"] || "").slice(0, 500),
        metadata,
      },
    });
  }
}

@Controller("marketplace/listings")
class PublicMarketplaceController {
  constructor(@Inject(MarketplaceService) private readonly marketplace: MarketplaceService) {}

  @Get()
  list(@Query("city") city = "minna", @Query("category") category?: string, @Query("q") q?: string) {
    return this.marketplace.listPublic({ city, category, q });
  }

  @Get(":id")
  listing(@Param("id", ParseUUIDPipe) id: string) {
    return this.marketplace.listing(id);
  }
}

@Controller("marketplace/mine")
@UseGuards(AccessGuard)
class SellerMarketplaceController {
  constructor(@Inject(MarketplaceService) private readonly marketplace: MarketplaceService) {}

  @Post("listings")
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  create(@Req() req: AuthenticatedRequest, @Body() dto: CreateMarketListingDto) {
    return this.marketplace.create(req.authUser!.id, dto, req);
  }

  @Get("listings")
  mine(@Req() req: AuthenticatedRequest) {
    return this.marketplace.mine(req.authUser!.id);
  }

  @Patch("listings/:id/sold")
  markSold(@Req() req: AuthenticatedRequest, @Param("id", ParseUUIDPipe) id: string) {
    return this.marketplace.markSold(req.authUser!.id, id, req);
  }
}

@Controller("admin/marketplace")
@UseGuards(AccessGuard, PermissionGuard)
class AdminMarketplaceController {
  constructor(@Inject(MarketplaceService) private readonly marketplace: MarketplaceService) {}

  @Get("pending")
  @RequirePermissions("marketplace.manage")
  pending() {
    return this.marketplace.pending();
  }

  @Patch("listings/:id/review")
  @RequirePermissions("marketplace.manage")
  review(@Req() req: AuthenticatedRequest, @Param("id", ParseUUIDPipe) id: string, @Body() dto: ReviewMarketListingDto) {
    return this.marketplace.review(id, dto, req.authUser!.id, req);
  }
}

@Module({
  imports: [AuthModule],
  controllers: [PublicMarketplaceController, SellerMarketplaceController, AdminMarketplaceController],
  providers: [MarketplaceService, PrismaService, PermissionGuard],
})
export class MarketplaceModule {}
