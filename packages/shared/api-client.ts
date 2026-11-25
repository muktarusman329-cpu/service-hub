export interface ApiClient {
  getMarketplaceListings(filters?: MarketplaceFilters): Promise<MarketListing[]>;
  getMarketplaceListing(id: string): Promise<MarketListing | null>;
  getMyMarketplaceListings(): Promise<MarketListing[]>;
  createMarketplaceListing(data: CreateMarketListingDto): Promise<MarketListing>;
  reviewMarketplaceListing(id: string, status: "PUBLISHED" | "REJECTED"): Promise<MarketListing>;
  markMarketplaceListingSold(id: string): Promise<MarketListing>;
  updateMarketplaceListing(id: string, data: UpdateMarketListingDto): Promise<MarketListing>;
  getMarketplaceSellerProfile(id: string): Promise<MarketSellerProfile | null>;
  getMarketplaceOrders(role: "BUYER" | "SELLER"): Promise<MarketOrder[]>;
  createMarketplaceOrder(listingId: string): Promise<MarketOrder>;
  updateMarketplaceOrder(id: string, status: "ACCEPTED" | "DECLINED" | "COMPLETED" | "CANCELLED"): Promise<MarketOrder>;
  getSavedMarketplaceListings(): Promise<MarketListing[]>;
  toggleSavedMarketplaceListing(id: string): Promise<boolean>;
  getJobRequests(): Promise<JobRequest[]>;
  getJobRequest(id: string): Promise<JobRequest>;
  createJobRequest(data: CreateJobRequestDto): Promise<JobRequest>;
  updateJobRequest(id: string, data: UpdateJobRequestDto): Promise<JobRequest>;
  cancelJobRequest(id: string, data: CancelDto): Promise<void>;
  getQuotes(requestId: string): Promise<Quote[]>;
  createQuote(requestId: string, data: CreateQuoteDto): Promise<Quote>;
  updateQuote(quoteId: string, data: Partial<CreateQuoteDto>): Promise<Quote>;
  withdrawQuote(quoteId: string): Promise<Quote>;
  acceptQuote(quoteId: string, data: AcceptQuoteDto): Promise<Booking>;
  getBookings(): Promise<Booking[]>;
  getBooking(id: string): Promise<Booking>;
  changeBookingStatus(id: string, data: StatusDto): Promise<Booking>;
  cancelBooking(id: string, data: CancelDto): Promise<void>;
  revealContact(bookingId: string): Promise<ContactInfo>;
  getConversations(): Promise<Conversation[]>;
  getMessages(conversationId: string, before?: string): Promise<MessagePage>;
  sendMessage(conversationId: string, data: CreateMessageDto): Promise<Message>;
  getTechnicians(citySlug: string, filters?: TechnicianFilters): Promise<TechnicianPublic[]>;
  getTechnicianProfile(id: string): Promise<TechnicianPublic>;
  getCategories(citySlug: string): Promise<Category[]>;
  getServices(citySlug: string): Promise<Service[]>;
  getWallet(): Promise<Wallet>;
  getTransactions(): Promise<Transaction[]>;
  requestPayout(data: PayoutDto): Promise<Payout>;
  getPayments(): Promise<PaymentRecord[]>;
  createPayment(bookingId: string, result: "SUCCEEDED" | "FAILED" | "CASH_DUE"): Promise<PaymentRecord>;
  getReviews(): Promise<Review[]>;
  createReview(data: CreateReviewDto): Promise<Review>;
  getNotifications(): Promise<AppNotification[]>;
  markNotificationRead(id: string): Promise<AppNotification>;
  disputeBooking(id: string, reason: string): Promise<Booking>;
  getTechnicianWorkspace(): Promise<TechnicianWorkspace>;
  updateTechnicianWorkspace(action: TechnicianWorkspaceAction): Promise<TechnicianWorkspace>;
  getAdminWorkspace(): Promise<AdminWorkspace>;
  updateAdminWorkspace(action: AdminWorkspaceAction): Promise<AdminWorkspace>;
  getAccountWorkspace(): Promise<AccountWorkspace | null>;
  updateAccountWorkspace(action: AccountWorkspaceAction): Promise<AccountWorkspace>;
}

