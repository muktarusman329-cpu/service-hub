import type { AdminWorkspace, AdminWorkspaceAction, ApiClient, JobRequest, Quote, Booking, Conversation, Message, MessagePage, TechnicianPublic, Category, Service, Wallet, Transaction, Payout, CreateJobRequestDto, UpdateJobRequestDto, CreateQuoteDto, AcceptQuoteDto, CancelDto, StatusDto, CreateMessageDto, TechnicianFilters, PayoutDto, ContactInfo, MarketListing, MarketplaceFilters, CreateMarketListingDto, UpdateMarketListingDto, MarketOrder, MarketSellerProfile, PaymentRecord, Review, CreateReviewDto, AppNotification, TechnicianWorkspace, TechnicianWorkspaceAction, AccountWorkspace, AccountWorkspaceAction } from "./api-client";
import { categories } from "./fixtures/categories";
import { minnaAreas } from "./fixtures/areas";
import { marketplaceListings } from "./fixtures/marketplace";

// In-memory state for mock interactions
let jobRequests: JobRequest[] = [
  {
    id: "req-electrician",
    status: "QUOTED",
    service: { id: "srv-2", name: "Electrician", slug: "electrician" },
    area: { id: "area-tunga", name: "Tunga" },
    nearestLandmark: "Near Tunga market",
    description: "The sitting room lights flicker when the water pump starts.",
    urgency: "STANDARD",
    isAsap: false,
    preferredStartAt: "2026-10-30T10:00:00.000Z",
    preferredEndAt: null,
    budgetMinKobo: 500000,
    budgetMaxKobo: 3000000,
    expiresAt: "2026-11-01T10:00:00.000Z",
    createdAt: "2026-10-28T10:00:00.000Z",
    activeQuoteCount: 2,
    booking: null,
  },
  {
    id: "req-plumbing",
    status: "OPEN",
    service: { id: "srv-1", name: "Plumber", slug: "plumber" },
    area: { id: "area-bosso", name: "Bosso" },
    nearestLandmark: "Beside Bosso campus gate",
    description: "Kitchen tap is leaking and needs a new washer.",
    urgency: "STANDARD",
    isAsap: true,
    preferredStartAt: null,
    preferredEndAt: null,
    budgetMinKobo: null,
    budgetMaxKobo: null,
    expiresAt: "2026-11-02T10:00:00.000Z",
    createdAt: "2026-10-29T08:30:00.000Z",
    activeQuoteCount: 0,
    booking: null,
  },
  {
    id: "req-booking-active",
    status: "ACCEPTED",
    service: { id: "srv-1", name: "Plumber", slug: "plumber" },
    area: { id: "area-bosso", name: "Bosso" },
    nearestLandmark: "Near Bosso primary school",
    description: "Bathroom drain needs clearing.",
    urgency: "STANDARD",
    isAsap: false,
    preferredStartAt: "2026-10-29T12:00:00.000Z",
    preferredEndAt: null,
    budgetMinKobo: null,
    budgetMaxKobo: null,
    expiresAt: "2026-10-30T10:00:00.000Z",
    createdAt: "2026-10-27T09:00:00.000Z",
    activeQuoteCount: 1,
    booking: { id: "booking-active", status: "ACCEPTED" },
  },
  {
    id: "req-booking-review",
    status: "COMPLETED",
    service: { id: "srv-4", name: "Generator repair", slug: "generator-repair" },
    area: { id: "area-maitumbi", name: "Maitumbi" },
    nearestLandmark: "Near Maitumbi junction",
    description: "Generator service and filter replacement.",
    urgency: "STANDARD",
    isAsap: false,
    preferredStartAt: "2026-10-25T10:00:00.000Z",
    preferredEndAt: null,
    budgetMinKobo: null,
    budgetMaxKobo: null,
    expiresAt: "2026-10-26T10:00:00.000Z",
    createdAt: "2026-10-24T10:00:00.000Z",
    activeQuoteCount: 1,
    booking: { id: "booking-review", status: "COMPLETED" },
  },
  {
    id: "req-booking-confirm",
    status: "COMPLETED",
    service: { id: "srv-2", name: "Electrician", slug: "electrician" },
    area: { id: "area-tunga", name: "Tunga" },
    nearestLandmark: "Near Tunga market",
    description: "Replaced a faulty socket and tested the circuit.",
    urgency: "STANDARD",
    isAsap: false,
    preferredStartAt: "2026-10-29T08:00:00.000Z",
    preferredEndAt: null,
    budgetMinKobo: null,
    budgetMaxKobo: null,
    expiresAt: "2026-10-30T08:00:00.000Z",
    createdAt: "2026-10-28T07:00:00.000Z",
    activeQuoteCount: 1,
    booking: { id: "booking-confirm", status: "COMPLETED_PENDING_CONFIRMATION" },
  },
];
let quotes: Quote[] = [
  {
    id: "quote-ibrahim",
    jobRequestId: "req-electrician",
    technicianProfileId: "tech-1",
    version: 1,
    status: "ACTIVE",
    priceKobo: 1800000,
    laborKobo: 1400000,
    materialsKobo: 400000,
    currencyCode: "NGN",
    message: "I can inspect the circuit and replace the worn connection if needed.",
    estimatedStartAt: "2026-10-30T10:00:00.000Z",
    estimatedArrivalMins: 35,
    validUntil: "2026-11-01T10:00:00.000Z",
    technician: { profileId: "tech-1", displayName: "Ibrahim Mohammed", verified: true, rating: { average: 4.7, count: 42 }, completedJobCount: 42, areaName: "Bosso", distanceMeters: 2100 },
  },
  {
    id: "quote-amina",
    jobRequestId: "req-electrician",
    technicianProfileId: "tech-2",
    version: 1,
    status: "ACTIVE",
    priceKobo: 2100000,
    laborKobo: 1500000,
    materialsKobo: 600000,
    currencyCode: "NGN",
    message: "I will test the pump and lighting circuit separately before recommending a repair.",
    estimatedStartAt: "2026-10-30T11:30:00.000Z",
    estimatedArrivalMins: 20,
    validUntil: "2026-11-01T10:00:00.000Z",
    technician: { profileId: "tech-2", displayName: "Amina Suleiman", verified: true, rating: { average: 4.9, count: 67 }, completedJobCount: 67, areaName: "Chanchaga", distanceMeters: 3400 },
  },
];
let bookings: Booking[] = [
  {
    id: "booking-active",
    status: "ACCEPTED",
    paymentMethod: "ONLINE",
    priceKobo: 1200000,
    platformFeePreviewKobo: 120000,
    currencyCode: "NGN",
    scheduledStartAt: "2026-10-29T12:00:00.000Z",
    scheduledEndAt: "2026-10-29T14:00:00.000Z",
    acceptedAt: "2026-10-28T09:15:00.000Z",
    completedByTechnicianAt: null,
    confirmedCompletedAt: null,
    service: { name: "Plumber" },
    area: { name: "Bosso" },
    nearestLandmark: "Near Bosso primary school",
    technician: { displayName: "Ibrahim Mohammed", verified: true },
    history: [{ fromStatus: "QUOTED", toStatus: "ACCEPTED", actorRole: "USER", reason: null, createdAt: "2026-10-28T09:15:00.000Z" }],
    cancellation: null,
  },
  {
    id: "booking-review",
    status: "COMPLETED",
    paymentMethod: "CASH",
    priceKobo: 2500000,
    platformFeePreviewKobo: 250000,
    currencyCode: "NGN",
    scheduledStartAt: "2026-10-25T10:00:00.000Z",
    scheduledEndAt: "2026-10-25T12:00:00.000Z",
    acceptedAt: "2026-10-24T11:00:00.000Z",
    completedByTechnicianAt: "2026-10-25T12:00:00.000Z",
    confirmedCompletedAt: "2026-10-25T12:20:00.000Z",
    service: { name: "Generator repair" },
    area: { name: "Maitumbi" },
    nearestLandmark: "Near Maitumbi junction",
    technician: { displayName: "Ibrahim Mohammed", verified: true },
    history: [
      { fromStatus: "QUOTED", toStatus: "ACCEPTED", actorRole: "USER", reason: null, createdAt: "2026-10-24T11:00:00.000Z" },
      { fromStatus: "IN_PROGRESS", toStatus: "COMPLETED_PENDING_CONFIRMATION", actorRole: "TECHNICIAN", reason: null, createdAt: "2026-10-25T12:00:00.000Z" },
      { fromStatus: "COMPLETED_PENDING_CONFIRMATION", toStatus: "COMPLETED", actorRole: "USER", reason: null, createdAt: "2026-10-25T12:20:00.000Z" },
    ],
    cancellation: null,
  },
  {
    id: "booking-confirm",
    status: "COMPLETED_PENDING_CONFIRMATION",
    paymentMethod: "ONLINE",
    priceKobo: 1800000,
    platformFeePreviewKobo: 180000,
    currencyCode: "NGN",
    scheduledStartAt: "2026-10-29T08:00:00.000Z",
    scheduledEndAt: "2026-10-29T10:00:00.000Z",
    acceptedAt: "2026-10-28T07:30:00.000Z",
    completedByTechnicianAt: "2026-10-29T09:45:00.000Z",
    confirmedCompletedAt: null,
    service: { name: "Electrician" },
    area: { name: "Tunga" },
    nearestLandmark: "Near Tunga market",
    technician: { displayName: "Amina Suleiman", verified: true },
    history: [
      { fromStatus: "QUOTED", toStatus: "ACCEPTED", actorRole: "USER", reason: null, createdAt: "2026-10-28T07:30:00.000Z" },
      { fromStatus: "IN_PROGRESS", toStatus: "COMPLETED_PENDING_CONFIRMATION", actorRole: "TECHNICIAN", reason: "Socket replaced and tested.", createdAt: "2026-10-29T09:45:00.000Z" },
    ],
    cancellation: null,
  },
];
let conversations: Conversation[] = [
  {
    id: "conversation-active",
    jobRequestId: "req-booking-active",
    bookingId: "booking-active",
    technicianProfileId: "tech-1",
    status: "OPEN",
    updatedAt: "2026-10-29T09:00:00.000Z",
    request: { id: "req-booking-active", status: "ACCEPTED", service: { name: "Plumber" }, area: { name: "Bosso" } },
    lastMessage: { body: "I will arrive around noon.", createdAt: "2026-10-29T09:00:00.000Z" },
  },
];
let messages: Map<string, Message[]> = new Map([["conversation-active", [
  { id: "message-welcome", conversationId: "conversation-active", senderId: "tech-1", body: "I will arrive around noon.", createdAt: "2026-10-29T09:00:00.000Z", editedAt: null, deletedAt: null, deliveryStatus: "SENT", readAt: new Date().toISOString() },
]]]);
let technicians: TechnicianPublic[] = [];
let paymentRecords: PaymentRecord[] = [
  { id: "payment-previous", bookingId: "booking-active", amountKobo: 1200000, platformFeeKobo: 120000, method: "ONLINE", status: "SUCCEEDED", receiptNumber: "SH-2026-001", createdAt: "2026-10-28T09:20:00.000Z" },
  { id: "payment-failed", bookingId: "booking-active", amountKobo: 1200000, platformFeeKobo: 120000, method: "ONLINE", status: "FAILED", receiptNumber: null, createdAt: "2026-10-28T09:10:00.000Z" },
  { id: "payment-cash", bookingId: "booking-review", amountKobo: 2500000, platformFeeKobo: 250000, method: "CASH", status: "CASH_DUE", receiptNumber: null, createdAt: "2026-10-25T10:05:00.000Z" },
  { id: "payment-pending", bookingId: "booking-confirm", amountKobo: 1800000, platformFeeKobo: 180000, method: "ONLINE", status: "PENDING", receiptNumber: null, createdAt: "2026-10-29T08:00:00.000Z" },
];
let reviews: Review[] = [];
let notifications: AppNotification[] = [
  { id: "notification-quote", title: "New quotes received", body: "Two electricians have replied to your request.", read: false, createdAt: "2026-10-29T10:00:00.000Z" },
  { id: "notification-booking", title: "Booking confirmed", body: "Ibrahim Mohammed accepted your plumbing job.", read: true, createdAt: "2026-10-28T09:15:00.000Z" },
];
let wallet: Wallet = {
  id: "wallet-1",
  balanceKobo: 50000000, // 500,000 NGN
  currencyCode: "NGN",
  updatedAt: new Date().toISOString(),
};
let transactions: Transaction[] = [];
let currentSellerId = "seller-fatima";
let savedMarketplaceListingIds = new Set<string>(["market-desk"]);
let marketplaceOrders: MarketOrder[] = [{
  id: "market-order-demo",
  listingId: "market-shoes",
  listingTitle: "Brown leather work shoes",
  priceKobo: 2400000,
  status: "REQUESTED",
  buyer: { id: "buyer-demo", displayName: "Usman Bello" },
  seller: { id: currentSellerId, displayName: "Fatima Sani" },
  createdAt: "2026-10-29T09:00:00.000Z",
  updatedAt: "2026-10-29T09:00:00.000Z",
}];
let technicianPayouts: Payout[] = [];
let technicianWorkspace: TechnicianWorkspace = {
  application: {
    id: "application-tech-1",
    status: "DRAFT",
    step: 1,
    displayName: "",
    bio: "",
    skills: [],
    areas: [],
    availability: [],
    portfolio: [],
    kycConsent: false,
    kycDocumentName: null,
    guarantorName: null,
    reviewNote: null,
    submittedAt: null,
  },
  timeOff: [],
  cashCommissionOwedKobo: 750000,
  bankAccounts: [{ id: "bank-demo", bankName: "Demo Bank", accountName: "Ibrahim Mohammed", maskedNumber: "**** 2048", isDefault: true }],
  payouts: technicianPayouts,
  settings: { notificationsEnabled: true, serviceAreas: ["Bosso", "Tunga"] },
};
let adminWorkspace: AdminWorkspace = {
  users: [
    { id: "user-1", displayName: "Ibrahim Mohammed", email: "ibrahim@example.test", role: "TECHNICIAN", status: "ACTIVE", areaName: "Bosso", joinedAt: "2026-10-01T10:00:00.000Z" },
    { id: "user-2", displayName: "Amina Suleiman", email: "amina@example.test", role: "TECHNICIAN", status: "ACTIVE", areaName: "Tunga", joinedAt: "2026-10-04T10:00:00.000Z" },
    { id: "user-4", displayName: "Fatima Sani", email: "fatima@example.test", role: "CUSTOMER", status: "ACTIVE", areaName: "Maitumbi", joinedAt: "2026-10-08T10:00:00.000Z" },
  ],
  flaggedMessages: [{ id: "flag-1", senderName: "Customer · hidden", message: "I am not sure this payment request is correct.", signal: "Payment-related terms", status: "OPEN" }],
  disputes: [{ id: "dispute-1", bookingId: "booking-active", customerName: "Fatima Sani", technicianName: "Ibrahim Mohammed", reason: "The repair needs a follow-up visit.", status: "OPEN", resolution: null, refundKobo: 0 }],
  commissionPercent: 10,
  settings: { cancellationWindowHours: 12, autoCompleteHours: 48, maxActiveBookings: 5, guarantorRequired: false, retentionDays: 365, otpChannel: "SMS", twoFactorEnabled: false },
  catalogEnabled: Object.fromEntries(categories.flatMap((category) => [[category.id, category.isActive], ...category.services.map((service) => [service.id, service.isActive] as [string, boolean])])),
  auditLog: [],
};
let accountWorkspace: AccountWorkspace = {
  profile: { displayName: "Fatima Sani", email: "fatima@example.test", phone: "+234 801 234 5678" },
  addresses: [{ id: "address-bosso", label: "Home", areaName: "Bosso", landmark: "Near Bosso market", isDefault: true }],
  notificationPreferences: {
    pushJobUpdates: true,
    pushMessages: true,
    pushPromotions: false,
    emailJobUpdates: true,
    emailReceipts: true,
    smsReminders: false,
  },
  settings: { language: "en", linkedGoogle: false },
  onboarding: { accountType: null, step: 1, complete: false },
};

