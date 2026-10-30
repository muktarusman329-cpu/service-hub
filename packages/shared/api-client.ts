// Demo data marker - all data from this client is mock
export const MOCK_DATA_NOTICE = "DEMO: This is mock data for UI review only";

export interface ApiClient {
  getMarketplaceListings(filters?: MarketplaceFilters): Promise<MarketListing[]>;
  getMarketplaceListing(id: string): Promise<MarketListing>;
  getMyMarketplaceListings(): Promise<MarketListing[]>;
  createMarketplaceListing(data: CreateMarketListingDto): Promise<MarketListing>;
  reviewMarketplaceListing(id: string, status: "PUBLISHED" | "REJECTED"): Promise<MarketListing>;
  markMarketplaceListingSold(id: string): Promise<MarketListing>;
  // Jobs
  getJobRequests(): Promise<JobRequest[]>;
  getJobRequest(id: string): Promise<JobRequest>;
  createJobRequest(data: CreateJobRequestDto): Promise<JobRequest>;
  cancelJobRequest(id: string, data: CancelDto): Promise<void>;
  
  // Quotes
  getQuotes(requestId: string): Promise<Quote[]>;
  createQuote(requestId: string, data: CreateQuoteDto): Promise<Quote>;
  acceptQuote(quoteId: string, data: AcceptQuoteDto): Promise<Booking>;
  
  // Bookings
  getBookings(): Promise<Booking[]>;
  getBooking(id: string): Promise<Booking>;
  changeBookingStatus(id: string, data: StatusDto): Promise<Booking>;
  cancelBooking(id: string, data: CancelDto): Promise<void>;
  revealContact(bookingId: string): Promise<ContactInfo>;
  
  // Chat
  getConversations(): Promise<Conversation[]>;
  getMessages(conversationId: string, before?: string): Promise<MessagePage>;
  sendMessage(conversationId: string, data: CreateMessageDto): Promise<Message>;
  
  // Technicians
  getTechnicians(citySlug: string, filters?: TechnicianFilters): Promise<TechnicianPublic[]>;
  getTechnicianProfile(id: string): Promise<TechnicianPublic>;
  
  // Catalog
  getCategories(citySlug: string): Promise<Category[]>;
  getServices(citySlug: string): Promise<Service[]>;
  
  // Wallet
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
}

// Types (aligned with Zod schemas where they exist)
export interface JobRequest {
  id: string;
  status: "OPEN" | "DIRECTED" | "QUOTED" | "ACCEPTED" | "CANCELLED_BY_USER" | "CANCELLED_BY_TECHNICIAN" | "EXPIRED" | "COMPLETED" | "DISPUTED";
  service: { id: string; name: string; slug: string };
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
}

export interface Quote {
  id: string;
  jobRequestId: string;
  technicianProfileId: string;
  version: number;
  status: "ACTIVE" | "ACCEPTED" | "NOT_SELECTED" | "WITHDRAWN" | "EXPIRED";
  priceKobo: number;
  laborKobo: number | null;
  materialsKobo: number | null;
  currencyCode: string;
  message: string | null;
  estimatedStartAt: string | null;
  estimatedArrivalMins: number | null;
  validUntil: string;
  technician: {
    profileId: string;
    displayName: string;
    verified: boolean;
    rating: { average: number | null; count: number };
    completedJobCount: number;
    areaName: string | null;
    distanceMeters: number | null;
  };
}

export interface Booking {
  id: string;
  status: "REQUESTED" | "QUOTED" | "ACCEPTED" | "TECHNICIAN_EN_ROUTE" | "IN_PROGRESS" | "COMPLETED_PENDING_CONFIRMATION" | "COMPLETED" | "CANCELLED_BY_USER" | "CANCELLED_BY_TECHNICIAN" | "EXPIRED" | "DISPUTED";
  paymentMethod: "ONLINE" | "CASH";
  priceKobo: number;
  platformFeePreviewKobo: number;
  currencyCode: string;
  scheduledStartAt: string;
  scheduledEndAt: string;
  acceptedAt: string;
  completedByTechnicianAt: string | null;
  confirmedCompletedAt: string | null;
  service: { name: string };
  area: { name: string };
  nearestLandmark: string;
  technician: { displayName: string; verified: boolean };
  history: BookingHistoryEntry[];
  cancellation: Cancellation | null;
}

export interface BookingHistoryEntry {
  fromStatus: string | null;
  toStatus: string;
  actorRole: "USER" | "TECHNICIAN" | "ADMIN" | "SYSTEM";
  reason: string | null;
  createdAt: string;
}

export interface Cancellation {
  reasonCode: string;
  reason: string;
  isLate: boolean;
  createdAt: string;
}

export interface ContactInfo {
  phoneNumber: string;
}

export interface Conversation {
  id: string;
  jobRequestId: string;
  bookingId: string | null;
  technicianProfileId: string;
  status: "OPEN" | "CLOSED";
  updatedAt: string;
  request: {
    id: string;
    status: string;
    service: { name: string };
    area: { name: string };
  };
  lastMessage: {
    body: string;
    createdAt: string;
  } | null;
}

