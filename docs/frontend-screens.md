# Frontend screen and API contract index

The frontend is currently backed by `MockApiClient`; the API paths and JSON shapes below are the proposed backend contract, not implemented server endpoints. Shared request/response types live in `packages/shared/api-client.ts`. Marketplace image selection is a browser-preview stub: selected file names stand in for uploaded `mediaKeys`.

## Routes

| Route | Purpose | Mock hooks | Proposed API |
|---|---|---|---|
| `/` | Public landing | `useCatalog`, technician and marketplace hooks | `GET /v1/catalog?city=minna`; `GET /v1/technicians?city=minna`; `GET /v1/marketplace/listings` |
| `/landing` | Landing alias | Same as `/` | Same as `/` |
| `/services` | Service directory | `useCatalog` | `GET /v1/catalog?city=minna` |
| `/services/:slug` | Service detail | `useCatalog` | `GET /v1/services/:slug?city=minna` |
| `/technicians` | Technician search | `useTechnicians` | `GET /v1/technicians?city=minna&serviceId=&areaId=&minRating=` |
| `/technicians/:id` | Technician profile and direct request | technician and job-request hooks | `GET /v1/technicians/:id`; `POST /v1/job-requests` |
| `/help` | Help center | Static content | No data endpoint |
| `/contact` | Contact form | Local form state | `POST /v1/support/requests` |
| `/sign-in` | Sign in and registration | Auth client (not MockApiClient) | Existing auth calls: `/auth/password/login`, `/auth/otp/request`, `/auth/google` |
| `/verify` | OTP verification | Auth client (not MockApiClient) | Existing auth calls: `/auth/otp/verify`, `/auth/totp/verify-login` |
| `/404` | Not-found state | Static content | No data endpoint |
| `/server-error` | Server error state | Static content | No data endpoint |
| `/maintenance` | Maintenance state | Static content | No data endpoint |
| `/offline` | Offline guidance | Dev-state switcher | No data endpoint |
| `/privacy` | Privacy policy | Static content | No data endpoint |
| `/terms` | Terms | Static content | No data endpoint |
| `/account/profile` | Profile | `useAccountWorkspace`, `useUpdateAccountWorkspace` | `GET/PATCH /v1/me` |
| `/account/addresses` | Saved addresses | `useAccountWorkspace`, `useUpdateAccountWorkspace` | `GET/POST/PATCH/DELETE /v1/me/addresses` |
| `/account/notifications` | Notification preferences | `useAccountWorkspace`, `useUpdateAccountWorkspace` | `GET/PATCH /v1/me/notification-preferences` |
| `/account/settings` | Account settings | `useAccountWorkspace`, `useUpdateAccountWorkspace` | `GET/PATCH /v1/me/settings` |
| `/account/security` | Sessions and sign-in methods | Auth client (not MockApiClient) | Existing `/auth/me`, `/auth/sessions`, `/auth/totp/*`, `/auth/methods/*` calls |
| `/account/onboarding` | First-time onboarding | `useAccountWorkspace`, `useUpdateAccountWorkspace` | `GET/PATCH /v1/me/onboarding` |
| `/marketplace` | Browse, search and filter | `useMarketplaceListings`, `useToggleSavedMarketplaceListing` | `GET /v1/marketplace/listings?category=&query=` |
| `/marketplace/:id` | Listing detail, save and request to buy | `useMarketplaceListing`, `useToggleSavedMarketplaceListing`, `useCreateMarketplaceOrder` | `GET /v1/marketplace/listings/:id`; `POST /v1/marketplace/orders` |
| `/marketplace/sell` | Create/edit listing and mark sold | `useCreateMarketplaceListing`, `useUpdateMarketplaceListing`, `useMyMarketplaceListings`, `useMarkMarketplaceListingSold` | `POST/PATCH /v1/marketplace/listings`; `POST /v1/marketplace/listings/:id/sold` |
| `/marketplace/saved` | Saved items | `useSavedMarketplaceListings`, `useToggleSavedMarketplaceListing` | `GET /v1/marketplace/saved`; `PUT/DELETE /v1/marketplace/saved/:listingId` |
| `/marketplace/orders` | Buyer and seller order requests | `useMarketplaceOrders`, `useCreateMarketplaceOrder`, `useUpdateMarketplaceOrder` | `GET/POST /v1/marketplace/orders`; `PATCH /v1/marketplace/orders/:id` |
| `/marketplace/sellers/:id` | Public seller profile | `useMarketplaceSellerProfile` | `GET /v1/marketplace/sellers/:id` |
| `/app` | Customer dashboard | `useJobRequests`, `useBookings`, `useCatalog` | `GET /v1/job-requests`; `GET /v1/bookings`; `GET /v1/catalog` |
| `/app/jobs/new` | Three-step request form | `useCatalog`, `useCreateJobRequest` | `POST /v1/job-requests` |
| `/app/jobs/success/:id` | Request confirmation | `useJobRequest` | `GET /v1/job-requests/:id` |
| `/app/jobs` | Customer request list | `useJobRequests` | `GET /v1/job-requests` |
| `/app/jobs/:id` | Request details, quotes, edit/cancel | `useJobRequest`, `useQuotes`, `useUpdateJobRequest`, `useCancelJobRequest`, `useAcceptQuote` | `GET/PATCH/DELETE /v1/job-requests/:id`; `GET /v1/job-requests/:id/quotes`; `POST /v1/quotes/:id/accept` |
| `/app/bookings` | Customer bookings | `useBookings` | `GET /v1/bookings` |
| `/app/bookings/:id` | Booking timeline, cancellation, confirmation, dispute | `useBooking`, `useCancelBooking`, `useChangeBookingStatus`, `useRevealContact`, `useDisputeBooking` | `GET/PATCH /v1/bookings/:id`; `POST /v1/bookings/:id/cancel`; `GET /v1/bookings/:id/contact`; `POST /v1/bookings/:id/disputes` |
| `/app/disputes/:id` | Dispute detail | `useAdminWorkspace`, booking hooks | `GET /v1/disputes/:id` |
| `/app/payments` | Payment history | `usePayments` | `GET /v1/payments` |
| `/app/payments/checkout/:bookingId` | Online/cash payment choice and fee preview | `useBooking`, `useCreatePayment` | `POST /v1/bookings/:id/payments` |
| `/app/payments/receipt/:id` | Receipt | `usePayments` | `GET /v1/payments/:id/receipt` |
| `/app/payments/failed/:id` | Payment failure and retry | `usePayments`, `useCreatePayment` | `GET /v1/payments/:id`; `POST /v1/payments/:id/retry` |
| `/app/messages` | Customer conversation list | `useConversations` | `GET /v1/conversations` |
| `/app/messages/:id` | Chat thread | `useMessages`, `useSendMessage` | `GET/POST /v1/conversations/:id/messages` |
| `/app/reviews` | View and submit reviews | `useReviews`, `useCreateReview` | `GET/POST /v1/reviews` |
| `/app/notifications` | Customer notifications | `useNotifications`, `useMarkNotificationRead` | `GET /v1/notifications`; `PATCH /v1/notifications/:id` |
| `/app/support` | Report a problem | Support form state | `POST /v1/support/requests` |
| `/technician` | Technician dashboard | `useTechnicianWorkspace`, job, booking and wallet hooks | `GET /v1/technician/dashboard` |
| `/technician/onboarding` | Application and status | `useTechnicianWorkspace`, `useUpdateTechnicianWorkspace` | `GET/PATCH /v1/technician/application`; `POST /v1/technician/application/submit` |
| `/technician/jobs` | Matching job feed | `useJobRequests` | `GET /v1/technician/job-requests?serviceId=&areaId=` |
| `/technician/jobs/:id` | Request detail and quote | `useJobRequest`, `useCreateQuote` | `GET /v1/job-requests/:id`; `POST /v1/job-requests/:id/quotes` |
| `/technician/quotes` | My quotes | quote and job-request hooks | `GET /v1/technician/quotes`; `PATCH/DELETE /v1/quotes/:id` |
| `/technician/bookings` | Technician bookings | `useBookings` | `GET /v1/technician/bookings` |
| `/technician/bookings/:id` | Booking status actions | `useBooking`, `useChangeBookingStatus` | `GET/PATCH /v1/bookings/:id` |
| `/technician/availability` | Availability and time off | `useTechnicianWorkspace`, `useUpdateTechnicianWorkspace` | `GET/PATCH /v1/technician/availability`; `POST/DELETE /v1/technician/time-off` |
| `/technician/wallet` | Wallet, ledger, top-up and payouts | `useWallet`, `useWalletTransactions`, `useRequestPayout`, workspace hooks | `GET /v1/wallet`; `GET /v1/wallet/transactions`; `POST /v1/wallet/payouts` |
| `/technician/earnings` | Earnings and reviews | wallet, transaction and review hooks | `GET /v1/technician/earnings`; `GET /v1/reviews?role=technician` |
| `/technician/settings` | Technician preferences | `useTechnicianWorkspace`, `useUpdateTechnicianWorkspace` | `GET/PATCH /v1/technician/settings` |
| `/technician/notifications` | Technician notifications | `useNotifications`, `useMarkNotificationRead` | `GET /v1/notifications`; `PATCH /v1/notifications/:id` |
| `/admin` | Admin overview metrics | `useAdminWorkspace`, bookings and job hooks | `GET /v1/admin/overview` |
| `/admin/users` | User search and suspend | `useAdminWorkspace`, `useUpdateAdminWorkspace` | `GET /v1/admin/users?query=&role=&status=`; `PATCH /v1/admin/users/:id/status` |
| `/admin/users/:id` | User detail | `useAdminWorkspace` | `GET /v1/admin/users/:id` |
| `/admin/roles` | Roles and permissions | `useAdminWorkspace` | `GET/PATCH /v1/admin/roles` |
| `/admin/audit` | Audit log | `useAdminWorkspace` | `GET /v1/admin/audit?actor=&action=&from=&to=` |
| `/admin/technicians` | Technician review queue | `useAdminWorkspace`, `useUpdateAdminWorkspace` | `GET /v1/admin/technician-applications?status=` |
| `/admin/technicians/:id` | Review, KYC reveal, approve/reject/request changes | workspace hooks | `GET /v1/admin/technician-applications/:id`; `POST /:id/reveal-kyc`; `PATCH /:id/review` |
| `/admin/catalog` | Categories/services and area toggles | `useCatalog`, `useAdminWorkspace`, `useUpdateAdminWorkspace` | `GET/POST/PATCH /v1/admin/catalog`; `GET/PATCH /v1/admin/cities/:id/areas` |
| `/admin/marketplace` | Marketplace listing moderation | marketplace hooks | `GET /v1/admin/marketplace/listings?status=PENDING_REVIEW`; `PATCH /v1/admin/marketplace/listings/:id` |
| `/admin/jobs` | Booking administration | `useBookings`, `useAdminWorkspace` | `GET /v1/admin/bookings?status=&areaId=` |
| `/admin/jobs/:id` | Booking history and detail | booking hooks, `useAdminWorkspace` | `GET /v1/admin/bookings/:id` |
| `/admin/jobs/flags` | Flagged-message queue | `useAdminWorkspace`, `useUpdateAdminWorkspace` | `GET /v1/admin/message-flags`; `PATCH /v1/admin/message-flags/:id` |
| `/admin/jobs/disputes` | Disputes and resolutions | `useAdminWorkspace`, `useUpdateAdminWorkspace` | `GET /v1/admin/disputes`; `PATCH /v1/admin/disputes/:id` |
| `/admin/payments` | Transactions, ledger, commission, payouts | wallet and admin workspace hooks | `GET /v1/admin/payments`; `GET /v1/admin/ledger`; `PATCH /v1/admin/commission-rules`; `GET/PATCH /v1/admin/payouts` |
| `/admin/notifications` | Notification templates | `useAdminWorkspace` | `GET/POST/PATCH /v1/admin/notification-templates` |
| `/admin/settings` | Platform settings | `useAdminWorkspace`, `useUpdateAdminWorkspace` | `GET/PATCH /v1/admin/settings` |
| `/admin/security` | Admin 2FA demo | `useAdminWorkspace`, `useUpdateAdminWorkspace` | `POST /v1/admin/security/totp/enrollment` |
| `/dev/design-system` | Tokens and component preview | Static token preview | No data endpoint |
| `/dev/screens` | Route status registry | Static route registry | No data endpoint |