// Simulated delays
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Demo technicians
technicians = [
  {
    id: "tech-1",
    userId: "user-1",
    publicName: "Ibrahim Mohammed",
    bio: "Experienced plumber with 8 years in Minna. Specializes in residential and commercial plumbing.",
    profilePhotoUrl: null,
    cityId: "city-1",
    approvalStatus: "APPROVED",
    verified: true,
    rating: { average: 4.7, count: 42 },
    completedJobCount: 42,
    skills: [
      { service: { name: "Plumber" }, yearsExperience: 8 },
      { service: { name: "Generator repair" }, yearsExperience: 5 },
    ],
    areas: [{ area: { name: "Bosso" } }, { area: { name: "Tunga" } }],
    weeklyAvailability: { Mon: true, Tue: true, Wed: true, Thu: true, Fri: true, Sat: false, Sun: false },
  },
  {
    id: "tech-2",
    userId: "user-2",
    publicName: "Amina Suleiman",
    bio: "Licensed electrician serving Minna for 5 years. Industrial and residential wiring.",
    profilePhotoUrl: null,
    cityId: "city-1",
    approvalStatus: "APPROVED",
    verified: true,
    rating: { average: 4.9, count: 67 },
    completedJobCount: 67,
    skills: [
      { service: { name: "Electrician" }, yearsExperience: 5 },
      { service: { name: "AC and fridge repair" }, yearsExperience: 3 },
    ],
    areas: [{ area: { name: "Chanchaga" } }, { area: { name: "Maitumbi" } }],
    weeklyAvailability: { Mon: true, Tue: true, Wed: true, Thu: true, Fri: true, Sat: true, Sun: true },
  },
  {
    id: "tech-3",
    userId: "user-3",
    publicName: "Chinedu Okafor",
    bio: "IT specialist with expertise in phone/laptop repair and networking. Quick and reliable.",
    profilePhotoUrl: null,
    cityId: "city-1",
    approvalStatus: "APPROVED",
    verified: true,
    rating: { average: 4.5, count: 28 },
    completedJobCount: 28,
    skills: [
      { service: { name: "Phone and laptop repair" }, yearsExperience: 6 },
      { service: { name: "Networking" }, yearsExperience: 4 },
    ],
    areas: [{ area: { name: "Kpakungu" } }, { area: { name: "Gidan Kwano" } }],
    weeklyAvailability: { Mon: true, Tue: true, Wed: true, Thu: true, Fri: true, Sat: false, Sun: false },
  },
];

