# ServiceHub backlog and verification

Phase 2 and Phase 3 are accepted. Phase 4 is in progress and must be reviewed before Phase 5.

## Phase 2 verification (current workstation)

- [x] Docker Compose attempted; Docker Desktop reports `Docker Desktop is unable to start`.
- [x] PostgreSQL 18 runs locally at `127.0.0.1:5433`; migrations and seed were applied.
- [x] Redis 8.10.3 Windows Cygwin build (compiled from upstream Redis source) runs locally at `127.0.0.1:16379`. Memurai portable package failed with `Illegal System DLL Relocation`; WSL reports `The file cannot be accessed by the system`.
- [x] Mailpit v1.32.0 standalone executable runs locally at `127.0.0.1:16325` (SMTP) and `127.0.0.1:18025` (web/API). Default ports were occupied/reserved.
- [x] MinIO was source-built from the last published community release into ignored `.local-services/bin/minio-build/minio.exe`; local S3 health endpoint returned HTTP 200 at `127.0.0.1:19000`. The archived community build is no longer maintained.
- [x] Added `/api/v1/health/live` and dependency-aware `/api/v1/health/ready`.
- [x] Added persistent `DEAD_LETTER` delivery state, preserved BullMQ failed jobs, exponential retries, and an explicit 503 for queue-unavailable OTP requests.
- [x] Automated real-Redis/real-PostgreSQL integration test exercises OTP request → BullMQ → DEV output → OTP verification/session, SMTP → Mailpit email → OTP verification/session, SMTP outage → four retries/dead letter, queue-down 503 and health responses. This test skips only when Redis cannot be reached and emits a warning.
- [x] Automated production configuration test verifies startup fails when DEV OTP is configured and required secrets are missing.
- [x] Workspace typecheck, lint and production build pass after the latest changes.
- [x] Unit tests pass 11/11.
- [x] Playwright passes 4/4 with real OTP delivery through BullMQ at 360px and 1365px.
- [x] Full real PostgreSQL/Redis/Mailpit integration run passed 9/9 tests with the test-only mocked Google client ID configured; no cases skipped.
- [x] `.local-services/` is ignored by git; service downloads and data are local only.

## Phase 3: catalog, technician KYC and onboarding

- [x] Add catalog/category/service/city availability and price guidance models, seed Minna launch categories/areas, and permission-gated admin APIs.
- [x] Add onboarding profile, skills, areas, availability, portfolio, status transitions, manual KYC, private object storage and signed access.
- [x] Add KYC encryption/blind index, consent, access audit, retention cleanup job and optional guarantor city setting.
- [x] Complete responsive onboarding, admin review and per-city catalog screens; Playwright completes technician onboarding, uploads identity documents, submits for review, approves, verifies safe public listing fields, then suspends the test profile.
- [x] Enforce action-specific `technician.approve`, `technician.reject` and `technician.suspend` permissions; admin 2FA is required on admin routes.
- [x] Apply city-specific retention settings when rejected KYC is scheduled for cleanup; cleanup removes private files and encrypted identifiers while retaining a minimal verification record.
- [ ] Account-closure fulfilment remains in Phase 7.
- [ ] Replace the no-op malware scanner and local MinIO/key config before production use.
- [ ] Legal/business approval for KYC retention duration, privacy/consent text, guarantor policy and ID verification procedure.

## Phase 5: payments and settlement

- [ ] Confirm Paystack settlement flow and funds movement with Paystack, bank and Nigerian counsel/business owners; do not describe it as native escrow.
- [ ] Implement Paystack primary and Flutterwave fallback gateway integration with gateway-neutral ledger states.
- [ ] Implement cash-job commission deductions from technician wallet, configurable negative threshold, and top-up/recovery flow.
- [ ] Define and implement refunds, reversals, payout reconciliation and cash settlements.

## Phase 7: privacy operations and production hardening

- [ ] Implement data export fulfilment (current flow records requests only).
- [ ] Approve and implement deletion fulfilment, legal holds, audit retention and backup expiry handling.
- [ ] Complete production-mode checks with real secrets/provider credentials, HTTPS Secure-cookie verification and deployment origins.
- [ ] Set the production database role and backup policy to preserve append-only audit records; test audit retention controls.
- [ ] Exercise authentication rate limits through the real reverse proxy and confirm trusted-proxy IP handling.
- [ ] Confirm WhatsApp-to-Termii fallback templates/credentials in the production-like environment.
- [ ] Review privacy policy/terms placeholders and consent versions with Nigerian counsel, including NDPA timelines.
- [ ] Fulfil account-closure requests, including required records and legal holds.

## Phase 4: jobs, quotes, bookings and chat

- [ ] Complete API support for booking cancellation and ensure cancellation policies match approved business rules.
- [ ] Add booking contact reveal endpoint with audit and enforce the post-completion cutoff.
- [ ] Add unread counts, offline message digest batching and complete message attachment validation and storage flows.
- [ ] Add Socket.IO authorization, cross-booking rejection, persistence-before-broadcast and reconnect catch-up tests.
- [ ] Add concurrency integration coverage for simultaneous accepts, accept/cancel and expiry races.
- [ ] Add full endpoint IDOR matrix for request, quote, booking, chat and attachment routes.
- [ ] Add Playwright scenario for request → quote → accept → progress → chat → confirm at 360px and 1365px.
- [ ] Add durable client offline queue, status actions, pending/sent/failed states and socket-to-polling fallback.
- [ ] Add a complete technician booking tracker and availability editor, and admin status history and “signal, not proof” moderation queue.
- [ ] Add request/quote expiry notifications, direct-booking UI, and user notification-preference coverage.
- [ ] Finish admin-configurable ranking/notification settings and metrics once the underlying events are reliable.
- [ ] Approve the values listed in `docs/jobs-bookings.md`: cancellation windows, auto-complete window, booking capacity, notification limits and contact reveal window.

## Scope boundary

Phase 5 gateway charges, refunds, cash wallet commissions, payout and settlement implementation stay out of scope until the user approves Phase 4. The Phase 4 `PaymentGate` is intentionally no-op.
