import Link from "next/link";

type BrandLogoProps = {
  href?: string;
  className?: string;
  onClick?: () => void;
  markOnly?: boolean;
  ariaLabel?: string;
};

export function BrandLogo({ href = "/", className = "", onClick, markOnly = false, ariaLabel = "ServiceHub home" }: BrandLogoProps) {
  return <Link href={href} className={`brand-logo ${className}`.trim()} aria-label={ariaLabel} onClick={onClick}>
    <svg className="brand-logo-mark" viewBox="0 0 120 132" role="img" aria-label="ServiceHub mark">
      <polygon points="60,12 107,39 107,93 60,120 13,93 13,39" fill="var(--brand-500)" stroke="var(--brand-500)" strokeWidth="12" strokeLinejoin="round" />
      <path d="M80 40C72 30 40 30 40 48C40 64 80 64 80 80C80 98 48 98 40 88" fill="none" stroke="var(--on-solid)" strokeWidth="9" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="80" cy="40" r="8" fill="var(--on-solid)" />
      <circle cx="40" cy="88" r="8" fill="var(--on-solid)" />
      <circle cx="40" cy="88" r="3.5" fill="var(--brand-500)" />
      <circle cx="60" cy="64" r="5" fill="var(--accent-700)" />
    </svg>
    {!markOnly && <span className="brand-logo-wordmark"><span>Service</span><span className="brand-logo-hub">Hub</span></span>}
  </Link>;
}
