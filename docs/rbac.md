# Role and permission access

API access is granted by permission keys, enforced through `@RequirePermissions(...)` and `PermissionGuard`; frontend visibility is only a usability hint and never grants access. Relevant Phase 3 permissions are `catalog.manage`, `technician.review`, `technician.approve`, `technician.reject`, `technician.suspend`, `kyc.view` and `kyc.view_sensitive`.

The database seed assigns catalog, technician review, jobs and bookings management permissions to ADMIN and SUPER_ADMIN. `chat.moderate` gates the flagged-message queue; it does not grant unscoped conversation browsing. Sensitive KYC reveal remains reserved for SUPER_ADMIN. Queue access requires `technician.review`; each approval, rejection, or suspension checks its matching permission. The access guard requires enrolled TOTP for every `/admin` route, including technician review, KYC and job operations.

Technician self-service endpoints resolve the profile from the authenticated user rather than a caller-supplied profile ID. Admin endpoints take a profile ID only behind permission checks. KYC routes audit each summary, reveal and signed document access.

Phase 4 user endpoints check request ownership, matched technician eligibility, booking participation, or conversation participation in the service layer. Socket joins and message events repeat participant checks; the client cannot authorize itself with a room or booking ID. Admin booking lists require `bookings.manage`; message-flag review requires `chat.moderate`; settings changes require `jobs.manage` and are audited.
