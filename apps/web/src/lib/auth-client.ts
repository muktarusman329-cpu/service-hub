import { isLiveApiMode } from "@servicehub/shared/api-mode";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api/v1";
let csrfTokenCache: string | undefined;
let refreshInFlight: Promise<boolean> | undefined;

async function refreshSession(): Promise<boolean> {
  if (!csrfTokenCache) {
    const csrfResponse = await fetch(`${API}/auth/csrf`, { credentials: "include", cache: "no-store" });
    const csrf = await csrfResponse.json().catch(() => ({})) as { csrfToken?: string };
    csrfTokenCache = csrf.csrfToken;
  }
  const response = await fetch(`${API}/auth/refresh`, {
    method: "POST", credentials: "include", cache: "no-store", headers: {
      "content-type": "application/json",
      ...(csrfTokenCache ? { "x-csrf-token": csrfTokenCache } : {}),
    }, body: "{}",
  });
  const body = await response.json().catch(() => ({})) as { csrfToken?: string };
  if (!response.ok) { csrfTokenCache = undefined; return false; }
  if (body.csrfToken) csrfTokenCache = body.csrfToken;
  return true;
}

export type AuthResponse = {
  user?: {
    roles?: string[];
    requiresAdminTotpEnrollment?: boolean;
  };
  requiresTotp?: boolean;
  challengeToken?: string;
  isNewUser?: boolean;
  verificationSkipped?: boolean;
};

type MockUser = {
  id: string;
  displayName: string;
  phone: string | null;
  email: string | null;
  roles: string[];
  googleLinked: boolean;
  phoneVerified: boolean;
  emailVerified: boolean;
  otpChannel: string;
  totpEnabled: boolean;
  requiresAdminTotpEnrollment?: boolean;
  profileSetupCompleted?: boolean;
};

const mockUserKey = "servicehub-mock-user";
const mockPendingKey = "servicehub-mock-auth";
const mockKnownUsersKey = "servicehub-mock-users";
const demoCode = "123456";

function readKnownUsers(): string[] {
  const raw = localStorage.getItem(mockKnownUsersKey);
  if (!raw) return [];
  try { return JSON.parse(raw) as string[]; }
  catch { return []; }
}

function addKnownUser(destination: string) {
  const users = readKnownUsers();
  if (!users.includes(destination)) {
    users.push(destination);
    localStorage.setItem(mockKnownUsersKey, JSON.stringify(users));
  }
}

function isKnownUser(destination: string): boolean {
  return readKnownUsers().includes(destination);
}

function readMockUser(): MockUser | null {
  const raw = localStorage.getItem(mockUserKey);
  if (!raw) return null;
  try { return JSON.parse(raw) as MockUser; }
  catch { localStorage.removeItem(mockUserKey); return null; }
}

function saveMockUser(user: MockUser) {
  localStorage.setItem(mockUserKey, JSON.stringify(user));
  const routeState = encodeURIComponent(JSON.stringify({ roles: user.roles, totpEnabled: user.totpEnabled, profileSetupCompleted: user.profileSetupCompleted !== false }));
  document.cookie = `servicehub-mock-session=${routeState}; Path=/; SameSite=Strict`;
}

function clearMockSession() {
  document.cookie = "servicehub-mock-session=; Path=/; Max-Age=0; SameSite=Strict";
  document.cookie = "servicehub-mock-session=; Path=/; Max-Age=0; SameSite=Strict; Secure";
}

