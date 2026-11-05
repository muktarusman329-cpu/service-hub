"use client";

import { FeatureUnavailable } from "@servicehub/ui/components";

export function AdminMockWorkspace({ kind }: { kind: string; id?: string }) {
  return <FeatureUnavailable title={kind.replaceAll("-", " ")} description="This administrative workflow is not connected to a live API. No mock records or browser-only changes are shown." />;
}
