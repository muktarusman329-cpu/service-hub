"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { authFetch } from "@/lib/auth-client";

export function SignOutButton() {
  const router = useRouter();
  const [error, setError] = useState("");
  async function signOut() {
    setError("");
    try { await authFetch("/auth/logout", { method: "POST", body: "{}" }); router.replace("/sign-in"); }
    catch (failure) { setError(failure instanceof Error ? failure.message : "Sign out failed."); }
  }
  return <><button className="language-button" type="button" onClick={() => void signOut()}>Sign out</button>{error && <span role="alert" className="form-error">{error}</span>}</>;
}
