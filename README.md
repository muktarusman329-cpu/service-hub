# ServiceHub

Minna-first services marketplace. Phase 1 provides a responsive design system and role shells. Phase 2 adds identity, OTP sign-in, sessions, two-step verification, permission-based admin access and audit history. Phase 3 adds the city-configurable service catalog, technician onboarding, private KYC storage and admin approval. Booking and payment processing remain out of scope until the next phases are approved.

## Run locally

Requirements: Node.js 22 (or newer) and Corepack. Docker Desktop is the quickest option; the Windows local fallback is documented below.

1. Enable Corepack and activate the repository-pinned pnpm version: `corepack enable` then `corepack prepare pnpm@11.25.0 --activate`.
2. Copy `.env.example` to `.env` and adjust values only when needed for local development.
3. Set `SEED_SUPER_ADMIN_PHONE` or `SEED_SUPER_ADMIN_EMAIL` in `.env` before seeding.
4. Install dependencies: `pnpm install`.
5. Start local infrastructure: `docker compose up -d` (PostgreSQL, Redis, MinIO, private bucket and Mailpit). If Docker Desktop cannot start, use the Windows fallback below.
6. Apply the identity migration and create launch roles/areas: `pnpm --filter @servicehub/db db:deploy` then `pnpm --filter @servicehub/db db:seed`.
7. Start web and API: `pnpm dev`.

On Windows, if `corepack enable` cannot write shims beside a Node.js installation under `Program Files`, run that step from an elevated terminal or point `--install-directory` to a user-writable folder and add that folder to `PATH`.
Open `http://localhost:3000` for the design-system preview. Sign-in is at `/sign-in`; account security is at `/account/security`. The role shells are at `/app`, `/technician` and `/admin`. API liveness is `http://localhost:4000/api/v1/health/live`; readiness is `http://localhost:4000/api/v1/health/ready`. Mailpit is at `http://localhost:8025`.

MinIO console: `http://localhost:9001` (local-only credentials are in the Compose file). Do not reuse those credentials outside local development.

### Windows local services if Docker Desktop won't start

Docker Desktop has returned `Docker Desktop is unable to start` on the current development machine. Try this first:

1. Open Docker Desktop and wait until the engine reports **Running**.
2. In PowerShell, run `docker info`, then `docker compose up -d` from the repository root.
3. If the engine still fails: restart Docker Desktop and Windows; check Docker Desktop → **Troubleshoot** → **Restart**; confirm WSL 2 is installed and updated (`wsl --status`, `wsl --update`) if using the WSL 2 backend; then check Windows virtualization is enabled. If the machine is managed and virtualization/WSL is blocked, use the local-service steps below.

The non-Docker fallback uses PostgreSQL installed on Windows plus local Redis, Mailpit and MinIO executables in the ignored `.local-services` folder. These services are for development only.
Start or health-check the local services with `powershell -ExecutionPolicy Bypass -File scripts/start-local-services.ps1`.

1. Redis: Memurai Developer is the first Windows choice. Its MSI needs administrator rights; the official NuGet package can be extracted without installing a Windows service. On this machine the Memurai 4.1.7 executable failed to start (`Illegal System DLL Relocation`), and WSL itself returned `The file cannot be accessed by the system`. The tested local fallback was the Redis 8.10.3 Windows Cygwin build from [redis-windows release 8.10.3](https://github.com/redis-windows/redis-windows/releases/tag/8.10.3), compiled from upstream Redis source. Download `Redis-8.10.3-Windows-x64-cygwin.zip` into `.local-services\bin`, extract it there, then from its extracted folder run `redis-server.exe --port 16379 --bind 127.0.0.1 --dir /cygdrive/c/Users/<your-user>/projects/service-hub/.local-services`. Its SHA-256 is `8000848C48668C8CD32F21386CE951D0E02C1AEFAE39443AB9D3DE11FF8EBF9E`. This is a workstation development substitute, not the production deployment recommendation.
2. PostgreSQL: start the local PostgreSQL server on port `5433` (or set your local port in `DATABASE_URL`). This workspace uses PostgreSQL 18 binaries and `.local-services/postgres-data`.
3. Mailpit: download the official [Mailpit v1.32.0 Windows AMD64 release](https://github.com/axllent/mailpit/releases/tag/v1.32.0), extract `mailpit.exe` into `.local-services\bin\mailpit`, then run `mailpit.exe --smtp 127.0.0.1:16325 --listen 127.0.0.1:18025`. Its inbox is at `http://localhost:18025`; `.env` must use `SMTP_URL=smtp://127.0.0.1:16325`. These high ports avoid ports reserved/occupied on this machine.
4. MinIO: the prebuilt community download now returns HTTP 410. An isolated Go 1.24.8 toolchain in `.local-services\toolchain` builds the final published community release into `.local-services\bin\minio-build\minio.exe` using `go install -v github.com/minio/minio@RELEASE.2025-10-15T17-29-55Z`. This archived community build is no longer maintained. Start it with `MINIO_ROOT_USER=minio`, `MINIO_ROOT_PASSWORD=miniosecret`, then `minio.exe server .local-services\minio-data --address 127.0.0.1:19000 --console-address 127.0.0.1:19001`; create private bucket `servicehub-private` in the console. Point `S3_ENDPOINT` to `http://127.0.0.1:19000`.
5. Set `REDIS_URL=redis://127.0.0.1:16379` in `.env`, then apply migrations/seed and run `pnpm dev`. Check `/api/v1/health/ready` before testing auth; it returns HTTP 503 when PostgreSQL or Redis is unreachable.

## Structure

- `apps/web`: Next.js PWA base and responsive role shells.
- `apps/api`: NestJS API with OTP/password/Google sign-in, notification queue adapters, rotating sessions, TOTP and recovery codes, permission guards, admin management and append-only audit logs.
- `packages/ui`: shared design tokens and reusable controls.
- `packages/config`: validated shared environment schema.
- `packages/db`: shared Prisma schema, migration and seed for identity, RBAC, audit, consent, Minna geography and data-subject request tracking.
- `docs/erd.md`: approved-before-schema data model proposal.
- `docs/payments.md`: gateway settlement and confirmation questions.

## Local environment

Configuration is defined in `.env.example` and validated through `@servicehub/config/env`. Local OTPs use the DEV adapter and are printed by the API worker. Configure Google, WhatsApp, Termii, SMTP or Resend credentials to use those providers. `APP_ENCRYPTION_KEY`, `SESSION_SECRET`, `JWT_ACCESS_SECRET` and `OTP_HASH_SECRET` must be strong unique values in production. The checked-in Compose credentials are for local development only.

## Launch configuration

The demo marketplace screens use illustrative sample values. The seed creates the nine launch areas under Minna and a Super Admin from the environment values. See `docs/erd.md` and `docs/payments.md` for the approved data and settlement decisions. Privacy/terms pages remain review placeholders; data requests are tracked for admin review and automated fulfilment needs a separately approved retention and operations policy.
