import { ProductShell } from "@/components/product-shell";
import { TechnicianOnboardingWorkspace } from "@/components/technician-app-workspace";

export default function TechnicianOnboardingPage() {
  return <ProductShell audience="Technician"><div className="page-heading"><div><div className="eyebrow">TECHNICIAN SETUP · MINNA</div><h1>Get your profile ready</h1><p className="subtle">Complete your profile, service areas and identity check before applying.</p></div></div><TechnicianOnboardingWorkspace /></ProductShell>;
}
