-- Add user verification and profile setup fields expected by the current Prisma schema.
CREATE TYPE "VerificationMethod" AS ENUM ('VERIFIED', 'DEV_UNVERIFIED');

ALTER TABLE "users"
  ADD COLUMN "verification_method" "VerificationMethod" NOT NULL DEFAULT 'VERIFIED',
  ADD COLUMN "profile_setup_completed" BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN "profile_preferences" JSONB;
