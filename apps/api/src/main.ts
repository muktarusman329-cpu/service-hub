import "reflect-metadata";
import { Controller, Get, Inject, Module, ServiceUnavailableException } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { NestFactory } from "@nestjs/core";
import { ValidationPipe } from "@nestjs/common";
import cookieParser from "cookie-parser";
import helmet from "helmet";
import { env } from "@servicehub/config/env";
import { AuthModule } from "./auth.module";
import { AdminModule } from "./admin.module";
import { CatalogModule } from "./catalog.module";
import { TechnicianModule } from "./technician.module";
import { JobsModule } from "./jobs.module";
import { MarketplaceModule } from "./marketplace.module";
import { JobsSocketAdapter } from "./jobs.gateway";
import { CsrfGuard } from "./security";
import { StructuredLogger } from "./structured-logger";
import { PrismaService } from "./prisma.service";
import Redis from "ioredis";

@Controller("health")
class HealthController {
  private readonly redis = new Redis(env.REDIS_URL, { lazyConnect: true, connectTimeout: 1200, maxRetriesPerRequest: 0, retryStrategy: (attempt) => attempt > 2 ? null : 250 * attempt });
  constructor(@Inject(PrismaService) private readonly db: PrismaService) {}
  @Get("live")
  live() { return { status: "ok", service: "servicehub-api", timestamp: new Date().toISOString() }; }
  @Get("ready")
  async ready() {
    const [postgres, redis] = await Promise.allSettled([
      this.db.$queryRaw`SELECT 1`,
      (async () => { if (this.redis.status === "wait") await this.redis.connect(); return this.redis.ping(); })()
    ]);
    const dependencies = { postgres: postgres.status === "fulfilled" ? "ok" : "unavailable", redis: redis.status === "fulfilled" ? "ok" : "unavailable" };
    if (postgres.status === "rejected" || redis.status === "rejected") throw new ServiceUnavailableException({ status: "not_ready", dependencies });
    return { status: "ready", dependencies };
  }
  async onModuleDestroy() { await this.redis.quit().catch(() => undefined); }
  @Get()
  health() { return this.live(); }
}

@Module({
  imports: [AuthModule, AdminModule, CatalogModule, TechnicianModule, JobsModule, MarketplaceModule],
  controllers: [HealthController],
  providers: [{ provide: APP_GUARD, useClass: CsrfGuard }, PrismaService]
})
class AppModule {}

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true, logger: new StructuredLogger() });
  app.useWebSocketAdapter(app.get(JobsSocketAdapter));
  app.setGlobalPrefix("api/v1");
  app.use(cookieParser());
  app.use(helmet({ contentSecurityPolicy: { directives: {
    defaultSrc: ["'self'"], baseUri: ["'self'"], objectSrc: ["'none'"], frameAncestors: ["'none'"],
    imgSrc: ["'self'", "data:", "blob:"], fontSrc: ["'self'", "data:"], styleSrc: ["'self'", "'unsafe-inline'"],
    scriptSrc: env.NODE_ENV === "production" ? ["'self'"] : ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
    connectSrc: ["'self'", ...env.APP_ORIGINS.split(",").map((origin) => origin.trim()), new URL(env.S3_ENDPOINT).origin]
  } } }));
  const allowedOrigins = new Set(env.APP_ORIGINS.split(",").map((origin) => origin.trim()));
  app.enableCors({ origin: (origin: string | undefined, callback: (error: Error | null, allowed?: boolean) => void) => callback(null, !origin || allowedOrigins.has(origin)), credentials: true, methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"], allowedHeaders: ["Content-Type", "Authorization", "X-CSRF-Token"] });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true, forbidNonWhitelisted: true, forbidUnknownValues: true }));
  await app.listen(env.API_PORT);
}
void bootstrap();
