import { mockApiClient } from "@servicehub/shared/mock-api-client";
import { TechnicianDirectory } from "@/components/technician-directory";
import { PublicPageShell } from "@/components/public-page-shell";

export default async function TechniciansPage() {
  const technicians = await mockApiClient.getTechnicians("minna");

  return (
    <PublicPageShell>
      <main><TechnicianDirectory technicians={technicians} /></main>
    </PublicPageShell>
  );
}
