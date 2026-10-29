import Link from "next/link";
import { PublicPageShell } from "@/components/public-page-shell";

const helpTopics = [
  {
    title: "Finding and booking a service",
    questions: [
      ["How do I request a service?", "Choose a service, describe the work and your area, then review the available responses. You can also browse professional profiles before starting a request."],
      ["Can I choose a specific technician?", "You can browse technician profiles and start a service request from a profile. Include the work details so the professional can understand what you need."],
      ["How do I know if a technician is verified?", "Look for the verified label on a technician's directory card or profile."],
    ],
  },
  {
    title: "Payments and service issues",
    questions: [
      ["When do I agree on the price?", "Discuss the scope and price with the technician before work begins. Review the details shown in your booking before confirming."],
      ["What if I have a problem with a service?", "Contact support with your booking details so the team can review what happened and advise on next steps."],
      ["How do I cancel a booking?", "Open your booking from your account and use the cancellation option if one is available. The booking will show any relevant cancellation details."],
    ],
  },
  {
    title: "Your account",
    questions: [
      ["How can I update my account details?", "Sign in and open your account profile or settings to review the available options."],
      ["How do I join as a technician?", "Start technician onboarding and provide the requested profile, skills and identity information for review."],
      ["How do I ask for more help?", "Use the contact page to find the support options available for this preview."],
    ],
  },
];

export default function HelpPage() {
  return (
    <PublicPageShell>
      <main className="public-container public-content public-help-content">
        <div className="public-help-intro">
          <span className="landing-kicker">SERVICEHUB SUPPORT</span>
          <h1>How can we help?</h1>
          <p>Find answers about requesting a service, working with a professional, and managing your account.</p>
          <Link href="/contact" className="button button-primary">Contact support</Link>
        </div>
        <div className="public-help-layout">
          <nav className="public-help-nav" aria-label="Help topics">
            {helpTopics.map((topic, index) => <a key={topic.title} href={`#help-topic-${index + 1}`}>{topic.title}</a>)}
          </nav>
          <div className="public-help-topics">
            {helpTopics.map((topic, index) => (
              <section key={topic.title} id={`help-topic-${index + 1}`} className="public-help-topic">
                <h2>{topic.title}</h2>
                {topic.questions.map(([question, answer]) => (
                  <details key={question}>
                    <summary>{question}</summary>
                    <p>{answer}</p>
                  </details>
                ))}
              </section>
            ))}
          </div>
        </div>
        <aside className="public-callout">
          <div><span className="landing-kicker">READY TO GET STARTED?</span><h2>Find local help for your next job.</h2><p>Browse services and professionals available in Minna.</p></div>
          <Link href="/services" className="button button-primary">Explore services</Link>
        </aside>
      </main>
    </PublicPageShell>
  );
}