export class MockApiClient implements ApiClient {
  private simulateError = false;
  private simulateLoading = false;
  private simulateEmpty = false;
  private simulateOffline = false;

  setSimulations({ error, loading, empty, offline }: { error?: boolean; loading?: boolean; empty?: boolean; offline?: boolean }) {
    this.simulateError = error ?? this.simulateError;
    this.simulateLoading = loading ?? this.simulateLoading;
    this.simulateEmpty = empty ?? this.simulateEmpty;
    this.simulateOffline = offline ?? this.simulateOffline;
  }

  private async wrap<T>(fn: () => T): Promise<T> {
    if (this.simulateLoading) await delay(2000);
    if (this.simulateOffline) throw new Error("You are offline. Restore your connection and try again.");
    if (this.simulateError) throw new Error("Simulated API error");
    return fn();
  }

  async getMarketplaceListings(filters: MarketplaceFilters = {}): Promise<MarketListing[]> {
    return this.wrap(() => {
      if (this.simulateEmpty) return [];
      const query = filters.query?.trim().toLowerCase();
      return marketplaceListings.filter((listing) =>
        (filters.status ? listing.status === filters.status : listing.status === "PUBLISHED")
        && (!filters.category || listing.category === filters.category)
        && (!query || `${listing.title} ${listing.description} ${listing.area.name}`.toLowerCase().includes(query)));
    });
  }

