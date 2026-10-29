# Phase 3 self-audit

Evidence below is from the source and test runs on 2026-10-29 against the local PostgreSQL, Redis and MinIO services. The two HTTP audit tests run only with `RUN_PHASE2_INTEGRATION=1` and a live API; they were run with all required services available.

| Requirement | Implemented | Tested | Evidence |
| --- | --- | --- | --- |
| Reject image bytes that do not match the declared MIME type | Yes. Uploaded object size, stored content type and magic bytes are checked before profile/KYC data is saved. | Yes. The real HTTP upload pipeline signed a PNG upload, uploaded JPEG-signature bytes, and verified the profile update returned `400` without storing the key. | [`TechnicianService.validateAndSanitize`](../apps/api/src/technician.module.ts#L154); `Phase 3 HTTP upload pipeline rejects MIME mismatches and strips EXIF metadata` in [`phase3-audit.integration.test.ts`](../apps/api/test/phase3-audit.integration.test.ts#L48). |
| Strip EXIF metadata from images | Yes. JPEG, PNG and WebP metadata chunks are removed before accepted uploads are retained. | Yes. A real MinIO upload containing a PNG `eXIf` chunk was submitted through the KYC endpoint; the stored image no longer contained the metadata. A focused unit regression test also passes. | [`stripImageExif`](../apps/api/src/technician-primitives.ts#L35), [`validateAndSanitize`](../apps/api/src/technician.module.ts#L154); HTTP integration test above; `PNG metadata stripping preserves the image and removes EXIF chunks` in [`technician-primitives.test.ts`](../apps/api/src/technician-primitives.test.ts#L28). |
| Block a normal user, technician, and admin without `kyc.view` from KYC endpoints | Yes. KYC summary and document URL require `kyc.view`; revealing the full identifier requires `kyc.view_sensitive`. Admin routes also require enrolled TOTP. | Yes. A real API test exercised summary, document access and reveal as all three denied actors; each request returned `403`. | [`AdminTechnicianController` KYC routes](../apps/api/src/technician.module.ts#L312); `Phase 3 KYC endpoints enforce permissions and audit every successful view, download and reveal` in [`phase3-audit.integration.test.ts`](../apps/api/test/phase3-audit.integration.test.ts#L92). |
| Audit every successful KYC view, document download request and identifier reveal | Yes. Summary view, signed document URL issuance and sensitive identifier reveal each append a distinct audit event. | Yes. The real API test fetched the masked summary, requested and used a signed ID-photo URL, revealed the identifier with a reason, then asserted all three audit actions in PostgreSQL. | [`kycReview`, `kycDocument`, and `revealKyc`](../apps/api/src/technician.module.ts#L216); same real API test above. |
| Retention cleanup deletes due data and preserves data not yet due | Yes. The hourly cleanup selects only records with `retentionAt <= now` and no prior cleanup, removes the private files and encrypted identifiers, and retains a minimal outcome record. | Yes. Real MinIO/PostgreSQL test asserts due files return `404`, encrypted identifiers are cleared, and a future-retention record and its files remain intact. Exactly one of two records was cleaned. | [`cleanupRetention`](../apps/api/src/technician.module.ts#L282); `Phase 3 Minna catalog, private object storage and KYC retention use real dependencies` in [`phase3.integration.test.ts`](../apps/api/test/phase3.integration.test.ts#L54). |
| Keep unapproved technicians out of public listings | Yes. Public listing queries include only `APPROVED` and `REACTIVATED` profiles and exclude soft-deleted profiles. | Yes. Playwright checks the submitted technician is absent before approval, then approves the same profile and checks it appears with safe public fields at both viewport sizes. | [`publicListing`](../apps/api/src/technician.module.ts#L248); `technician completes onboarding and admin approval publishes only safe fields` in [`phase3-onboarding.spec.mjs`](../apps/web/e2e/phase3-onboarding.spec.mjs#L41). |
| Encryption key rotation works | Yes. Encrypted identifiers carry a key ID so old records can be decrypted with their historical key during rotation. | Yes. Unit test `KYC encryption decrypts with historical key id during key rotation` passed. | [`kyc-crypto.ts`](../apps/api/src/kyc-crypto.ts); [`kyc-crypto.test.ts`](../apps/api/src/kyc-crypto.test.ts#L10). |

## Test output

```text
Phase 3 HTTP/KYC integration: 3 passed, 0 failed, 0 skipped
  - HTTP upload mismatch rejection and EXIF stripping
  - KYC role permissions and view/download/reveal audit entries
  - Retention cleanup with real PostgreSQL and MinIO objects

Unit suite: 17 passed, 0 failed
Playwright after the pre-approval listing assertion: 2 passed (mobile-360, desktop)
```

The full Playwright matrix also passed 6/6 before the final pre-approval assertion was added; the updated Phase 3 browser spec then passed 2/2. Integration fixtures use clearly named test accounts. Accounts that generated append-only audit events are retained as suspended with their sessions revoked so the tests do not mutate or delete audit history.
