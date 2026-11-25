import Link from "next/link";
import { messages } from "@servicehub/shared/messages/en";
import { BrandLogo } from "@/components/brand-logo";

export default function BecomeTechnicianPage() {
  return (
    <main className="auth-page">
      <section className="auth-card">
        <BrandLogo className="auth-brand" />
        <p className="eyebrow">Join ServiceHub</p>
        <h1>{messages.auth.becomeTechnicianTitle}</h1>
        <p className="subtle">{messages.auth.becomeTechnicianSubtitle}</p>
        <div className="stack" style={{ marginTop: "24px" }}>
          <div className="stack">
            <h2>How it works</h2>
            <ol style={{ paddingLeft: "20px", color: "var(--text-secondary)" }}>
              <li>Complete your profile, skills, and service areas</li>
              <li>Upload your ID for verification</li>
              <li>Wait for admin approval</li>
              <li>Start accepting job requests from customers</li>
            </ol>
          </div>
          <div className="stack" style={{ marginTop: "20px" }}>
            <p className="subtle">Ready to get started? Sign in with your phone number to begin the technician onboarding process.</p>
            <Link href="/sign-in?become-technician=true" className="button button-primary auth-submit">
              {messages.auth.becomeTechnicianAction}
            </Link>
          </div>
          <p className="auth-switch">
            Already a technician? <Link className="link-button inline" href="/sign-in">{messages.auth.signIn}</Link>
          </p>
        </div>
      </section>
    </main>
  );
}
