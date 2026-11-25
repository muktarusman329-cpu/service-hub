import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  APP_NAME: z.string().default("ServiceHub"),
  WEB_PORT: z.coerce.number().int().positive().default(3000),
  API_PORT: z.coerce.number().int().positive().default(4000),
  DATABASE_URL: z.string().url(),
  REDIS_URL: z.string().url(),
  NOTIFICATION_QUEUE_NAME: z.string().min(1).default("notifications"),
  S3_ENDPOINT: z.string().url(),
  S3_REGION: z.string().default("us-east-1"),
  S3_BUCKET: z.string().min(3),
  S3_ACCESS_KEY_ID: z.string().min(1),
  S3_SECRET_ACCESS_KEY: z.string().min(1),
  S3_FORCE_PATH_STYLE: z.stringbool().default(true),
  OTP_PRIMARY_CHANNEL: z.enum(["whatsapp", "termii", "email", "dev"]).default("dev"),
  OTP_FALLBACK_CHANNEL: z.enum(["whatsapp", "termii", "email", "dev"]).default("termii"),
  AUTH_ALLOW_UNVERIFIED_DEV: z.stringbool().default(false),
  JWT_ACCESS_SECRET: z.string().default("local-only-access-secret-change-before-deploy"),
  OTP_HASH_SECRET: z.string().default("local-only-otp-hash-secret-change-before-deploy"),
  APP_ORIGINS: z.string().default("http://localhost:3000"),
  AUTH_ACCESS_TTL_SECONDS: z.coerce.number().int().min(60).max(3600).default(600),
  AUTH_REFRESH_DAYS: z.coerce.number().int().min(1).max(90).default(30),
  OTP_RESEND_SECONDS: z.coerce.number().int().min(30).max(600).default(60),
  TERMS_VERSION: z.string().default("draft-1"),
  PRIVACY_VERSION: z.string().default("draft-1"),
  GOOGLE_CLIENT_ID: z.string().optional(),
  EMAIL_FROM: z.string().default("ServiceHub <no-reply@localhost>"),
  SEED_SUPER_ADMIN_EMAIL: z.preprocess((value) => value === "" ? undefined : value, z.string().email().optional()),
  SEED_SUPER_ADMIN_PHONE: z.string().optional(),
  EMAIL_PROVIDER: z.enum(["smtp", "resend"]).default("smtp"),
  SMTP_URL: z.string().optional(),
  RESEND_API_KEY: z.string().optional(),
  WHATSAPP_CLOUD_API_TOKEN: z.string().optional(),
  WHATSAPP_PHONE_NUMBER_ID: z.string().optional(),
  WHATSAPP_VERIFY_TOKEN: z.string().optional(),
  TERMII_API_KEY: z.string().optional(),
  TERMII_SENDER_ID: z.string().default("ServiceHub"),
  PAYSTACK_SECRET_KEY: z.string().optional(),
  FLUTTERWAVE_SECRET_KEY: z.string().optional(),
  APP_ENCRYPTION_KEY: z.string().optional(),
  KYC_ACTIVE_KEY_ID: z.string().min(1).default("local-v1"),
  KYC_KEYRING_JSON: z.string().default("{}"),
  KYC_BLIND_INDEX_SECRET: z.string().optional(),
  KYC_RETENTION_DAYS: z.coerce.number().int().min(1).max(3650).default(365),
  KYC_MAX_FILE_BYTES: z.coerce.number().int().min(1024).max(20_000_000).default(8_000_000),
  MAX_PORTFOLIO_PHOTOS: z.coerce.number().int().min(1).max(20).default(6),
  SESSION_SECRET: z.string().optional(),
  NEXT_PUBLIC_API_URL: z.string().url().default("http://localhost:4000/api/v1")
}).superRefine((value, ctx) => {
  if (!value.APP_ORIGINS.split(",").every((origin) => z.string().url().safeParse(origin.trim()).success)) ctx.addIssue({ code: "custom", path: ["APP_ORIGINS"], message: "Use a comma-separated list of valid origin URLs" });
  if (value.NODE_ENV !== "production") return;
  if (value.AUTH_ALLOW_UNVERIFIED_DEV) ctx.addIssue({ code: "custom", path: ["AUTH_ALLOW_UNVERIFIED_DEV"], message: "Development verification bypass cannot be enabled in production" });
  for (const key of ["APP_ENCRYPTION_KEY", "SESSION_SECRET", "JWT_ACCESS_SECRET", "OTP_HASH_SECRET"] as const) {
    if (!process.env[key] || value[key]!.length < 32 || value[key]!.includes("local-only")) ctx.addIssue({ code: "custom", path: [key], message: "Set a unique production secret of at least 32 characters" });
  }
  if (value.APP_ORIGINS.split(",").some((origin) => origin.trim().includes("localhost"))) ctx.addIssue({ code: "custom", path: ["APP_ORIGINS"], message: "Production origins must not use localhost" });
  for (const channel of new Set([value.OTP_PRIMARY_CHANNEL, value.OTP_FALLBACK_CHANNEL])) {
    if (channel === "dev") ctx.addIssue({ code: "custom", path: ["OTP_PRIMARY_CHANNEL"], message: "DEV OTP channel cannot be used in production" });
    if (channel === "whatsapp" && (!value.WHATSAPP_CLOUD_API_TOKEN || !value.WHATSAPP_PHONE_NUMBER_ID)) {
      ctx.addIssue({ code: "custom", path: ["WHATSAPP_CLOUD_API_TOKEN"], message: "Required when WhatsApp is configured as an OTP channel" });
    }
    if (channel === "termii" && !value.TERMII_API_KEY) {
      ctx.addIssue({ code: "custom", path: ["TERMII_API_KEY"], message: "Required when Termii is configured as an OTP channel" });
    }
    if (channel === "email" && value.EMAIL_PROVIDER === "smtp" && !value.SMTP_URL) {
      ctx.addIssue({ code: "custom", path: ["SMTP_URL"], message: "Required for email OTP when SMTP is selected" });
    }
    if (channel === "email" && value.EMAIL_PROVIDER === "resend" && !value.RESEND_API_KEY) {
      ctx.addIssue({ code: "custom", path: ["RESEND_API_KEY"], message: "Required for email OTP when Resend is selected" });
    }
  }
});

const parsed = envSchema.safeParse(process.env);
if (!parsed.success) {
  const details = parsed.error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`).join("\n");
  throw new Error(`Invalid environment configuration:\n${details}`);
}
export const env = parsed.data;
export type AppEnv = z.infer<typeof envSchema>;
