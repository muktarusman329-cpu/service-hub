const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api/v1";

export async function authFetch(path: string, init: RequestInit = {}) {
  const csrf = await fetch(`${API}/auth/csrf`, { credentials: "include", cache: "no-store" }).then((r) => r.json()).catch(() => ({}));
  const response = await fetch(`${API}${path}`, {
    ...init,
    credentials: "include",
    headers: { "content-type": "application/json", ...(csrf.csrfToken ? { "x-csrf-token": csrf.csrfToken } : {}), ...init.headers }
  });
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(typeof body.message === "string" ? body.message : "We could not complete that request. Try again.");
  return body;
}
