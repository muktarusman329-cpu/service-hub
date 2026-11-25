import { notFound } from "next/navigation";
import { liveApiClient } from "@servicehub/shared/live-api-client";
import { TechnicianDirectory } from "@/components/technician-directory";
import { PublicPageShell } from "@/components/public-page-shell";

export default async function TechniciansPage() {
  let technicians;
  try { technicians = await liveApiClient.getTechnicians("minna"); }
  catch { notFound(); }
  return <PublicPageShell><main><TechnicianDirectory technicians={technicians} /></main></PublicPageShell>;
}
