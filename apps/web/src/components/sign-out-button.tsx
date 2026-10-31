"use client";
import { useRouter } from "next/navigation";

export function SignOutButton() {
  const router = useRouter();
  function signOut() {
    router.replace("/sign-in");
  }
  return <button className="language-button" type="button" onClick={signOut}>Sign out</button>;
}
