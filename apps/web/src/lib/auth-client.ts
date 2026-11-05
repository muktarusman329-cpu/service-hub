import { isLiveApiMode } from "@servicehub/shared/api-mode";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api/v1";

export type AuthResponse = {
  user?: {
    roles?: string[];
    requiresAdminTotpEnrollment?: boolean;
  };
  requiresTotp?: boolean;
  challengeToken?: string;
  isNewUser?: boolean;
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
    const user: MockUser = {
      id: "mock-user",
      displayName: String(pending.displayName ?? "Demo account"),
      phone: destination,
      email: null,
      roles: ["USER"],
      googleLinked: false,
      phoneVerified: true,
      emailVerified: false,
      otpChannel: "AUTO",
      totpEnabled: false,
    };
    localStorage.setItem(mockUserKey, JSON.stringify(user));
    addKnownUser(destination);
    sessionStorage.removeItem(mockPendingKey);
    return { user, isNewUser };
  }
  if (path === "/auth/otp/complete-account") {
    const user = readMockUser();
    if (user) {
      localStorage.setItem(mockUserKey, JSON.stringify({ ...user, displayName: String(body.displayName ?? user.displayName) }));
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
      localStorage.setItem(mockUserKey, JSON.stringify(newUser));
    }
    return { user: readMockUser() ?? { id: "mock-user", roles: ["USER"] } };
  }
  if (path === "/auth/google") {
    const user: MockUser = { id: "mock-user", displayName: "Demo account", phone: null, email: null, roles: ["USER"], googleLinked: true, phoneVerified: false, emailVerified: true, otpChannel: "AUTO", totpEnabled: false };
    localStorage.setItem(mockUserKey, JSON.stringify(user));
    return { user };
  }
  if (path === "/auth/password/login") {
    const user = readMockUser() ?? { id: "mock-user", displayName: "Demo account", phone: null, email: String(body.email ?? ""), roles: ["USER"], googleLinked: false, phoneVerified: false, emailVerified: true, otpChannel: "AUTO", totpEnabled: false };
    localStorage.setItem(mockUserKey, JSON.stringify(user));
    return { user };
  }
  if (path === "/auth/totp/verify-login") return { user: readMockUser() ?? { id: "mock-user", roles: ["USER"] } };
  if (path === "/auth/me") return readMockUser() ?? { id: "mock-user", phone: null, email: null, roles: [], googleLinked: false, phoneVerified: false, emailVerified: false, otpChannel: "AUTO", totpEnabled: false };
  if (path === "/auth/sessions") return [];
  if (path === "/auth/logout" || path === "/auth/logout-everywhere") {
    localStorage.removeItem(mockUserKey);
    return { ok: true };
  }
  if (path === "/auth/totp/start") return { secret: "JBSWY3DPEHPK3PXP", uri: "otpauth://totp/ServiceHub:demo?secret=JBSWY3DPEHPK3PXP&issuer=ServiceHub" };
  if (path === "/auth/totp/confirm") {
    const user = readMockUser();
    if (user) localStorage.setItem(mockUserKey, JSON.stringify({ ...user, totpEnabled: true }));
    return { ok: true, recoveryCodes: ["DEMO-CODE-0001", "DEMO-CODE-0002"] };
  }
  if (path === "/auth/methods/google/link") {
    const user = readMockUser();
    if (user) localStorage.setItem(mockUserKey, JSON.stringify({ ...user, googleLinked: true }));
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
      localStorage.setItem(mockUserKey, JSON.stringify({
        ...user,
        ...(email ? { email: String(pending.destination), emailVerified: true } : { phone: String(pending.destination), phoneVerified: true }),
      }));
    }
    sessionStorage.removeItem("servicehub-mock-link");
    return { ok: true };
  }
  if (path.startsWith("/auth/sessions/") || path === "/auth/password" || path === "/auth/otp-preference" || path === "/auth/refresh") return { ok: true };
  throw new Error("This action is not available in mock mode.");
}

export async function authFetch<T = Record<string, unknown>>(path: string, init: RequestInit = {}): Promise<T> {
  if (!isLiveApiMode()) return mockAuthFetch(path, init) as T;
  const csrfResponse = await fetch(`${API}/auth/csrf`, { credentials: "include", cache: "no-store" });
  const csrf = await csrfResponse.json().catch(() => ({})) as { csrfToken?: string };
  const response = await fetch(`${API}${path}`, {
    ...init,
    credentials: "include",
    cache: "no-store",
    headers: {
      "content-type": "application/json",
      ...(csrf.csrfToken ? { "x-csrf-token": csrf.csrfToken } : {}),
      ...init.headers,
    },
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(typeof body.message === "string" ? body.message : "The request could not be completed.");
  return body as T;
}

export function requestOtp(input: { destination: string; purpose: string; accountType?: string; displayName?: string; acceptTerms?: boolean; acceptPrivacy?: boolean }) {
  return authFetch("/auth/otp/request", { method: "POST", body: JSON.stringify(input) });
}

export function verifyOtp(input: { destination: string; purpose: string; code: string }): Promise<AuthResponse> {
  return authFetch("/auth/otp/verify", { method: "POST", body: JSON.stringify(input) });
}

export function googleSignIn(input: { idToken: string; acceptTerms: boolean; acceptPrivacy: boolean }): Promise<AuthResponse> {
  return authFetch("/auth/google", { method: "POST", body: JSON.stringify(input) });
}

export function verifyTotpLogin(input: { challengeToken: string; code: string }): Promise<AuthResponse> {
  return authFetch("/auth/totp/verify-login", { method: "POST", body: JSON.stringify(input) });
}
