"use client";

import { useEffect, useState } from "react";
import { Skeleton } from "@servicehub/ui/components";

export function AdminGate({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  useEffect(() => setReady(true), []);
  if (!ready) return <main className="content"><Skeleton className="skeleton-46" /><div className="stack" style={{ marginTop: 16 }}><Skeleton className="skeleton-88" /><Skeleton className="skeleton-72" /></div></main>;
  return children;
}
