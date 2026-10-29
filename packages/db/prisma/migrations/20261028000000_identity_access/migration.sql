-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'DELETED');

-- CreateEnum
CREATE TYPE "OtpPurpose" AS ENUM ('SIGN_IN', 'SIGN_UP', 'VERIFY_EMAIL', 'LINK_PHONE', 'LINK_EMAIL', 'PASSWORD_RESET');

-- CreateEnum
CREATE TYPE "OtpChannel" AS ENUM ('WHATSAPP', 'SMS', 'EMAIL', 'DEV');

-- CreateEnum
CREATE TYPE "OAuthProvider" AS ENUM ('GOOGLE');

-- CreateEnum
CREATE TYPE "ConsentPurpose" AS ENUM ('TERMS', 'PRIVACY', 'MARKETING');

-- CreateEnum
CREATE TYPE "TechnicianApprovalStatus" AS ENUM ('PENDING_APPROVAL', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "DataRequestType" AS ENUM ('EXPORT', 'DELETE');

-- CreateEnum
CREATE TYPE "DataRequestStatus" AS ENUM ('REQUESTED', 'VERIFIED', 'PROCESSING', 'COMPLETED', 'REJECTED');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "phone_e164" VARCHAR(20),
    "email" VARCHAR(320),
    "display_name" VARCHAR(120),
    "password_hash" TEXT,
    "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',
    "preferred_otp_channel" "OtpChannel",
    "phone_verified_at" TIMESTAMPTZ(6),
    "email_verified_at" TIMESTAMPTZ(6),
    "locale" VARCHAR(12) NOT NULL DEFAULT 'en',
    "totp_secret_encrypted" TEXT,
    "totp_enabled_at" TIMESTAMPTZ(6),
    "recovery_code_hashes" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "oauth_accounts" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "provider" "OAuthProvider" NOT NULL,
    "provider_subject" VARCHAR(255) NOT NULL,
    "email" VARCHAR(320),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "oauth_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "otp_codes" (
    "id" UUID NOT NULL,
    "user_id" UUID,
    "destination_hash" VARCHAR(64) NOT NULL,
    "purpose" "OtpPurpose" NOT NULL,
    "code_hash" VARCHAR(64) NOT NULL,
    "channel" "OtpChannel" NOT NULL,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "attempt_count" INTEGER NOT NULL DEFAULT 0,
    "consumed_at" TIMESTAMPTZ(6),
    "metadata" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "otp_codes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "family_id" UUID NOT NULL,
    "refresh_token_hash" VARCHAR(64) NOT NULL,
    "device_label" VARCHAR(160),
    "ip_hash" VARCHAR(64),
    "user_agent" VARCHAR(500),
    "last_seen_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" TIMESTAMPTZ(6) NOT NULL,
    "revoked_at" TIMESTAMPTZ(6),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "roles" (
    "id" UUID NOT NULL,
    "key" VARCHAR(60) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "description" TEXT,
    "is_system" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "permissions" (
    "id" UUID NOT NULL,
    "key" VARCHAR(120) NOT NULL,
    "description" TEXT,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "permissions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "role_permissions" (
    "role_id" UUID NOT NULL,
    "permission_id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "role_permissions_pkey" PRIMARY KEY ("role_id","permission_id")
);

-- CreateTable
CREATE TABLE "user_roles" (
    "user_id" UUID NOT NULL,
    "role_id" UUID NOT NULL,
    "assigned_by" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_roles_pkey" PRIMARY KEY ("user_id","role_id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" UUID NOT NULL,
    "actor_user_id" UUID,
    "action" VARCHAR(120) NOT NULL,
    "entity_type" VARCHAR(100),
    "entity_id" VARCHAR(100),
    "ip_hash" VARCHAR(64),
    "user_agent" VARCHAR(500),
    "metadata" JSONB,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "consents" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "purpose" "ConsentPurpose" NOT NULL,
    "policy_version" VARCHAR(40) NOT NULL,
    "granted" BOOLEAN NOT NULL,
    "captured_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "withdrawn_at" TIMESTAMPTZ(6),
    "source" VARCHAR(40) NOT NULL DEFAULT 'web',
    "evidence" JSONB,

    CONSTRAINT "consents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cities" (
    "id" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "slug" VARCHAR(120) NOT NULL,
    "country_code" CHAR(2) NOT NULL DEFAULT 'NG',
    "currency_code" CHAR(3) NOT NULL DEFAULT 'NGN',
    "timezone" VARCHAR(50) NOT NULL DEFAULT 'Africa/Lagos',
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "cities_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "areas" (
    "id" UUID NOT NULL,
    "city_id" UUID NOT NULL,
    "parent_area_id" UUID,
    "name" VARCHAR(100) NOT NULL,
    "slug" VARCHAR(120) NOT NULL,
    "center_lat" DECIMAL(9,6),
    "center_lng" DECIMAL(9,6),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "areas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "technician_profiles" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "approval_status" "TechnicianApprovalStatus" NOT NULL DEFAULT 'PENDING_APPROVAL',
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,
    "deleted_at" TIMESTAMPTZ(6),

    CONSTRAINT "technician_profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "data_subject_requests" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "completed_by" UUID,
    "request_type" "DataRequestType" NOT NULL,
    "status" "DataRequestStatus" NOT NULL DEFAULT 'REQUESTED',
    "requested_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "verified_at" TIMESTAMPTZ(6),
    "completed_at" TIMESTAMPTZ(6),
    "export_object_key" TEXT,
    "expires_at" TIMESTAMPTZ(6),
    "decision_note" TEXT,

    CONSTRAINT "data_subject_requests_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" UUID NOT NULL,
    "user_id" UUID,
    "destination_hash" VARCHAR(64) NOT NULL,
    "channel" "OtpChannel" NOT NULL,
    "template_key" VARCHAR(80) NOT NULL,
    "status" VARCHAR(20) NOT NULL DEFAULT 'QUEUED',
    "provider_reference" TEXT,
    "attempt_count" INTEGER NOT NULL DEFAULT 0,
    "scheduled_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "sent_at" TIMESTAMPTZ(6),
    "last_error_code" VARCHAR(80),
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notification_preferences" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "channel" "OtpChannel" NOT NULL,
    "event_key" VARCHAR(80) NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "notification_preferences_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "settings" (
    "id" UUID NOT NULL,
    "key" VARCHAR(120) NOT NULL,
    "value_json" JSONB NOT NULL,
    "scope_type" VARCHAR(30) NOT NULL DEFAULT 'GLOBAL',
    "scope_id" VARCHAR(100) NOT NULL DEFAULT 'global',
    "updated_by" UUID,
    "created_at" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(6) NOT NULL,

    CONSTRAINT "settings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_phone_e164_key" ON "users"("phone_e164");

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE INDEX "users_status_created_at_idx" ON "users"("status", "created_at");

-- CreateIndex
CREATE INDEX "oauth_accounts_user_id_provider_idx" ON "oauth_accounts"("user_id", "provider");

-- CreateIndex
CREATE UNIQUE INDEX "oauth_accounts_provider_provider_subject_key" ON "oauth_accounts"("provider", "provider_subject");

-- CreateIndex
CREATE INDEX "otp_codes_destination_hash_purpose_created_at_idx" ON "otp_codes"("destination_hash", "purpose", "created_at" DESC);

-- CreateIndex
CREATE INDEX "otp_codes_expires_at_idx" ON "otp_codes"("expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_refresh_token_hash_key" ON "sessions"("refresh_token_hash");

-- CreateIndex
CREATE INDEX "sessions_user_id_revoked_at_idx" ON "sessions"("user_id", "revoked_at");

-- CreateIndex
CREATE INDEX "sessions_family_id_revoked_at_idx" ON "sessions"("family_id", "revoked_at");

-- CreateIndex
CREATE INDEX "sessions_expires_at_idx" ON "sessions"("expires_at");

-- CreateIndex
CREATE UNIQUE INDEX "roles_key_key" ON "roles"("key");

-- CreateIndex
CREATE UNIQUE INDEX "permissions_key_key" ON "permissions"("key");

-- CreateIndex
CREATE INDEX "role_permissions_permission_id_role_id_idx" ON "role_permissions"("permission_id", "role_id");

-- CreateIndex
CREATE INDEX "user_roles_role_id_user_id_idx" ON "user_roles"("role_id", "user_id");

-- CreateIndex
CREATE INDEX "user_roles_assigned_by_idx" ON "user_roles"("assigned_by");

-- CreateIndex
CREATE INDEX "audit_logs_actor_user_id_created_at_idx" ON "audit_logs"("actor_user_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "audit_logs_entity_type_entity_id_created_at_idx" ON "audit_logs"("entity_type", "entity_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "audit_logs_action_created_at_idx" ON "audit_logs"("action", "created_at" DESC);

-- CreateIndex
CREATE INDEX "consents_user_id_purpose_captured_at_idx" ON "consents"("user_id", "purpose", "captured_at" DESC);

-- CreateIndex
CREATE INDEX "consents_policy_version_purpose_idx" ON "consents"("policy_version", "purpose");

-- CreateIndex
CREATE UNIQUE INDEX "cities_slug_key" ON "cities"("slug");

-- CreateIndex
CREATE INDEX "cities_is_active_name_idx" ON "cities"("is_active", "name");

-- CreateIndex
CREATE UNIQUE INDEX "cities_country_code_slug_key" ON "cities"("country_code", "slug");

-- CreateIndex
CREATE INDEX "areas_city_id_is_active_name_idx" ON "areas"("city_id", "is_active", "name");

-- CreateIndex
CREATE INDEX "areas_parent_area_id_idx" ON "areas"("parent_area_id");

-- CreateIndex
CREATE UNIQUE INDEX "areas_city_id_slug_key" ON "areas"("city_id", "slug");

-- CreateIndex
CREATE UNIQUE INDEX "technician_profiles_user_id_key" ON "technician_profiles"("user_id");

-- CreateIndex
CREATE INDEX "technician_profiles_approval_status_created_at_idx" ON "technician_profiles"("approval_status", "created_at");

-- CreateIndex
CREATE INDEX "data_subject_requests_user_id_requested_at_idx" ON "data_subject_requests"("user_id", "requested_at" DESC);

-- CreateIndex
CREATE INDEX "data_subject_requests_status_requested_at_idx" ON "data_subject_requests"("status", "requested_at");

-- CreateIndex
CREATE INDEX "data_subject_requests_expires_at_idx" ON "data_subject_requests"("expires_at");

-- CreateIndex
CREATE INDEX "notifications_user_id_created_at_idx" ON "notifications"("user_id", "created_at" DESC);

-- CreateIndex
CREATE INDEX "notifications_status_scheduled_at_idx" ON "notifications"("status", "scheduled_at");

-- CreateIndex
CREATE INDEX "notifications_provider_reference_idx" ON "notifications"("provider_reference");

-- CreateIndex
CREATE INDEX "notification_preferences_channel_event_key_enabled_idx" ON "notification_preferences"("channel", "event_key", "enabled");

-- CreateIndex
CREATE UNIQUE INDEX "notification_preferences_user_id_channel_event_key_key" ON "notification_preferences"("user_id", "channel", "event_key");

-- CreateIndex
CREATE INDEX "settings_scope_type_scope_id_idx" ON "settings"("scope_type", "scope_id");

-- CreateIndex
CREATE INDEX "settings_updated_by_idx" ON "settings"("updated_by");

-- CreateIndex
CREATE UNIQUE INDEX "settings_scope_type_scope_id_key_key" ON "settings"("scope_type", "scope_id", "key");

-- AddForeignKey
ALTER TABLE "oauth_accounts" ADD CONSTRAINT "oauth_accounts_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "otp_codes" ADD CONSTRAINT "otp_codes_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "role_permissions" ADD CONSTRAINT "role_permissions_permission_id_fkey" FOREIGN KEY ("permission_id") REFERENCES "permissions"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_role_id_fkey" FOREIGN KEY ("role_id") REFERENCES "roles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "user_roles" ADD CONSTRAINT "user_roles_assigned_by_fkey" FOREIGN KEY ("assigned_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actor_user_id_fkey" FOREIGN KEY ("actor_user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "consents" ADD CONSTRAINT "consents_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "areas" ADD CONSTRAINT "areas_city_id_fkey" FOREIGN KEY ("city_id") REFERENCES "cities"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "areas" ADD CONSTRAINT "areas_parent_area_id_fkey" FOREIGN KEY ("parent_area_id") REFERENCES "areas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "technician_profiles" ADD CONSTRAINT "technician_profiles_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "data_subject_requests" ADD CONSTRAINT "data_subject_requests_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "data_subject_requests" ADD CONSTRAINT "data_subject_requests_completed_by_fkey" FOREIGN KEY ("completed_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_preferences" ADD CONSTRAINT "notification_preferences_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "settings" ADD CONSTRAINT "settings_updated_by_fkey" FOREIGN KEY ("updated_by") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;


ALTER TABLE "otp_codes" ADD CONSTRAINT "otp_codes_attempt_count_check" CHECK ("attempt_count" BETWEEN 0 AND 5);
ALTER TABLE "users" ADD CONSTRAINT "users_login_identifier_check" CHECK ("status" <> 'ACTIVE' OR "phone_e164" IS NOT NULL OR "email" IS NOT NULL);
ALTER TABLE "data_subject_requests" ADD CONSTRAINT "data_subject_requests_completed_check" CHECK ("status" <> 'COMPLETED' OR "completed_at" IS NOT NULL);
CREATE FUNCTION prevent_audit_log_mutation() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'append-only records cannot be changed'; END; $$;
CREATE TRIGGER audit_logs_append_only BEFORE UPDATE OR DELETE ON "audit_logs" FOR EACH ROW EXECUTE FUNCTION prevent_audit_log_mutation();
CREATE TRIGGER consents_append_only BEFORE UPDATE OR DELETE ON "consents" FOR EACH ROW EXECUTE FUNCTION prevent_audit_log_mutation();