  async getMarketplaceListing(id: string): Promise<MarketListing | null> {
    return this.wrap(() => {
      if (this.simulateEmpty) return null;
      const listing = marketplaceListings.find((item) => item.id === id && item.status === "PUBLISHED");
      if (!listing) throw new Error("This listing is not available.");
      return listing;
    });
  }

  async getMyMarketplaceListings(): Promise<MarketListing[]> {
    return this.wrap(() => this.simulateEmpty ? [] : marketplaceListings.filter((item) => item.seller.id === currentSellerId));
  }

  async createMarketplaceListing(data: CreateMarketListingDto): Promise<MarketListing> {
    return this.wrap(() => {
      const listing: MarketListing = {
        id: `market-${Date.now()}`,
        title: data.title.trim(),
        description: data.description.trim(),
        category: data.category,
        condition: data.condition,
        priceKobo: data.priceKobo,
        status: "PENDING_REVIEW",
        moderationNote: null,
        createdAt: new Date().toISOString(),
        publishedAt: null,
        seller: { id: currentSellerId, displayName: "Fatima Sani" },
        city: { name: "Minna", slug: "minna" },
        area: { name: data.areaName },
        mediaKeys: data.mediaKeys ?? [],
      };
      marketplaceListings.unshift(listing);
      return listing;
    });
  }

  async reviewMarketplaceListing(id: string, status: "PUBLISHED" | "REJECTED"): Promise<MarketListing> {
    return this.wrap(() => {
      const listing = marketplaceListings.find((item) => item.id === id);
      if (!listing) throw new Error("Listing not found.");
      if (listing.status !== "PENDING_REVIEW") throw new Error("This listing has already been reviewed.");
      listing.status = status;
      listing.moderationNote = status === "REJECTED" ? "Please add more detail about the item condition before resubmitting." : null;
      listing.publishedAt = status === "PUBLISHED" ? new Date().toISOString() : null;
      return listing;
    });
  }

  async markMarketplaceListingSold(id: string): Promise<MarketListing> {
    return this.wrap(() => {
      const listing = marketplaceListings.find((item) => item.id === id && item.seller.id === currentSellerId);
      if (!listing) throw new Error("Listing not found.");
      if (listing.status !== "PUBLISHED") throw new Error("Only approved listings can be marked sold.");
      listing.status = "SOLD";
      return listing;
    });
  }

  async updateMarketplaceListing(id: string, data: UpdateMarketListingDto): Promise<MarketListing> {
    return this.wrap(() => {
      const listing = marketplaceListings.find((item) => item.id === id && item.seller.id === currentSellerId);
      if (!listing || listing.status === "SOLD") throw new Error("This listing can no longer be edited.");
      Object.assign(listing, data);
      listing.status = "PENDING_REVIEW";
      listing.moderationNote = null;
      listing.publishedAt = null;
      return listing;
    });
  }

  async getMarketplaceSellerProfile(id: string): Promise<MarketSellerProfile | null> {
    return this.wrap(() => {
      if (this.simulateEmpty) return null;
      const listings = marketplaceListings.filter((item) => item.seller.id === id && item.status === "PUBLISHED");
      if (!listings.length) throw new Error("This seller profile is not available.");
      const seller = listings[0]!.seller;
      return {
        id,
        displayName: seller.displayName ?? "ServiceHub seller",
        areaName: listings[0]!.area.name,
        memberSince: "2024-06-01T00:00:00.000Z",
        listingCount: listings.length,
        listings,
      };
    });
  }

  async getMarketplaceOrders(role: "BUYER" | "SELLER"): Promise<MarketOrder[]> {
    return this.wrap(() => this.simulateEmpty ? [] : marketplaceOrders.filter((order) =>
      role === "BUYER" ? order.buyer.id === "buyer-current" : true));
  }

