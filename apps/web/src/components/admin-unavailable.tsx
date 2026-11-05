import { FeatureUnavailable } from "@servicehub/ui/components";

export function AdminUnavailable({ feature }: { feature: string }) {
  return <FeatureUnavailable title={feature} description="This admin workflow is not backed by a live API yet. No mock records or browser-only changes are shown." />;
}
