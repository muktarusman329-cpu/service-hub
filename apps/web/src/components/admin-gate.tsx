"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Skeleton } from "@servicehub/ui/components";
import { authFetch } from "@/lib/auth-client";

export function AdminGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let active = true;
    void authFetch("/auth/me").then((user) => {
      if (!active) return;
      if (!user.roles?.includes("ADMIN") && !user.roles?.includes("SUPER_ADMIN")) {
        router.replace(user.roles?.includes("TECHNICIAN") ? "/technician" : "/app"); return;
      }
      if (!user.totpEnabled) { router.replace("/admin/security"); return; }
      setReady(true);
    }).catch(() => router.replace("/sign-in"));
    return () => { active = false; };
  }, [router]);
  if (!ready) return <main className="content"><Skeleton className="skeleton-46" /><div className="stack" style={{ marginTop: 16 }}><Skeleton className="skeleton-88" /><Skeleton className="skeleton-72" /></div></main>;
  return children;
}