## Shared request and response types

Backend-facing TypeScript contracts are exported from `packages/shared/api-client.ts` and include:

- Requests: `CreateJobRequestDto`, `UpdateJobRequestDto`, `CreateQuoteDto`, `AcceptQuoteDto`, `CancelDto`, `StatusDto`, `CreateMessageDto`, `CreateReviewDto`, `PayoutDto`, `CreateMarketListingDto`, `UpdateMarketListingDto`.
- Responses: `JobRequest`, `Quote`, `Booking`, `BookingHistoryEntry`, `Conversation`, `Message`, `MessagePage`, `ContactInfo`, `TechnicianPublic`, `Category`, `Service`, `Wallet`, `Transaction`, `Payout`, `PaymentRecord`, `Review`, `AppNotification`, `MarketListing`, `MarketSellerProfile`, `MarketOrder`.
- Technician operations: `TechnicianApplication`, `TechnicianWorkspace`, `TechnicianWorkspaceAction`, and `TechnicianApplicationStatus`.
- Admin operations: `AdminWorkspace`, `AdminWorkspaceAction`, `AdminUserRecord`, `AdminFlaggedMessage`, and `AdminDispute`.
- Account operations: `AccountWorkspace` and `AccountWorkspaceAction`.

Common payload examples:

```ts
const createRequest: CreateJobRequestDto = {
  serviceId: "service-id",
  cityId: "minna",
  areaId: "area-id",
  nearestLandmark: "Near the central market",
  description: "Kitchen tap is leaking.",
  isAsap: false,
  urgency: "STANDARD",
  clientIdempotencyKey: "client-generated-key",
  mediaKeys: [],
};

const createQuote: CreateQuoteDto = {
  priceKobo: 1800000,
  laborKobo: 1400000,
  materialsKobo: 400000,
  message: "I can inspect and repair the connection.",
  clientIdempotencyKey: "client-generated-key",
};

const createListing: CreateMarketListingDto = {
  title: "Study desk",
  description: "Solid desk with one drawer.",
  category: "furniture",
  condition: "GOOD",
  priceKobo: 2800000,
  areaName: "Bosso",
  mediaKeys: [],
};
```

Prices are integer kobo (`NGN 1 = 100 kobo`). Booking responses include `platformFeePreviewKobo`; checkout must show both service price and fee before payment. Marketplace orders are local connection requests and do not imply payment or escrow.
