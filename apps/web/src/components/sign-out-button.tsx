"use client";
import { useRouter } from "next/navigation";
import { authFetch } from "@/lib/auth-client";

export function SignOutButton() {
  const router = useRouter();
  async function signOut() {
    try { await authFetch("/auth/logout", { method: "POST", body: "{}" }); } finally { router.replace("/sign-in"); }
  }
  return <button className="language-button" type="button" onClick={signOut}>Sign out</button>;
}