export interface JobRequest {
  id: string;
  status: "OPEN" | "DIRECTED" | "QUOTED" | "ACCEPTED" | "CANCELLED_BY_USER" | "CANCELLED_BY_TECHNICIAN" | "EXPIRED" | "COMPLETED" | "DISPUTED";
  service: { id: string; name: string; slug: string };
  city?: { id: string; name: string; slug: string };
  area: { id: string; name: string };
  nearestLandmark: string;
  description: string;
  urgency: "STANDARD" | "URGENT";
  isAsap: boolean;
  preferredStartAt: string | null;
  preferredEndAt: string | null;
  budgetMinKobo: number | null;
  budgetMaxKobo: number | null;
  expiresAt: string;
  createdAt: string;
  activeQuoteCount: number;
  booking: { id: string; status: string } | null;
  mediaKeys?: string[];
}

export interface Quote { id: string; jobRequestId: string; technicianProfileId: string; version: number; status: "ACTIVE" | "ACCEPTED" | "NOT_SELECTED" | "WITHDRAWN" | "EXPIRED"; priceKobo: number; platformFeePreviewKobo?: number; laborKobo: number | null; materialsKobo: number | null; currencyCode?: string; message: string | null; estimatedStartAt: string | null; estimatedArrivalMins: number | null; validUntil: string; technician?: { profileId: string; displayName: string; verified: boolean; rating: { average: number | null; count: number }; completedJobCount: number; areaName: string | null; distanceMeters: number | null } }
export interface Booking { id: string; status: "REQUESTED" | "QUOTED" | "ACCEPTED" | "TECHNICIAN_EN_ROUTE" | "IN_PROGRESS" | "COMPLETED_PENDING_CONFIRMATION" | "COMPLETED" | "CANCELLED_BY_USER" | "CANCELLED_BY_TECHNICIAN" | "EXPIRED" | "DISPUTED"; paymentMethod: "ONLINE" | "CASH"; priceKobo: number; platformFeePreviewKobo: number; currencyCode: string; scheduledStartAt: string; scheduledEndAt: string; acceptedAt: string; completedByTechnicianAt: string | null; confirmedCompletedAt: string | null; service: { name: string }; area: { name: string }; nearestLandmark: string; technician: { displayName: string; verified: boolean }; history: BookingHistoryEntry[]; cancellation: Cancellation | null }
export interface BookingHistoryEntry { fromStatus: string | null; toStatus: string; actorRole: "USER" | "TECHNICIAN" | "ADMIN" | "SYSTEM"; reason: string | null; createdAt: string }
export interface Cancellation { reasonCode: string; reason: string; isLate: boolean; createdAt: string }
export interface ContactInfo { phoneNumber: string }
export interface Conversation { id: string; jobRequestId: string; bookingId: string | null; technicianProfileId: string; status: "OPEN" | "CLOSED"; updatedAt: string; request: { id: string; status: string; service: { name: string }; area: { name: string } }; messages?: Array<{ body: string; createdAt: string }>; lastMessage?: { body: string; createdAt: string } | null }
export interface Message { id: string; conversationId: string; senderId: string; body: string; createdAt: string; editedAt: string | null; deletedAt: string | null; attachments?: string[]; deliveryStatus?: "PENDING" | "SENT" | "FAILED"; readAt?: string | null }
export interface MessagePage { items: Message[]; nextBefore: string | null }
export interface TechnicianPublic { id: string; userId: string; publicName: string; bio: string | null; profilePhotoUrl: string | null; cityId: string; approvalStatus: "APPROVED" | "REACTIVATED"; verified: boolean; rating: { average: number; count: number }; completedJobCount: number; skills: Array<{ service: { id: string; name: string; slug: string; category?: { name: string; slug: string } }; yearsExperience: number }>; areas: Array<{ area: { id: string; name: string; centerLat?: number | null; centerLng?: number | null } }>; weeklyAvailability: Record<string, boolean> | null }
export interface Category { id: string; slug: string; name: string; iconKey: string; sortOrder: number; isActive: boolean; services: Service[] }
export interface Service { id: string; slug: string; name: string; iconKey: string; sortOrder: number; isActive: boolean; priceGuidance?: { minPrice: number | string; maxPrice: number | string; currency: string; label: string } | null }
export type MarketListingCategory = "clothing" | "home-goods" | "electronics" | "books" | "furniture" | "other";
export type MarketListingCondition = "NEW" | "LIKE_NEW" | "GOOD" | "FAIR";
export type MarketListingStatus = "PENDING_REVIEW" | "PUBLISHED" | "REJECTED" | "SOLD";
export interface MarketListing { id: string; title: string; description: string; category: MarketListingCategory; condition: MarketListingCondition; priceKobo: number; status: MarketListingStatus; moderationNote: string | null; createdAt: string; publishedAt: string | null; seller: { id: string; displayName: string | null }; city: { name: string; slug: string }; area: { id: string; name: string }; mediaKeys?: string[] }
export interface MarketplaceFilters { category?: MarketListingCategory; query?: string; status?: MarketListingStatus }
export interface CreateMarketListingDto { title: string; description: string; category: MarketListingCategory; condition: MarketListingCondition; priceKobo: number; cityId: string; areaId: string }
export type UpdateMarketListingDto = Partial<CreateMarketListingDto>;
export interface MarketSellerProfile { id: string; displayName: string; areaName: string; memberSince: string; listingCount: number; listings: MarketListing[] }
export interface MarketOrder { id: string; listingId: string; listingTitle: string; priceKobo: number; status: "REQUESTED" | "ACCEPTED" | "DECLINED" | "COMPLETED" | "CANCELLED"; buyer: { id: string; displayName: string }; seller: { id: string; displayName: string }; createdAt: string; updatedAt: string }
export interface Wallet { id: string; balanceKobo: number; currencyCode: string; updatedAt: string }
export interface Transaction { id: string; type: "CREDIT" | "DEBIT"; amountKobo: number; currencyCode: string; description: string; createdAt: string }
export interface Payout { id: string; amountKobo: number; currencyCode: string; status: "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED"; createdAt: string; processedAt: string | null }
export interface PaymentRecord { id: string; bookingId: string; amountKobo: number; platformFeeKobo: number; method: "ONLINE" | "CASH"; status: "PENDING" | "SUCCEEDED" | "FAILED" | "CASH_DUE"; receiptNumber: string | null; createdAt: string }
export interface Review { id: string; bookingId: string; technicianName: string; rating: number; comment: string; createdAt: string }
export interface AppNotification { id: string; title: string; body: string; read: boolean; createdAt: string }
export interface CreateReviewDto { bookingId: string; rating: number; comment: string }
export interface CreateJobRequestDto { serviceId: string; cityId: string; areaId: string; directTechnicianProfileId?: string; nearestLandmark: string; description: string; latitude?: number; longitude?: number; isAsap: boolean; preferredStartAt?: string; preferredEndAt?: string; budgetMinKobo?: number; budgetMaxKobo?: number; urgency: "STANDARD" | "URGENT"; clientIdempotencyKey: string; mediaKeys?: string[] }
export interface UpdateJobRequestDto { nearestLandmark?: string; description?: string; isAsap?: boolean; preferredStartAt?: string | null; budgetMaxKobo?: number | null; mediaKeys?: string[] }
export interface CreateQuoteDto { priceKobo: number; laborKobo?: number; materialsKobo?: number; estimatedStartAt?: string; estimatedArrivalMins?: number; message?: string; validForMinutes?: number; clientIdempotencyKey: string }
export interface AcceptQuoteDto { paymentMethod: "ONLINE" | "CASH"; idempotencyKey: string }
export interface CancelDto { idempotencyKey: string; reasonCode: string; reason: string }
export interface StatusDto { status: "TECHNICIAN_EN_ROUTE" | "IN_PROGRESS" | "COMPLETED_PENDING_CONFIRMATION" | "COMPLETED" | "DISPUTED"; reason?: string; idempotencyKey: string }
export interface CreateMessageDto { clientMessageKey: string; body?: string; attachments?: string[] }
export interface TechnicianFilters { serviceId?: string; areaId?: string; minRating?: number }
export interface PayoutDto { bankAccountId: string; amountKobo: number }
export type TechnicianApplicationStatus = "DRAFT" | "SUBMITTED" | "UNDER_REVIEW" | "CHANGES_REQUESTED" | "APPROVED" | "REJECTED" | "SUSPENDED";
export interface TechnicianApplication { id: string; status: TechnicianApplicationStatus; step: number; displayName: string; bio: string; skills: string[]; areas: string[]; availability: string[]; portfolio: string[]; kycConsent: boolean; kycDocumentName: string | null; guarantorName: string | null; reviewNote: string | null; submittedAt: string | null }
export interface TimeOffBlock { id: string; startAt: string; endAt: string; reason: string }
export interface TechnicianWorkspace { application: TechnicianApplication; timeOff: TimeOffBlock[]; cashCommissionOwedKobo: number; bankAccounts: Array<{ id: string; bankName: string; accountName: string; maskedNumber: string; isDefault: boolean }>; payouts: Payout[]; settings: { notificationsEnabled: boolean; serviceAreas: string[] } }
export type TechnicianWorkspaceAction = { type: "save-application"; patch: Partial<Omit<TechnicianApplication, "id">> } | { type: "submit-application" } | { type: "add-time-off"; block: Omit<TimeOffBlock, "id"> } | { type: "remove-time-off"; id: string } | { type: "update-settings"; notificationsEnabled: boolean } | { type: "top-up-wallet"; amountKobo: number } | { type: "add-bank-account"; bankName: string; accountName: string; accountNumber: string };
export interface AdminUserRecord { id: string; displayName: string; email: string; role: "CUSTOMER" | "TECHNICIAN" | "ADMIN"; status: "ACTIVE" | "SUSPENDED"; areaName: string; joinedAt: string }
export interface AdminFlaggedMessage { id: string; senderName: string; message: string; signal: string; status: "OPEN" | "DISMISSED" | "ACTIONED" }
export interface AdminDispute { id: string; bookingId: string; customerName: string; technicianName: string; reason: string; status: "OPEN" | "RESOLVED"; resolution: string | null; refundKobo: number }
export interface AdminWorkspace { users: AdminUserRecord[]; flaggedMessages: AdminFlaggedMessage[]; disputes: AdminDispute[]; commissionPercent: number; settings: { cancellationWindowHours: number; autoCompleteHours: number; maxActiveBookings: number; guarantorRequired: boolean; retentionDays: number; otpChannel: "SMS" | "EMAIL"; twoFactorEnabled: boolean }; catalogEnabled: Record<string, boolean>; auditLog: Array<{ id: string; action: string; actor: string; reason: string; createdAt: string }> }
export type AdminWorkspaceAction = { type: "set-user-status"; userId: string; status: AdminUserRecord["status"]; reason: string } | { type: "review-technician"; applicationId: string; status: TechnicianApplicationStatus; note: string } | { type: "reveal-kyc"; applicationId: string; reason: string } | { type: "resolve-flag"; flagId: string; status: "DISMISSED" | "ACTIONED"; reason: string } | { type: "resolve-dispute"; bookingId: string; resolution: string; refundKobo: number } | { type: "set-commission"; percent: number; reason: string } | { type: "save-admin-settings"; settings: AdminWorkspace["settings"] } | { type: "toggle-catalog"; itemId: string; enabled: boolean };
export interface AccountWorkspace { profile: { displayName: string; email: string; phone: string } | null; addresses: Array<{ id: string; label: string; areaName: string; landmark: string; isDefault: boolean }>; notificationPreferences: { pushJobUpdates: boolean; pushMessages: boolean; pushPromotions: boolean; emailJobUpdates: boolean; emailReceipts: boolean; smsReminders: boolean }; settings: { language: "en" | "ha"; linkedGoogle: boolean }; onboarding: { accountType: "USER" | "TECHNICIAN" | "BOTH" | null; step: 1 | 2 | 3; complete: boolean } }
export type AccountWorkspaceAction = { type: "save-profile"; profile: NonNullable<AccountWorkspace["profile"]> } | { type: "add-address"; address: Omit<AccountWorkspace["addresses"][number], "id" | "isDefault"> } | { type: "remove-address"; addressId: string } | { type: "save-notifications"; preferences: AccountWorkspace["notificationPreferences"] } | { type: "save-settings"; settings: AccountWorkspace["settings"] } | { type: "save-onboarding"; accountType?: "USER" | "TECHNICIAN" | "BOTH"; step?: 1 | 2 | 3; complete?: boolean };
