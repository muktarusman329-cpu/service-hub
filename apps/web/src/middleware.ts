import { NextRequest, NextResponse } from "next/server";

const api = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api/v1";
const protectedRoots = ["/app", "/technician", "/admin", "/account", "/welcome"];
const authPages = ["/sign-in", "/sign-up"];
type User = { roles?: string[]; totpEnabled?: boolean; profileSetupCompleted?: boolean };
function home(user: User) {
  if (user.roles?.some(role => role === "ADMIN" || role === "SUPER_ADMIN")) return !user.totpEnabled ? "/admin/security" : "/admin";
  return user.roles?.includes("TECHNICIAN") ? "/technician" : "/app";
}
function cookies(req: NextRequest) { return req.headers.get("cookie") || ""; }
async function me(req: NextRequest) {
  let cookie = cookies(req);
  const headers = () => ({ cookie });
  let response = await fetch(`${api}/auth/me`, { headers: headers(), cache: "no-store" });
  let setCookies: string[] = [];
  if (!response.ok && req.cookies.has("refresh_token")) {
    const csrf = req.cookies.get("csrf_token")?.value;
    response = await fetch(`${api}/auth/refresh`, { method: "POST", headers: { ...headers(), "content-type": "application/json", ...(csrf ? { "x-csrf-token": csrf } : {}) }, body: "{}", cache: "no-store" });
    const setCookie = response.headers.get("set-cookie") || "";
    setCookies = [...setCookie.matchAll(/(?:^|,\s*)(access_token|refresh_token|csrf_token)=([^;,]+)/g)].map(match => `${match[1]}=${match[2]}`);
    for (const part of setCookies) {
      const [name, value] = part.split("=", 2);
      cookie = cookie.replace(new RegExp(`(?:^|;\\s*)${name}=[^;]*`), "").replace(/^;\s*/, "");
      cookie = `${cookie}${cookie ? "; " : ""}${name}=${value}`;
    }
    if (response.ok) response = await fetch(`${api}/auth/me`, { headers: headers(), cache: "no-store" });
  }
  if (!response.ok) return { user: null as User | null, setCookies };
  return { user: await response.json() as User, setCookies };
}
export async function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname;
  const protectedPath = protectedRoots.some(root => path === root || path.startsWith(`${root}/`));
  if (!protectedPath && !authPages.includes(path)) return NextResponse.next();
  if (process.env.NEXT_PUBLIC_API_MODE !== "live") {
    const raw = req.cookies.get("servicehub-mock-session")?.value;
    let user: User | null = null;
    try { if (raw) user = JSON.parse(decodeURIComponent(raw)) as User; } catch { user = null; }
    if (protectedPath && !user) {
      const url = new URL("/sign-in", req.url); url.searchParams.set("next", path);
      return NextResponse.redirect(url);
    }
    if (user && authPages.includes(path)) return NextResponse.redirect(new URL(user.profileSetupCompleted === false ? "/welcome" : home(user), req.url));
    if (user && path !== "/welcome" && user.profileSetupCompleted === false) return NextResponse.redirect(new URL("/welcome", req.url));
    if (user && path === "/welcome" && user.profileSetupCompleted !== false) return NextResponse.redirect(new URL(home(user), req.url));
    if (user && path.startsWith("/admin") && !user.roles?.some(role => role === "ADMIN" || role === "SUPER_ADMIN")) return NextResponse.redirect(new URL("/app", req.url));
    if (user && path.startsWith("/technician") && !path.startsWith("/technician/onboarding") && !user.roles?.includes("TECHNICIAN")) return NextResponse.redirect(new URL("/app", req.url));
    return NextResponse.next();
  }
  const { user, setCookies } = await me(req);
  if (protectedPath && !user) {
    const url = new URL("/sign-in", req.url); url.searchParams.set("next", path);
    return NextResponse.redirect(url);
  }
  if (user && authPages.includes(path)) return NextResponse.redirect(new URL(user.profileSetupCompleted === false ? "/welcome" : home(user), req.url));
  if (user && path !== "/welcome" && user.profileSetupCompleted === false) return NextResponse.redirect(new URL("/welcome", req.url));
  if (user && path === "/welcome" && user.profileSetupCompleted !== false) return NextResponse.redirect(new URL(home(user), req.url));
  if (user && path.startsWith("/admin") && !user.roles?.some(role => role === "ADMIN" || role === "SUPER_ADMIN")) return NextResponse.redirect(new URL("/app", req.url));
  if (user && path.startsWith("/technician") && !path.startsWith("/technician/onboarding") && !user.roles?.includes("TECHNICIAN")) return NextResponse.redirect(new URL("/app", req.url));
  const response = NextResponse.next();
  for (const cookie of setCookies) {
    const name = cookie.split("=", 1)[0]!;
    response.cookies.set(name, cookie.slice(cookie.indexOf("=") + 1), {
      path: name === "refresh_token" ? "/api/v1/auth" : "/",
      maxAge: name === "refresh_token" ? Number(process.env.AUTH_REFRESH_DAYS || 30) * 86400 : name === "access_token" ? Number(process.env.AUTH_ACCESS_TTL_SECONDS || 600) : undefined,
      httpOnly: name !== "csrf_token", sameSite: "strict", secure: process.env.NODE_ENV === "production"
    });
  }
  return response;
}
export const config = { matcher: ["/sign-in", "/sign-up", "/welcome", "/app/:path*", "/technician/:path*", "/admin/:path*", "/account/:path*"] };
