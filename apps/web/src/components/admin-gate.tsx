"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { authFetch } from "@/lib/auth-client";
import { Skeleton } from "@servicehub/ui/components";

type User = { id: string; roles: string[]; requiresAdminTotpEnrollment?: boolean };

export function AdminGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    async function checkAuth() {
      try {
        const me = await authFetch<User>("/auth/me");
        if (!me || !me.roles) {
          router.push("/sign-in");
          return;
        }
        const isAdmin = me.roles.includes("SUPER_ADMIN") || me.roles.includes("ADMIN");
        if (!isAdmin) {
          router.push("/app");
          return;
        }
        if (me.requiresAdminTotpEnrollment) {
          router.push("/admin/security");
          return;
        }
        setReady(true);
      } catch (e) {
        const status = (e as { status?: number }).status;
        if (status === 401) {
          router.push("/sign-in");
          return;
        }
        setError(e instanceof Error ? e.message : "Sign in to access admin tools.");
        router.push("/sign-in");
      }
    }
    void checkAuth();
  }, [router]);

  if (!ready) {
    return (
      <main className="content">
        {error ? (
          <div className="card">
            <p className="error-text" role="alert">{error}</p>
            <button className="button button-primary" onClick={() => router.push("/sign-in")}>
              Sign in
            </button>
          </div>
        ) : (
          <>
            <Skeleton className="skeleton-46" />
            <div className="stack" style={{ marginTop: 16 }}>
              <Skeleton className="skeleton-88" />
              <Skeleton className="skeleton-72" />
            </div>
          </>
        )}
      </main>
    );
  }

  return children;
}
