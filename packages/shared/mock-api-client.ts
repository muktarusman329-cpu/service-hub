import type { ApiClient, JobRequest, Quote, Booking, Conversation, Message, MessagePage, TechnicianPublic, Category, Service, Wallet, Transaction, Payout, CreateJobRequestDto, CreateQuoteDto, AcceptQuoteDto, CancelDto, StatusDto, CreateMessageDto, TechnicianFilters, PayoutDto, ContactInfo } from "./api-client";
import { categories } from "./fixtures/categories";

// In-memory state for mock interactions
let jobRequests: JobRequest[] = [];
let quotes: Quote[] = [];
let bookings: Booking[] = [];
let conversations: Conversation[] = [];
let messages: Map<string, Message[]> = new Map();
let technicians: TechnicianPublic[] = [];
let wallet: Wallet = {
  id: "wallet-1",
  balanceKobo: 50000000, // 500,000 NGN
  currencyCode: "NGN",
  updatedAt: new Date().toISOString(),
};
let transactions: Transaction[] = [];

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

  setSimulations({ error, loading, empty }: { error?: boolean; loading?: boolean; empty?: boolean }) {
    this.simulateError = error ?? false;
    this.simulateLoading = loading ?? false;
    this.simulateEmpty = empty ?? false;
  }

  private async wrap<T>(fn: () => T): Promise<T> {
    if (this.simulateLoading) await delay(2000);
    if (this.simulateError) throw new Error("Simulated API error");
    return fn();
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
      const req: JobRequest = {
        id: `req-${Date.now()}`,
        status: "OPEN",
        service: { id: data.serviceId, name: "Plumber", slug: "plumber" },
        area: { id: data.areaId, name: "Bosso" },
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
      };
      jobRequests.unshift(req);
      return req;
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
        service: { name: "Plumber" },
        area: { name: "Bosso" },
        nearestLandmark: "Near market",
        technician: { displayName: "Ibrahim Mohammed", verified: true },
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
        request: req ? { id: req.id, status: req.status, service: req.service, area: req.area } : { id: quote.jobRequestId, status: "ACCEPTED", service: { name: "Plumber" }, area: { name: "Bosso" } },
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
      booking.status = data.status;
      if (data.status === "COMPLETED_PENDING_CONFIRMATION") {
        booking.completedByTechnicianAt = new Date().toISOString();
      }
      if (data.status === "COMPLETED") {
        booking.confirmedCompletedAt = new Date().toISOString();
      }
      booking.history.push({
        fromStatus: booking.status,
        toStatus: data.status,
        actorRole: "TECHNICIAN",
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
      const payout: Payout = {
        id: `payout-${Date.now()}`,
        amountKobo: data.amountKobo,
        currencyCode: "NGN",
        status: "PENDING",
        createdAt: new Date().toISOString(),
        processedAt: null,
      };
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
}

export const mockApiClient = new MockApiClient();