export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  body: string;
  createdAt: string;
  editedAt: string | null;
  deletedAt: string | null;
}

export interface MessagePage {
  items: Message[];
  nextBefore: string | null;
}

export interface TechnicianPublic {
  id: string;
  userId: string;
  publicName: string;
  bio: string | null;
  profilePhotoUrl: string | null;
  cityId: string;
  approvalStatus: "APPROVED" | "REACTIVATED";
  verified: boolean;
  rating: { average: number; count: number };
  completedJobCount: number;
  skills: Array<{ service: { name: string }; yearsExperience: number }>;
  areas: Array<{ area: { name: string } }>;
  weeklyAvailability: Record<string, boolean> | null;
}

export interface Category {
  id: string;
  slug: string;
  name: string;
  iconKey: string;
  sortOrder: number;
  isActive: boolean;
  services: Service[];
}

export interface Service {
  id: string;
  slug: string;
  name: string;
  iconKey: string;
  sortOrder: number;
  isActive: boolean;
}

export type MarketListingCategory = "clothing" | "home-goods" | "electronics" | "books" | "furniture" | "other";
export type MarketListingCondition = "NEW" | "LIKE_NEW" | "GOOD" | "FAIR";
export type MarketListingStatus = "PENDING_REVIEW" | "PUBLISHED" | "REJECTED" | "SOLD";

export interface MarketListing {
  id: string;
  title: string;
  description: string;
  category: MarketListingCategory;
  condition: MarketListingCondition;
  priceKobo: number;
  status: MarketListingStatus;
  moderationNote: string | null;
  createdAt: string;
  publishedAt: string | null;
  seller: { id: string; displayName: string | null };
  city: { name: string; slug: string };
  area: { name: string };
}

export interface MarketplaceFilters {
  category?: MarketListingCategory;
  query?: string;
  status?: MarketListingStatus;
}

export interface CreateMarketListingDto {
  title: string;
  description: string;
  category: MarketListingCategory;
  condition: MarketListingCondition;
  priceKobo: number;
  areaName: string;
}

export interface Wallet {
  id: string;
  balanceKobo: number;
  currencyCode: string;
  updatedAt: string;
}

export interface Transaction {
  id: string;
  type: "CREDIT" | "DEBIT";
  amountKobo: number;
  currencyCode: string;
  description: string;
  createdAt: string;
}

export interface Payout {
  id: string;
  amountKobo: number;
  currencyCode: string;
  status: "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED";
  createdAt: string;
  processedAt: string | null;
}

export interface PaymentRecord {
  id: string;
  bookingId: string;
  amountKobo: number;
  platformFeeKobo: number;
  method: "ONLINE" | "CASH";
  status: "PENDING" | "SUCCEEDED" | "FAILED" | "CASH_DUE";
  receiptNumber: string | null;
  createdAt: string;
}

export interface Review {
  id: string;
  bookingId: string;
  technicianName: string;
  rating: number;
  comment: string;
  createdAt: string;
}

export interface AppNotification {
  id: string;
  title: string;
  body: string;
  read: boolean;
  createdAt: string;
}

export interface CreateReviewDto {
  bookingId: string;
  rating: number;
  comment: string;
}

// DTOs
export interface CreateJobRequestDto {
  serviceId: string;
  cityId: string;
  areaId: string;
  directTechnicianProfileId?: string;
  nearestLandmark: string;
  description: string;
  latitude?: number;
  longitude?: number;
  isAsap: boolean;
  preferredStartAt?: string;
  preferredEndAt?: string;
  budgetMinKobo?: number;
  budgetMaxKobo?: number;
  urgency: "STANDARD" | "URGENT";
  clientIdempotencyKey: string;
  mediaKeys?: string[];
}

export interface CreateQuoteDto {
  priceKobo: number;
  laborKobo?: number;
  materialsKobo?: number;
  estimatedStartAt?: string;
  estimatedArrivalMins?: number;
  message?: string;
  validForMinutes?: number;
  clientIdempotencyKey: string;
}

export interface AcceptQuoteDto {
  paymentMethod: "ONLINE" | "CASH";
  idempotencyKey: string;
}

export interface CancelDto {
  idempotencyKey: string;
  reasonCode: string;
  reason: string;
}

export interface StatusDto {
  status: "TECHNICIAN_EN_ROUTE" | "IN_PROGRESS" | "COMPLETED_PENDING_CONFIRMATION" | "COMPLETED" | "DISPUTED";
  reason?: string;
  idempotencyKey: string;
}

export interface CreateMessageDto {
  clientMessageKey: string;
  body?: string;
  attachments?: string[];
}

export interface TechnicianFilters {
  serviceId?: string;
  areaId?: string;
  minRating?: number;
}

export interface PayoutDto {
  bankAccountId: string;
  amountKobo: number;
}
