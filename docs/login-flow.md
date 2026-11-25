# Login flow and security notes

## Browser flow

```mermaid
sequenceDiagram
  actor User
  participant Web as Sign-in page
  participant API as NestJS auth API
  participant Queue as BullMQ notification worker
  participant DB as PostgreSQL
  User->>Web: Choose sign-in or create account
  Web->>API: POST /auth/otp/request
  API->>DB: Apply account cooldown and hourly limit; store OTP hash
  API->>Queue: Enqueue encrypted destination and code
  Queue-->>User: Deliver via configured provider
  User->>Web: Enter 6-digit code
  Web->>API: POST /auth/otp/verify
  API->>DB: Constant-time hash check; atomically consume unused OTP
  API->>DB: Create/lookup account, consent and session
  API-->>Web: Set HttpOnly cookies and return user/CSRF metadata
  Web->>API: Protected request with cookies and CSRF header
```

The sign-up route opens `/sign-in?mode=signup`; both phone and email are available. New accounts must accept the current terms and privacy policy before requesting a code. Technician sign-up creates a pending profile. Login remains generic for unknown destinations. Google and email/password use the same session cookie path; enrolled admins complete TOTP before receiving a full session.

## Safeguards in code

- OTP generation uses `crypto.randomInt`; the database stores only an HMAC hash. The delivery queue encrypts destination and code payloads.
- OTPs expire after five minutes, have a resend cooldown and account hourly cap, and are limited per IP by auth route throttles.
- A successful verification compares fixed-size hashes in constant time and conditionally consumes the still-unexpired OTP in one database update. Concurrent requests cannot both create a session from the same code.
- A failed attempt increments the count conditionally; the fifth failed attempt consumes the code. Responses use a generic invalid-or-expired message.
- Access and refresh tokens are set only as `HttpOnly`, `SameSite=Strict` cookies; Secure is enabled in production. The refresh cookie is scoped to `/api/v1/auth`. Responses no longer return bearer tokens in JSON.
- Cookie-authenticated mutations require the double-submit CSRF cookie and header. The web client caches the CSRF token in memory and refreshes its cache from auth responses.
- Protected API requests that receive 401 share one refresh request, then retry once with the rotated cookie; auth endpoints are excluded so bad OTP/password responses never trigger refresh loops.
- Refresh rotates the refresh token and revokes its session family on detected reuse. Account suspension is checked by the access guard.
- Password login uses Argon2id and returns the same credential error for unknown users and incorrect passwords.

## Tests and run status

- `apps/api/src/auth-primitives.test.ts` covers Nigerian phone normalization, OTP format/expiry/attempt limit/cooldown, refresh-token reuse and safe identity linking. This suite ran successfully: 9 tests passed.
- `apps/api/test/phase2.integration.test.ts` contains live OTP signup/session, replay rejection, refresh reuse/CSRF, and concurrent same-code verification coverage. It is gated by `RUN_PHASE2_INTEGRATION=1`; the new concurrency case has not been run in this session.
- API TypeScript validation passed with `node node_modules/typescript/bin/tsc --noEmit -p apps/api/tsconfig.json`.
- A live API boot was attempted, but the host denied binding to `127.0.0.1:4000`; its initial launch also showed that the direct `tsx` loader did not load the API decorator settings. No live HTTP login verification is claimed for this session.
- The full web typecheck remains red in unrelated shared hooks and pages; the command output did not report an error in the sign-in or OTP verification pages.

## Follow-up hardening

Auth throttles currently use the Nest throttler default in-memory store. Configure shared Redis-backed throttling before horizontal production deployment and test the limits through the real reverse proxy so account/IP limits remain consistent across API instances.
