import type { ApiClient, TechnicianPublic, MarketListing, MarketListingCategory, JobRequest, Quote, Booking, Conversation, MessagePage, Category, Service } from "./api-client";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api/v1";
type RequestOptions = { method?: string; body?: unknown };

async function api<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const method = options.method ?? "GET";
  const headers: Record<string, string> = { "content-type": "application/json" };
  if (method !== "GET") {
    const csrfResponse = await fetch(`${API}/auth/csrf`, { credentials: "include", cache: "no-store" });
    const csrf = await csrfResponse.json().catch(() => ({})) as { csrfToken?: string };
    if (csrf.csrfToken) headers["x-csrf-token"] = csrf.csrfToken;
  }
  const response = await fetch(`${API}${path}`, { method, credentials: "include", cache: "no-store", headers, ...(options.body === undefined ? {} : { body: JSON.stringify(options.body) }) });
  const payload = await response.json().catch(() => null);
  if (!response.ok) throw new Error(payload && typeof payload.message === "string" ? payload.message : `API request failed (${response.status})`);
  return payload as T;
}

const unsupported = <T extends (...args: never[]) => unknown>(name: string) => ((..._args: never[]) => Promise.reject(new Error(`${name} is unavailable because its live API is not implemented.`))) as T;
const listingsPath = (filters?: { category?: MarketListingCategory; query?: string }) => {
  const params = new URLSearchParams({ city: "minna" });
  if (filters?.category) params.set("category", filters.category);
  if (filters?.query) params.set("q", filters.query);
  return `/marketplace/listings?${params.toString()}`;
};

export const liveApiClient: ApiClient = {
  async getMarketplaceListings(filters) { return (await api<{ items: MarketListing[] }>(listingsPath(filters))).items; },
  async getMarketplaceListing(id) { try { return await api<MarketListing>(`/marketplace/listings/${encodeURIComponent(id)}`); } catch (error) { if (error instanceof Error && error.message.toLowerCase().includes("not found")) return null; throw error; } },
  getMyMarketplaceListings: () => api<MarketListing[]>("/marketplace/mine/listings"),
  createMarketplaceListing: (data) => api("/marketplace/mine/listings", { method: "POST", body: data }),
  reviewMarketplaceListing: (id, status) => api(`/admin/marketplace/listings/${encodeURIComponent(id)}/review`, { method: "PATCH", body: { status } }),
  markMarketplaceListingSold: (id) => api(`/marketplace/mine/listings/${encodeURIComponent(id)}/sold`, { method: "PATCH", body: {} }),
  updateMarketplaceListing: unsupported("Marketplace listing editing"),
  getMarketplaceSellerProfile: unsupported("Marketplace seller profiles"),
  getMarketplaceOrders: unsupported("Marketplace orders"),
  createMarketplaceOrder: unsupported("Marketplace orders"),
  updateMarketplaceOrder: unsupported("Marketplace orders"),
  getSavedMarketplaceListings: unsupported("Saved marketplace listings"),
  toggleSavedMarketplaceListing: unsupported("Saved marketplace listings"),

  getJobRequests: () => api<JobRequest[]>("/jobs/requests/mine"),
  getJobRequest: (id) => api<JobRequest>(`/jobs/requests/${encodeURIComponent(id)}`),
  createJobRequest: (data) => api("/jobs/requests", { method: "POST", body: data }),
  updateJobRequest: (id, data) => api(`/jobs/requests/${encodeURIComponent(id)}`, { method: "PATCH", body: data }),
  cancelJobRequest: async (id, data) => { await api(`/jobs/requests/${encodeURIComponent(id)}/cancel`, { method: "POST", body: data }); },
  getQuotes: (requestId) => api<Quote[]>(`/jobs/requests/${encodeURIComponent(requestId)}/quotes`),
  createQuote: (requestId, data) => api(`/jobs/requests/${encodeURIComponent(requestId)}/quotes`, { method: "POST", body: data }),
  updateQuote: unsupported("Editing quotes"),
  withdrawQuote: unsupported("Withdrawing quotes"),
  acceptQuote: (id, data) => api(`/jobs/quotes/${encodeURIComponent(id)}/accept`, { method: "POST", body: data }),

  async getBookings() { const ids = await api<Array<{ id: string }>>("/jobs/bookings/mine"); return Promise.all(ids.map((row) => api<Booking>(`/jobs/bookings/${encodeURIComponent(row.id)}`))); },
  getBooking: (id) => api<Booking>(`/jobs/bookings/${encodeURIComponent(id)}`),
  changeBookingStatus: (id, data) => api(`/jobs/bookings/${encodeURIComponent(id)}/status`, { method: "PATCH", body: data }),
  cancelBooking: async (id, data) => { await api(`/jobs/bookings/${encodeURIComponent(id)}/cancel`, { method: "POST", body: data }); },
  revealContact: (id) => api(`/jobs/bookings/${encodeURIComponent(id)}/contact`),
  getConversations: () => api<Conversation[]>("/jobs/conversations"),
  getMessages: (id, before) => api<MessagePage>(`/jobs/conversations/${encodeURIComponent(id)}/messages${before ? `?before=${encodeURIComponent(before)}` : ""}`),
  sendMessage: (id, data) => api(`/jobs/conversations/${encodeURIComponent(id)}/messages`, { method: "POST", body: data }),

  async getTechnicians(city, filters) {
    const params = new URLSearchParams();
    if (filters?.serviceId) params.set("serviceId", filters.serviceId);
    if (filters?.areaId) params.set("areaId", filters.areaId);
    params.set("limit", "50");
    return api<TechnicianPublic[]>(`/technicians/${encodeURIComponent(city)}?${params}`);
  },
  async getTechnicianProfile(id) { const rows = await api<TechnicianPublic[]>("/technicians/minna?limit=50"); const found = rows.find((row) => row.id === id); if (!found) throw new Error("Technician not found"); return found; },
  async getCategories(city) { return (await api<{ items: Category[] }>(`/catalog/${encodeURIComponent(city)}/categories`)).items; },
  async getServices(city) { return (await this.getCategories(city)).flatMap((category) => category.services); },

  getWallet: unsupported("Wallet"), getTransactions: unsupported("Wallet transactions"), requestPayout: unsupported("Payouts"),
  getPayments: unsupported("Payments"), createPayment: unsupported("Payment processing"), getReviews: unsupported("Reviews"), createReview: unsupported("Reviews"),
  getNotifications: unsupported("Notification inbox"), markNotificationRead: unsupported("Notification inbox"), disputeBooking: unsupported("Booking disputes"),
  getTechnicianWorkspace: () => api("/technician/onboarding"),
  async updateTechnicianWorkspace(action) { if (action.type === "save-application") return api("/technician/onboarding", { method: "PATCH", body: action.patch }); if (action.type === "submit-application") return api("/technician/onboarding/submit", { method: "POST", body: {} }); throw new Error("This technician action is unavailable from the live API."); },
  getAdminWorkspace: unsupported("Admin workspace summary"), updateAdminWorkspace: unsupported("Admin workspace changes"),
  getAccountWorkspace: unsupported("Account workspace"), updateAccountWorkspace: unsupported("Account workspace changes"),
};

export async function liveFetch<T>(path: string, options: RequestOptions = {}) { return api<T>(path, options); }