function mockAuthFetch(path: string, init: RequestInit) {
  const body = typeof init.body === "string" ? JSON.parse(init.body) as Record<string, unknown> : {};
  if (path === "/auth/otp/request") {
    sessionStorage.setItem(mockPendingKey, JSON.stringify(body));
    return { ok: true, message: `Demo code: ${demoCode}`, isNewUser: !isKnownUser(String(body.destination ?? "")) };
  }
  if (path === "/auth/otp/verify") {
    if (body.code !== demoCode) throw new Error(`That demo code is incorrect. Use ${demoCode}.`);
    const pending = JSON.parse(sessionStorage.getItem(mockPendingKey) ?? "{}") as Record<string, unknown>;
    const destination = String(pending.destination ?? body.destination ?? "");
    const isNewUser = !isKnownUser(destination);
    const isAdmin = destination.includes("admin") || destination === "+2348000000000" || destination === "admin@servicehub.com";
    const isTechnician = destination === "+2348000000001";
    const user: MockUser = {
      id: isAdmin ? "mock-admin" : "mock-user",
      displayName: isAdmin ? "Admin User" : isTechnician ? "Demo Technician" : String(pending.displayName ?? "Demo account"),
      phone: destination.includes("@") ? null : destination,
      email: destination.includes("@") ? destination : null,
      roles: isAdmin ? ["SUPER_ADMIN"] : isTechnician ? ["TECHNICIAN"] : ["USER"],
      googleLinked: false,
      phoneVerified: true,
      emailVerified: destination.includes("@"),
      otpChannel: "AUTO",
      totpEnabled: false,
      requiresAdminTotpEnrollment: isAdmin,
      profileSetupCompleted: !isNewUser,
    };
    saveMockUser(user);
    addKnownUser(destination);
    sessionStorage.removeItem(mockPendingKey);
    return { user, isNewUser };
  }
  if (path === "/auth/otp/complete-account") {
    const user = readMockUser();
    if (user) {
      saveMockUser({ ...user, displayName: String(body.displayName ?? user.displayName) });
    } else {
      const newUser: MockUser = {
        id: "mock-user",
        displayName: String(body.displayName ?? "New user"),
        phone: null,
        email: null,
        roles: ["USER"],
        googleLinked: false,
        phoneVerified: true,
        emailVerified: false,
        otpChannel: "AUTO",
        totpEnabled: false,
      };
      saveMockUser(newUser);
    }
    return { user: readMockUser() ?? { id: "mock-user", roles: ["USER"] } };
  }
  if (path === "/auth/google") {
    const isNewUser = body.flow === "SIGN_UP";
    const user: MockUser = { id: "mock-user", displayName: "Demo account", phone: null, email: null, roles: ["USER"], googleLinked: true, phoneVerified: false, emailVerified: true, otpChannel: "AUTO", totpEnabled: false, profileSetupCompleted: !isNewUser };
    saveMockUser(user);
    return { user, isNewUser };
  }
  if (path === "/auth/profile-preferences") { const user = readMockUser(); if (user) saveMockUser({ ...user, profileSetupCompleted: true }); return { ok: true, technicianInterest: Array.isArray(body.intents) && body.intents.includes("TECHNICIAN") }; }
  if (path === "/catalog/minna/categories") return [{ name: "Home services", services: [{ id: "service-plumber", name: "Plumber" }, { id: "service-electrician", name: "Electrician" }, { id: "service-ac-repair", name: "AC and fridge repair" }] }, { name: "IT support", services: [{ id: "service-phone-repair", name: "Phone repair" }, { id: "service-laptop-repair", name: "Laptop repair" }] }];
  if (path === "/auth/password/login") {
    const identifier = String(body.identifier ?? "");
    const isAdmin = identifier.trim().toLowerCase() === "admin@servicehub.com";
    const user = readMockUser() ?? (isAdmin
      ? { id: "mock-admin", displayName: "Demo Super Admin", phone: null, email: identifier.trim().toLowerCase(), roles: ["SUPER_ADMIN"], googleLinked: false, phoneVerified: false, emailVerified: true, otpChannel: "AUTO", totpEnabled: true, profileSetupCompleted: true }
      : { id: "mock-user", displayName: "Demo account", phone: identifier.includes("@") ? null : identifier, email: identifier.includes("@") ? identifier : null, roles: ["USER"], googleLinked: false, phoneVerified: false, emailVerified: false, otpChannel: "AUTO", totpEnabled: false, profileSetupCompleted: true });
    saveMockUser(user);
    return { user };
  }
  if (path === "/auth/password/register") {
    const identifier = String(body.identifier ?? "");
    const user: MockUser = { id: "mock-user", displayName: String(body.displayName ?? "New user"), phone: identifier.includes("@") ? null : identifier, email: identifier.includes("@") ? identifier : null, roles: ["USER"], googleLinked: false, phoneVerified: false, emailVerified: false, otpChannel: "AUTO", totpEnabled: false, profileSetupCompleted: false };
    saveMockUser(user);
    return { ok: true, isNewUser: true, verificationSkipped: true, user };
  }
  if (path === "/auth/totp/verify-login") return { user: readMockUser() ?? { id: "mock-user", roles: ["USER"] } };
  if (path === "/auth/me") {
    const user = readMockUser();
    if (!user) {
      const error = new Error("Not authenticated");
      (error as { status?: number }).status = 401;
      throw error;
    }
    return user;
  }
  if (path === "/auth/sessions") {
    const user = readMockUser();
    if (!user) {
      const error = new Error("Not authenticated");
      (error as { status?: number }).status = 401;
      throw error;
    }
    return [{ id: "mock-session", deviceLabel: "Demo Device", userAgent: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36", lastSeenAt: new Date().toISOString(), createdAt: new Date().toISOString() }];
  }
  if (path === "/auth/logout" || path === "/auth/logout-everywhere") {
    localStorage.removeItem(mockUserKey);
    clearMockSession();
    return { ok: true };
  }
  if (path === "/auth/totp/start") return { secret: "JBSWY3DPEHPK3PXP", uri: "otpauth://totp/ServiceHub:demo?secret=JBSWY3DPEHPK3PXP&issuer=ServiceHub" };
  if (path === "/auth/totp/confirm") {
    const user = readMockUser();
    if (user) saveMockUser({ ...user, totpEnabled: true });
    return { ok: true, recoveryCodes: ["DEMO-CODE-0001", "DEMO-CODE-0002"] };
  }
  if (path === "/auth/methods/google/link") {
    const user = readMockUser();
    if (user) saveMockUser({ ...user, googleLinked: true });
    return { ok: true };
  }
  if (path === "/auth/methods/link/request") {
    sessionStorage.setItem("servicehub-mock-link", JSON.stringify(body));
    return { ok: true, message: `Demo code: ${demoCode}` };
  }
  if (path === "/auth/methods/link/verify") {
    if (body.code !== demoCode) throw new Error(`That demo code is incorrect. Use ${demoCode}.`);
    const user = readMockUser();
    const pending = JSON.parse(sessionStorage.getItem("servicehub-mock-link") ?? "{}") as Record<string, unknown>;
    if (user) {
      const email = String(pending.destination ?? "").includes("@");
      saveMockUser({
        ...user,
        ...(email ? { email: String(pending.destination), emailVerified: true } : { phone: String(pending.destination), phoneVerified: true }),
      });
    }
    sessionStorage.removeItem("servicehub-mock-link");
    return { ok: true };
  }
  if (path.startsWith("/auth/sessions/") || path === "/auth/password" || path === "/auth/otp-preference" || path === "/auth/refresh") return { ok: true };
  throw new Error("This action is not available in mock mode.");
}

export async function authFetch<T = Record<string, unknown>>(path: string, init: RequestInit = {}): Promise<T> {
  if (!isLiveApiMode()) return mockAuthFetch(path, init) as T;
  if (!csrfTokenCache) {
    const csrfResponse = await fetch(`${API}/auth/csrf`, { credentials: "include", cache: "no-store" });
    const csrf = await csrfResponse.json().catch(() => ({})) as { csrfToken?: string };
    csrfTokenCache = csrf.csrfToken;
  }
  const makeRequest = () => fetch(`${API}${path}`, {
    ...init,
    credentials: "include",
    cache: "no-store",
    headers: {
      "content-type": "application/json",
      ...(csrfTokenCache ? { "x-csrf-token": csrfTokenCache } : {}),
      ...init.headers,
    },
  });
  let response = await makeRequest();
  if (response.status === 401 && !path.startsWith("/auth/")) {
    refreshInFlight ??= refreshSession().finally(() => { refreshInFlight = undefined; });
    if (await refreshInFlight) response = await makeRequest();
  }
  const body = await response.json().catch(() => ({}));
  if (typeof body.csrfToken === "string") csrfTokenCache = body.csrfToken;
  if (response.status === 403 && typeof body.message === "string" && body.message.toLowerCase().includes("verified")) csrfTokenCache = undefined;
  if (!response.ok) throw new Error(typeof body.message === "string" ? body.message : "The request could not be completed.");
  return body as T;
}

export function requestOtp(input: { destination: string; purpose: string; displayName?: string; acceptTerms?: boolean; acceptPrivacy?: boolean }) {
  return authFetch("/auth/otp/request", { method: "POST", body: JSON.stringify(input) });
}

export function passwordLogin(input: { identifier: string; password: string }): Promise<AuthResponse> {
  return authFetch("/auth/password/login", { method: "POST", body: JSON.stringify(input) });
}

export function passwordRegister(input: { identifier: string; displayName: string; password: string; acceptTerms: boolean; acceptPrivacy: boolean }): Promise<AuthResponse> {
  return authFetch("/auth/password/register", { method: "POST", body: JSON.stringify(input) });
}

export function verifyOtp(input: { destination: string; purpose: string; code: string }): Promise<AuthResponse> {
  return authFetch("/auth/otp/verify", { method: "POST", body: JSON.stringify(input) });
}

export function googleSignIn(input: { idToken: string; acceptTerms: boolean; acceptPrivacy: boolean; flow?: "SIGN_IN" | "SIGN_UP" }): Promise<AuthResponse> {
  return authFetch("/auth/google", { method: "POST", body: JSON.stringify(input) });
}

export function verifyTotpLogin(input: { challengeToken: string; code: string }): Promise<AuthResponse> {
  return authFetch("/auth/totp/verify-login", { method: "POST", body: JSON.stringify(input) });
}