  async createMarketplaceOrder(listingId: string): Promise<MarketOrder> {
    return this.wrap(() => {
      const listing = marketplaceListings.find((item) => item.id === listingId && item.status === "PUBLISHED");
      if (!listing) throw new Error("This item is no longer available.");
      if (listing.seller.id === currentSellerId) throw new Error("You cannot request your own item.");
      const order: MarketOrder = {
        id: `market-order-${Date.now()}`,
        listingId: listing.id,
        listingTitle: listing.title,
        priceKobo: listing.priceKobo,
        status: "REQUESTED",
        buyer: { id: "buyer-current", displayName: "You" },
        seller: { id: listing.seller.id, displayName: listing.seller.displayName ?? "Seller" },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      marketplaceOrders.unshift(order);
      return order;
    });
  }

  async updateMarketplaceOrder(id: string, status: "ACCEPTED" | "DECLINED" | "COMPLETED" | "CANCELLED"): Promise<MarketOrder> {
    return this.wrap(() => {
      const order = marketplaceOrders.find((item) => item.id === id);
      if (!order) throw new Error("Marketplace order not found.");
      if (status === "CANCELLED" && order.buyer.id !== "buyer-current") throw new Error("Only the buyer can cancel this request.");
      if (order.status !== "REQUESTED" && !(status === "COMPLETED" && order.status === "ACCEPTED")) {
        throw new Error("This marketplace order cannot be updated from its current status.");
      }
      order.status = status;
      order.updatedAt = new Date().toISOString();
      return order;
    });
  }

  async getSavedMarketplaceListings(): Promise<MarketListing[]> {
    return this.wrap(() => this.simulateEmpty ? [] : marketplaceListings.filter((item) =>
      savedMarketplaceListingIds.has(item.id) && item.status === "PUBLISHED"));
  }

  async toggleSavedMarketplaceListing(id: string): Promise<boolean> {
    return this.wrap(() => {
      const listing = marketplaceListings.find((item) => item.id === id && item.status === "PUBLISHED");
      if (!listing) throw new Error("Only available listings can be saved.");
      if (savedMarketplaceListingIds.has(id)) {
        savedMarketplaceListingIds.delete(id);
        return false;
      }
      savedMarketplaceListingIds.add(id);
      return true;
    });
  }

  async getJobRequests(): Promise<JobRequest[]> {
    return this.wrap(() => this.simulateEmpty ? [] : jobRequests);
  }

  async getJobRequest(id: string): Promise<JobRequest> {
    return this.wrap(() => {
      const req = jobRequests.find(r => r.id === id);
      if (!req) throw new Error("Job request not found");
      return req;
    });
  }

  async createJobRequest(data: CreateJobRequestDto): Promise<JobRequest> {
    return this.wrap(() => {
      const service = categories.flatMap((category) => category.services).find((item) => item.id === data.serviceId);
      const area = minnaAreas.find((item) => item.id === data.areaId);
      const technician = data.directTechnicianProfileId
        ? technicians.find((item) => item.id === data.directTechnicianProfileId)
        : undefined;
      const req: JobRequest = {
        id: `req-${Date.now()}`,
        status: technician ? "DIRECTED" : "OPEN",
        service: { id: data.serviceId, name: service?.name ?? "Home service", slug: service?.slug ?? "home-service" },
        area: { id: data.areaId, name: area?.name ?? "Minna" },
        nearestLandmark: data.nearestLandmark,
        description: data.description,
        urgency: data.urgency,
        isAsap: data.isAsap,
        preferredStartAt: data.preferredStartAt || null,
        preferredEndAt: data.preferredEndAt || null,
        budgetMinKobo: data.budgetMinKobo || null,
        budgetMaxKobo: data.budgetMaxKobo || null,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        createdAt: new Date().toISOString(),
        activeQuoteCount: 0,
        booking: null,
        mediaKeys: data.mediaKeys ?? [],
      };
      jobRequests.unshift(req);
      if (technician) {
        quotes.unshift({
          id: `quote-${Date.now()}`,
          jobRequestId: req.id,
          technicianProfileId: technician.id,
          version: 1,
          status: "ACTIVE",
          priceKobo: 1600000,
          laborKobo: 1200000,
          materialsKobo: 400000,
          currencyCode: "NGN",
          message: `Thanks for contacting me directly. I can help with this ${service?.name.toLowerCase() ?? "job"}.`,
          estimatedStartAt: null,
          estimatedArrivalMins: 30,
          validUntil: req.expiresAt,
          technician: {
            profileId: technician.id,
            displayName: technician.publicName,
            verified: technician.verified,
            rating: technician.rating,
            completedJobCount: technician.completedJobCount,
            areaName: technician.areas[0]?.area.name ?? req.area.name,
            distanceMeters: null,
          },
        });
        req.status = "QUOTED";
        req.activeQuoteCount = 1;
      }
      return req;
    });
  }

  async updateJobRequest(id: string, data: UpdateJobRequestDto): Promise<JobRequest> {
    return this.wrap(() => {
      const request = jobRequests.find((item) => item.id === id);
      if (!request) throw new Error("Request not found. Return to your request list and choose another.");
      if (!["OPEN", "DIRECTED", "QUOTED"].includes(request.status)) {
        throw new Error("This request can no longer be edited. Contact support if you need help.");
      }
      if (data.nearestLandmark !== undefined) request.nearestLandmark = data.nearestLandmark.trim();
      if (data.description !== undefined) request.description = data.description.trim();
      if (data.isAsap !== undefined) request.isAsap = data.isAsap;
      if (data.preferredStartAt !== undefined) request.preferredStartAt = data.preferredStartAt;
      if (data.budgetMaxKobo !== undefined) request.budgetMaxKobo = data.budgetMaxKobo;
      if (data.mediaKeys !== undefined) request.mediaKeys = data.mediaKeys;
      return request;
    });
  }

  async cancelJobRequest(id: string, data: CancelDto): Promise<void> {
    return this.wrap(() => {
      const req = jobRequests.find(r => r.id === id);
      if (!req) throw new Error("Job request not found");
      req.status = "CANCELLED_BY_USER";
    });
  }

  async getQuotes(requestId: string): Promise<Quote[]> {
    return this.wrap(() => {
      return quotes.filter(q => q.jobRequestId === requestId && q.status === "ACTIVE");
    });
  }

  async createQuote(requestId: string, data: CreateQuoteDto): Promise<Quote> {
    return this.wrap(() => {
      const quote: Quote = {
        id: `quote-${Date.now()}`,
        jobRequestId: requestId,
        technicianProfileId: "tech-1",
        version: 1,
        status: "ACTIVE",
        priceKobo: data.priceKobo,
        laborKobo: data.laborKobo ?? null,
        materialsKobo: data.materialsKobo ?? null,
        currencyCode: "NGN",
        message: data.message ?? null,
        estimatedStartAt: data.estimatedStartAt ?? null,
        estimatedArrivalMins: data.estimatedArrivalMins ?? null,
        validUntil: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
        technician: {
          profileId: "tech-1",
          displayName: "Ibrahim Mohammed",
          verified: true,
          rating: { average: 4.7, count: 42 },
          completedJobCount: 42,
          areaName: "Bosso",
          distanceMeters: 1200,
        },
      };
      quotes.push(quote);
      
      // Update request status
      const req = jobRequests.find(r => r.id === requestId);
      if (req) {
        req.status = "QUOTED";
        req.activeQuoteCount = quotes.filter(q => q.jobRequestId === requestId && q.status === "ACTIVE").length;
      }
      
      return quote;
    });
  }

  async updateQuote(quoteId: string, data: Partial<CreateQuoteDto>): Promise<Quote> {
    return this.wrap(() => {
      const quote = quotes.find((item) => item.id === quoteId);
      if (!quote || quote.status !== "ACTIVE") throw new Error("This quote can no longer be edited. Open your quotes and choose an active quote.");
      if (data.priceKobo !== undefined) quote.priceKobo = data.priceKobo;
      if (data.laborKobo !== undefined) quote.laborKobo = data.laborKobo;
      if (data.materialsKobo !== undefined) quote.materialsKobo = data.materialsKobo;
      if (data.message !== undefined) quote.message = data.message;
      if (data.estimatedArrivalMins !== undefined) quote.estimatedArrivalMins = data.estimatedArrivalMins;
      return quote;
    });
  }

  async withdrawQuote(quoteId: string): Promise<Quote> {
    return this.wrap(() => {
      const quote = quotes.find((item) => item.id === quoteId);
      if (!quote || quote.status !== "ACTIVE") throw new Error("This quote is no longer active.");
      quote.status = "WITHDRAWN";
      const request = jobRequests.find((item) => item.id === quote.jobRequestId);
      if (request) request.activeQuoteCount = quotes.filter((item) => item.jobRequestId === request.id && item.status === "ACTIVE").length;
      return quote;
    });
  }

  async acceptQuote(quoteId: string, data: AcceptQuoteDto): Promise<Booking> {
    return this.wrap(() => {
      const quote = quotes.find(q => q.id === quoteId);
      if (!quote) throw new Error("Quote not found");
      
      const booking: Booking = {
        id: `booking-${Date.now()}`,
        status: "ACCEPTED",
        paymentMethod: data.paymentMethod,
        priceKobo: quote.priceKobo,
        platformFeePreviewKobo: Math.round(quote.priceKobo * 0.1),
        currencyCode: "NGN",
        scheduledStartAt: new Date().toISOString(),
        scheduledEndAt: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
        acceptedAt: new Date().toISOString(),
        completedByTechnicianAt: null,
        confirmedCompletedAt: null,
        service: { name: jobRequests.find((request) => request.id === quote.jobRequestId)?.service.name ?? "Home service" },
        area: { name: jobRequests.find((request) => request.id === quote.jobRequestId)?.area.name ?? "Minna" },
        nearestLandmark: jobRequests.find((request) => request.id === quote.jobRequestId)?.nearestLandmark ?? "Landmark to confirm",
        technician: { displayName: quote.technician.displayName, verified: quote.technician.verified },
        history: [
          {
            fromStatus: "REQUESTED",
            toStatus: "ACCEPTED",
            actorRole: "USER",
            reason: null,
            createdAt: new Date().toISOString(),
          },
        ],
        cancellation: null,
      };
      bookings.push(booking);
      
      // Update quote and request
      quote.status = "ACCEPTED";
      const req = jobRequests.find(r => r.id === quote.jobRequestId);
      if (req) {
        req.status = "ACCEPTED";
        req.booking = { id: booking.id, status: "ACCEPTED" };
      }
      
      // Create conversation
      const conv: Conversation = {
        id: `conv-${Date.now()}`,
        jobRequestId: quote.jobRequestId,
        bookingId: booking.id,
        technicianProfileId: quote.technicianProfileId,
        status: "OPEN",
        updatedAt: new Date().toISOString(),
        request: req ? { id: req.id, status: req.status, service: { name: req.service.name }, area: { name: req.area.name } } : { id: quote.jobRequestId, status: "ACCEPTED", service: { name: "Home service" }, area: { name: "Minna" } },
        lastMessage: null,
      };
      conversations.push(conv);
      
      return booking;
    });
  }

  async getBookings(): Promise<Booking[]> {
    return this.wrap(() => this.simulateEmpty ? [] : bookings);
  }

  async getBooking(id: string): Promise<Booking> {
    return this.wrap(() => {
      const booking = bookings.find(b => b.id === id);
      if (!booking) throw new Error("Booking not found");
      return booking;
    });
  }

  async changeBookingStatus(id: string, data: StatusDto): Promise<Booking> {
    return this.wrap(() => {
      const booking = bookings.find(b => b.id === id);
      if (!booking) throw new Error("Booking not found");
      const previousStatus = booking.status;
      booking.status = data.status;
      if (data.status === "COMPLETED_PENDING_CONFIRMATION") {
        booking.completedByTechnicianAt = new Date().toISOString();
      }
      if (data.status === "COMPLETED") {
        booking.confirmedCompletedAt = new Date().toISOString();
      }
      booking.history.push({
        fromStatus: previousStatus,
        toStatus: data.status,
        actorRole: data.status === "COMPLETED_PENDING_CONFIRMATION" ? "TECHNICIAN" : "USER",
        reason: data.reason || null,
        createdAt: new Date().toISOString(),
      });
      return booking;
    });
  }

  async cancelBooking(id: string, data: CancelDto): Promise<void> {
    return this.wrap(() => {
      const booking = bookings.find(b => b.id === id);
      if (!booking) throw new Error("Booking not found");
      booking.status = "CANCELLED_BY_USER";
      booking.cancellation = {
        reasonCode: data.reasonCode,
        reason: data.reason,
        isLate: false,
        createdAt: new Date().toISOString(),
      };
    });
  }

  async revealContact(bookingId: string): Promise<ContactInfo> {
    return this.wrap(() => {
      const booking = bookings.find(b => b.id === bookingId);
      if (!booking) throw new Error("Booking not found");
      if (!["ACCEPTED", "TECHNICIAN_EN_ROUTE", "IN_PROGRESS", "COMPLETED_PENDING_CONFIRMATION", "COMPLETED"].includes(booking.status)) {
        throw new Error("Contact details are available after the booking is accepted.");
      }
      return { phoneNumber: "+2348012345678" };
    });
  }

  async getConversations(): Promise<Conversation[]> {
    return this.wrap(() => this.simulateEmpty ? [] : conversations);
  }

  async getMessages(conversationId: string, before?: string): Promise<MessagePage> {
    return this.wrap(() => {
      const convMessages = messages.get(conversationId) || [];
      return {
        items: convMessages,
        nextBefore: convMessages.length ? convMessages[0]?.createdAt : null,
      };
    });
  }

  async sendMessage(conversationId: string, data: CreateMessageDto): Promise<Message> {
    return this.wrap(() => {
      const msg: Message = {
        id: `msg-${Date.now()}`,
        conversationId,
        senderId: "user-current",
        body: data.body || "",
        createdAt: new Date().toISOString(),
        editedAt: null,
        deletedAt: null,
        attachments: data.attachments ?? [],
        deliveryStatus: "SENT",
        readAt: null,
      };
      if (!messages.has(conversationId)) {
        messages.set(conversationId, []);
      }
      messages.get(conversationId)!.push(msg);
      
      // Update conversation
      const conv = conversations.find(c => c.id === conversationId);
      if (conv) {
        conv.updatedAt = new Date().toISOString();
        conv.lastMessage = { body: msg.body, createdAt: msg.createdAt };
      }
      
      return msg;
    });
  }

  async getTechnicians(citySlug: string, filters?: TechnicianFilters): Promise<TechnicianPublic[]> {
    return this.wrap(() => {
      let filtered = [...technicians];
      if (filters?.serviceId) {
        filtered = filtered.filter(t => t.skills.some(s => s.service.name.toLowerCase().includes(filters.serviceId?.toLowerCase() || "")));
      }
      if (filters?.areaId) {
        filtered = filtered.filter(t => t.areas.some(a => a.area.name.toLowerCase().includes(filters.areaId?.toLowerCase() || "")));
      }
      if (filters?.minRating) {
        filtered = filtered.filter(t => t.rating.average >= (filters.minRating || 0));
      }
      return this.simulateEmpty ? [] : filtered;
    });
  }

  async getTechnicianProfile(id: string): Promise<TechnicianPublic> {
    return this.wrap(() => {
      const tech = technicians.find(t => t.id === id);
      if (!tech) throw new Error("Technician not found");
      return tech;
    });
  }

  async getCategories(citySlug: string): Promise<Category[]> {
    return this.wrap(() => {
      return this.simulateEmpty ? [] : [...categories];
    });
  }

  async getServices(citySlug: string): Promise<Service[]> {
    return this.wrap(() => {
      const services = categories.flatMap(c => c.services);
      return this.simulateEmpty ? [] : [...services];
    });
  }

  async getWallet(): Promise<Wallet> {
    return this.wrap(() => wallet);
  }

  async getTransactions(): Promise<Transaction[]> {
    return this.wrap(() => this.simulateEmpty ? [] : transactions);
  }

  async requestPayout(data: PayoutDto): Promise<Payout> {
    return this.wrap(() => {
      if (!technicianWorkspace.bankAccounts.some((account) => account.id === data.bankAccountId)) throw new Error("Choose a saved bank account before requesting a payout.");
      if (!Number.isInteger(data.amountKobo) || data.amountKobo <= 0 || data.amountKobo > wallet.balanceKobo) throw new Error("Enter a payout amount within your available wallet balance.");
      const payout: Payout = {
        id: `payout-${Date.now()}`,
        amountKobo: data.amountKobo,
        currencyCode: "NGN",
        status: "PENDING",
        createdAt: new Date().toISOString(),
        processedAt: null,
      };
      technicianPayouts.unshift(payout);
      transactions.push({
        id: `tx-${Date.now()}`,
        type: "DEBIT",
        amountKobo: data.amountKobo,
        currencyCode: "NGN",
        description: "Payout request",
        createdAt: new Date().toISOString(),
      });
      wallet.balanceKobo -= data.amountKobo;
      wallet.updatedAt = new Date().toISOString();
      return payout;
    });
  }

  async disputeBooking(id: string, reason: string): Promise<Booking> {
    return this.wrap(() => {
      const booking = bookings.find((item) => item.id === id);
      if (!booking) throw new Error("Booking not found.");
      const previousStatus = booking.status;
      booking.status = "DISPUTED";
      booking.history.push({
        fromStatus: previousStatus,
        toStatus: "DISPUTED",
        actorRole: "USER",
        reason,
        createdAt: new Date().toISOString(),
      });
      return booking;
    });
  }

  async getPayments(): Promise<PaymentRecord[]> {
    return this.wrap(() => this.simulateEmpty ? [] : [...paymentRecords].sort((a, b) => b.createdAt.localeCompare(a.createdAt)));
  }

  async createPayment(bookingId: string, result: "SUCCEEDED" | "FAILED" | "CASH_DUE"): Promise<PaymentRecord> {
    return this.wrap(() => {
      const booking = bookings.find((item) => item.id === bookingId);
      if (!booking) throw new Error("Booking not found.");
      const payment: PaymentRecord = {
        id: `payment-${Date.now()}`,
        bookingId,
        amountKobo: booking.priceKobo,
        platformFeeKobo: booking.platformFeePreviewKobo,
        method: result === "CASH_DUE" ? "CASH" : "ONLINE",
        status: result,
        receiptNumber: result === "SUCCEEDED" ? `SH-${new Date().getFullYear()}-${String(paymentRecords.length + 1).padStart(3, "0")}` : null,
        createdAt: new Date().toISOString(),
      };
      paymentRecords.unshift(payment);
      return payment;
    });
  }

  async getReviews(): Promise<Review[]> {
    return this.wrap(() => this.simulateEmpty ? [] : [...reviews]);
  }

  async createReview(data: CreateReviewDto): Promise<Review> {
    return this.wrap(() => {
      const booking = bookings.find((item) => item.id === data.bookingId);
      if (!booking || booking.status !== "COMPLETED") throw new Error("Reviews are available after a booking is complete.");
      const review: Review = {
        id: `review-${Date.now()}`,
        bookingId: data.bookingId,
        technicianName: booking.technician.displayName,
        rating: data.rating,
        comment: data.comment.trim(),
        createdAt: new Date().toISOString(),
      };
      reviews.unshift(review);
      return review;
    });
  }

  async getNotifications(): Promise<AppNotification[]> {
    return this.wrap(() => this.simulateEmpty ? [] : [...notifications]);
  }

  async markNotificationRead(id: string): Promise<AppNotification> {
    return this.wrap(() => {
      const notification = notifications.find((item) => item.id === id);
      if (!notification) throw new Error("Notification not found.");
      notification.read = true;
      return notification;
    });
  }

  async getTechnicianWorkspace(): Promise<TechnicianWorkspace> {
    return this.wrap(() => this.simulateEmpty
      ? { ...technicianWorkspace, timeOff: [], payouts: [], bankAccounts: [] }
      : { ...technicianWorkspace, application: { ...technicianWorkspace.application }, timeOff: [...technicianWorkspace.timeOff], payouts: [...technicianPayouts] });
  }

  async updateTechnicianWorkspace(action: TechnicianWorkspaceAction): Promise<TechnicianWorkspace> {
    return this.wrap(() => {
      if (action.type === "save-application") {
        technicianWorkspace.application = { ...technicianWorkspace.application, ...action.patch };
      } else if (action.type === "submit-application") {
        const { application } = technicianWorkspace;
        if (!application.displayName.trim() || !application.skills.length || !application.areas.length) {
          throw new Error("Add your name, at least one skill and one service area before submitting.");
        }
        if (!application.kycConsent || !application.kycDocumentName) {
          throw new Error("Upload an identity document and give consent before submitting.");
        }
        application.status = "SUBMITTED";
        application.submittedAt = new Date().toISOString();
        application.reviewNote = null;
      } else if (action.type === "add-time-off") {
        if (new Date(action.block.endAt) <= new Date(action.block.startAt)) throw new Error("Choose an end time after the start time.");
        technicianWorkspace.timeOff.unshift({ ...action.block, id: `time-off-${Date.now()}` });
      } else if (action.type === "remove-time-off") {
        technicianWorkspace.timeOff = technicianWorkspace.timeOff.filter((item) => item.id !== action.id);
      } else if (action.type === "update-settings") {
        technicianWorkspace.settings.notificationsEnabled = action.notificationsEnabled;
      } else if (action.type === "top-up-wallet") {
        if (!Number.isInteger(action.amountKobo) || action.amountKobo <= 0 || action.amountKobo > 100000000) throw new Error("Enter a top-up amount between ₦1 and ₦1,000,000.");
        wallet.balanceKobo += action.amountKobo;
        wallet.updatedAt = new Date().toISOString();
        transactions.unshift({ id: `tx-${Date.now()}`, type: "CREDIT", amountKobo: action.amountKobo, currencyCode: "NGN", description: "Demo wallet top-up", createdAt: new Date().toISOString() });
      } else {
        if (!action.bankName.trim() || !action.accountName.trim() || !/^\d{10}$/.test(action.accountNumber)) throw new Error("Enter the bank, account name and a 10-digit account number.");
        technicianWorkspace.bankAccounts.unshift({ id: `bank-${Date.now()}`, bankName: action.bankName.trim(), accountName: action.accountName.trim(), maskedNumber: `**** ${action.accountNumber.slice(-4)}`, isDefault: technicianWorkspace.bankAccounts.length === 0 });
      }
      return { ...technicianWorkspace, application: { ...technicianWorkspace.application }, timeOff: [...technicianWorkspace.timeOff], payouts: [...technicianPayouts] };
    });
  }

  async getAdminWorkspace(): Promise<AdminWorkspace> {
    return this.wrap(() => this.simulateEmpty
      ? { ...adminWorkspace, users: [], flaggedMessages: [], disputes: [], auditLog: [] }
      : { ...adminWorkspace, users: [...adminWorkspace.users], flaggedMessages: [...adminWorkspace.flaggedMessages], disputes: [...adminWorkspace.disputes], auditLog: [...adminWorkspace.auditLog] });
  }

  async updateAdminWorkspace(action: AdminWorkspaceAction): Promise<AdminWorkspace> {
    return this.wrap(() => {
      const logAction = (name: string, reason: string) => {
        adminWorkspace.auditLog.unshift({ id: `audit-${Date.now()}`, action: name, actor: "Demo administrator", reason, createdAt: new Date().toISOString() });
      };
      switch (action.type) {
        case "set-user-status": {
          const user = adminWorkspace.users.find((item) => item.id === action.userId);
          if (!user) throw new Error("User not found. Refresh the table and try again.");
          if (!action.reason.trim()) throw new Error("Enter a reason to document this account change.");
          user.status = action.status;
          logAction(`${action.status.toLowerCase()} user ${user.displayName}`, action.reason);
          break;
        }
        case "review-technician": {
          if (action.applicationId !== technicianWorkspace.application.id) throw new Error("Application not found. Refresh the review queue.");
          if (!["APPROVED", "REJECTED", "CHANGES_REQUESTED", "SUSPENDED"].includes(action.status)) throw new Error("Choose a valid review decision.");
          if (!action.note.trim()) throw new Error("Add a review note before saving this decision.");
          technicianWorkspace.application.status = action.status;
          technicianWorkspace.application.reviewNote = action.note.trim();
          logAction(`${action.status.toLowerCase()} technician application`, action.note);
          if (action.status === "APPROVED") {
            const profile = technicians.find((item) => item.id === "tech-1");
            if (profile) {
              profile.publicName = technicianWorkspace.application.displayName;
              profile.bio = technicianWorkspace.application.bio;
              profile.approvalStatus = "APPROVED";
              profile.verified = true;
            }
          }
          break;
        }
        case "reveal-kyc": {
          if (action.applicationId !== technicianWorkspace.application.id) throw new Error("Application not found. Refresh the review queue.");
          if (!action.reason.trim()) throw new Error("Enter a reason before revealing identity information.");
          logAction("revealed masked KYC preview", action.reason);
          break;
        }
        case "resolve-flag": {
          const flag = adminWorkspace.flaggedMessages.find((item) => item.id === action.flagId);
          if (!flag) throw new Error("Flag not found. Refresh the moderation queue.");
          if (!action.reason.trim()) throw new Error("Add a moderation note before saving.");
          flag.status = action.status;
          logAction(`${action.status.toLowerCase()} flagged message`, action.reason);
          break;
        }
        case "resolve-dispute": {
          const dispute = adminWorkspace.disputes.find((item) => item.bookingId === action.bookingId);
          if (!dispute) throw new Error("Dispute not found. Refresh the queue.");
          if (!action.resolution.trim()) throw new Error("Add a resolution note before closing the dispute.");
          if (action.refundKobo < 0 || action.refundKobo > (bookings.find((item) => item.id === action.bookingId)?.priceKobo ?? 0)) throw new Error("Refund must be between zero and the booking amount.");
          dispute.status = "RESOLVED";
          dispute.resolution = action.resolution.trim();
          dispute.refundKobo = action.refundKobo;
          logAction("resolved booking dispute", action.resolution);
          break;
        }
        case "set-commission": {
          if (action.percent < 0 || action.percent > 30) throw new Error("Commission must be between 0 and 30 percent.");
          if (!action.reason.trim()) throw new Error("Add a reason for changing the commission rule.");
          adminWorkspace.commissionPercent = action.percent;
          logAction("updated commission rule", action.reason);
          break;
        }
        case "save-admin-settings":
          adminWorkspace.settings = { ...action.settings };
          logAction("updated platform settings", "Saved settings in the demo console.");
          break;
        case "toggle-catalog":
          adminWorkspace.catalogEnabled[action.itemId] = action.enabled;
          logAction(`${action.enabled ? "enabled" : "disabled"} catalog item`, action.itemId);
          break;
      }
      return { ...adminWorkspace, users: [...adminWorkspace.users], flaggedMessages: [...adminWorkspace.flaggedMessages], disputes: [...adminWorkspace.disputes], auditLog: [...adminWorkspace.auditLog] };
    });
  }

  async getAccountWorkspace(): Promise<AccountWorkspace | null> {
    return this.wrap(() => this.simulateEmpty ? null : { ...accountWorkspace, addresses: [...accountWorkspace.addresses] });
  }

  async updateAccountWorkspace(action: AccountWorkspaceAction): Promise<AccountWorkspace> {
    return this.wrap(() => {
      switch (action.type) {
        case "save-profile":
          if (!action.profile.displayName.trim() || !action.profile.email.trim()) throw new Error("Enter a name and email address before saving.");
          accountWorkspace.profile = { ...action.profile };
          break;
        case "add-address":
          if (!action.address.label.trim() || !action.address.areaName.trim() || !action.address.landmark.trim()) throw new Error("Complete the label, area and nearby landmark.");
          accountWorkspace.addresses.push({
            ...action.address,
            id: `address-${Date.now()}`,
            isDefault: accountWorkspace.addresses.length === 0,
          });
          break;
        case "remove-address":
          accountWorkspace.addresses = accountWorkspace.addresses.filter((item) => item.id !== action.addressId);
          if (accountWorkspace.addresses.length && !accountWorkspace.addresses.some((item) => item.isDefault)) accountWorkspace.addresses[0]!.isDefault = true;
          break;
        case "save-notifications":
          accountWorkspace.notificationPreferences = { ...action.preferences };
          break;
        case "save-settings":
          accountWorkspace.settings = { ...action.settings };
          break;
        case "save-onboarding":
          accountWorkspace.onboarding = {
            ...accountWorkspace.onboarding,
            ...(action.accountType ? { accountType: action.accountType } : {}),
            ...(action.step ? { step: action.step } : {}),
            ...(action.complete !== undefined ? { complete: action.complete } : {}),
          };
          break;
      }
      return { ...accountWorkspace, addresses: [...accountWorkspace.addresses] };
    });
  }
}

export const mockApiClient = new MockApiClient();
