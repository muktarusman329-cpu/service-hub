import Link from "next/link";
import { Badge, Button, Card, Field, Skeleton, Table } from "@servicehub/ui/components";
import { ThemeToggle } from "@/components/theme-toggle";

const palette = [
  ["brand-50", "--brand-50"], ["brand-100", "--brand-100"], ["brand-200", "--brand-200"], ["brand-300", "--brand-300"],
    ["brand-400", "--brand-400"], ["brand-500 · non-text", "--brand-500"], ["brand-600", "--brand-600"], ["brand-700", "--brand-700"],
  ["brand-800", "--brand-800"], ["brand-900", "--brand-900"], ["accent-500", "--accent-500"], ["accent-700", "--accent-700"],
  ["canvas", "--canvas-light"], ["surface", "--surface-light"], ["text-muted", "--swatch-text-muted-light"], ["neutral-muted", "--swatch-neutral-muted-light"],
  ["success", "--success"], ["success-soft", "--success-soft-light"], ["warning", "--warning"], ["warning-soft", "--warning-soft-light"],
  ["danger", "--danger"], ["danger-soft", "--danger-soft-light"]
] as const;

const contrastPairs = [
  ["Primary button", "on-solid / brand-600", "4.74:1"], ["Button hover", "on-solid / brand-700", "6.87:1"],
  ["Button pressed", "on-solid / brand-800", "9.76:1"], ["Link on surface", "brand-600 / surface", "4.74:1"],
  ["Link or active text on canvas", "brand-700 / canvas", "6.17:1"], ["Selected label", "brand-700 / brand-50", "6.17:1"],
  ["Info badge", "brand-700 / brand-50", "6.17:1"], ["Success badge", "success-text / success-soft", "5.12:1"],
  ["Warning badge", "warning-text / warning-soft", "6.09:1"], ["Danger badge", "danger-text / danger-soft", "5.94:1"],
  ["Primary body text", "text-primary / surface", "16.48:1"], ["Secondary text", "text-secondary / surface", "5.74:1"],
  ["Muted text", "text-muted / canvas", "4.54:1"], ["Muted text on cards", "text-muted / surface", "4.95:1"],
  ["Dark primary body text", "text-primary / canvas", "16.40:1"], ["Dark secondary text", "text-secondary / surface", "8.83:1"],
  ["Dark muted text", "text-muted / canvas", "7.45:1"], ["Dark link", "brand-300 / surface", "7.41:1"],
  ["Dark selected label", "brand-200 / selected background", "9.13:1"], ["Dark success text", "success-text / success-soft", "8.34:1"],
  ["Dark warning text", "warning-text / warning-soft", "9.38:1"], ["Dark danger text", "danger-text / danger-soft", "7.61:1"]
] as const;

export default function DesignSystemPage() {
  return <main className="design-page">
    <div className="design-hero">
      <div><div className="eyebrow">ServiceHub · Design system</div><h1>Local help, with a clearer path.</h1><p className="subtle">A calm, practical interface for customers, technicians and the launch team in Minna.</p></div>
      <div className="component-row"><ThemeToggle /><Link className="button button-primary" href="/sign-in">Sign in</Link><Link className="button button-secondary" href="/app">Customer view</Link><Link className="button button-secondary" href="/technician">Technician</Link><Link className="button button-secondary" href="/admin">Admin</Link></div>
    </div>

    <Card><div className="section-head"><div><div className="eyebrow">01 · Colour tokens</div><h2>Blue actions, neutral surfaces, clear states</h2></div><Badge tone="info">Primary: brand-600</Badge></div>
      <div className="contrast-context">Token swatches are decorative. Blue text uses accessible darker shades.</div><div className="swatches">{palette.map(([name, token]) => <div key={name} className="swatch"><span className="swatch-color" style={{ background: `var(${token})` }} /><strong>{name}</strong></div>)}</div>
      <div className="contrast-table"><h3>Final text contrast pairs · WCAG AA</h3><Table><thead><tr><th>Use</th><th>Text / background</th><th>Contrast</th></tr></thead><tbody>{contrastPairs.map(([use, pair, ratio]) => <tr key={use}><td>{use}</td><td>{pair}</td><td><Badge tone="success">{ratio}</Badge></td></tr>)}</tbody></Table></div>
      <p className="contrast-note">Brand-500 is reserved for non-text indicators such as focus rings, progress bars and active markers. Primary buttons use white text on brand-600/700/800. Status chips use semantic text on soft backgrounds.</p>
    </Card>

    <div className="design-grid design-section">
      <Card><div className="section-head"><div><div className="eyebrow">02 · Controls</div><h2>Buttons and field states</h2></div></div>
        <div className="component-row"><Button>Primary action</Button><Button tone="secondary">Secondary</Button><Button tone="quiet">Text action</Button><Button tone="danger">Cancel</Button><Button disabled>Unavailable</Button></div>
        <div className="field-grid"><Field label="Nearest landmark" placeholder="For example, near Bosso Market" hint="A street address is optional." /><div className="field"><span className="field-label">Search field · focused</span><input className="input demo-focused" value="AC repair" readOnly aria-label="Focused search field example" /></div></div>
        <div className="component-row status-row"><Badge tone="info">New</Badge><Badge tone="success">Completed</Badge><Badge tone="warning">Awaiting review</Badge><Badge tone="danger">Failed / Rejected / Cancelled</Badge></div>
      </Card>
      <Card><div className="eyebrow">03 · Type and spacing</div><h2 style={{ marginTop: 5 }}>One clear idea at a time</h2><p className="subtle">Inter keeps labels familiar and prices easy to scan.</p><div className="price-sample">₦18,500</div><div className="subtle">Sample service price · tabular numerals</div><div className="spacing-sample"><span>8</span><i /><span>16</span><i /><span>24</span><i /><span>32</span></div></Card>
    </div>

    <section className="detail-example" aria-labelledby="detail-example-heading"><div className="eyebrow">04 · Detail-page pattern</div>
      <div className="detail-band"><div><div className="eyebrow">Booking · Bosso</div><h2 id="detail-example-heading">Generator repair visit</h2><div className="detail-subtitle">Landmark: near Bosso Market</div><div className="detail-facts"><div className="detail-fact"><span className="detail-meta-label">Agreed price</span><span className="detail-meta-value">₦18,500</span></div><div className="detail-fact"><span className="detail-meta-label">Visit time</span><span className="detail-meta-value">Today · 2:30 pm</span></div><div className="detail-fact"><span className="detail-meta-label">Status</span><span className="detail-meta-value">Confirmed</span></div></div></div><Button tone="secondary">Message technician</Button></div>
      <div className="detail-layout"><Card><div className="section-head"><h2>Job details</h2><Badge tone="success">Technician verified</Badge></div><p className="subtle">Generator starts, then switches off after a few minutes. Technician will inspect before confirming any extra parts or cost.</p><div className="list-row"><span>Service price</span><strong>₦18,500</strong></div><div className="list-row"><span className="subtle">Platform fee</span><span>Shown before payment</span></div></Card>
        <Card><div className="section-head"><h2>History and quotes</h2><Badge>2 updates</Badge></div><div className="history-list"><div className="history-item"><span className="history-dot" /><div className="history-copy"><strong>Booking confirmed</strong><div className="subtle">Today · 10:14 am</div></div></div><div className="history-item"><span className="history-dot" /><div className="history-copy"><strong>Technician sent a quote</strong><div className="subtle">₦18,500 · Today · 9:42 am</div></div></div></div></Card></div>
    </section>

    <Card className="table-card"><div className="section-head"><div><div className="eyebrow">05 · Table states</div><h2>Jobs and clear outcomes</h2></div><Button tone="secondary">View all</Button></div><Table><thead><tr><th>Service</th><th>Area</th><th>Price</th><th>Status</th></tr></thead><tbody>
      <tr><td>Generator repair</td><td>Bosso</td><td>₦18,500</td><td><Badge tone="success">Completed</Badge></td></tr><tr><td>Phone screen repair</td><td>Tunga</td><td>₦32,000</td><td><Badge tone="danger">Failed</Badge></td></tr><tr><td>AC check</td><td>Chanchaga</td><td>₦12,000</td><td><Badge tone="danger">Cancelled</Badge></td></tr>
    </tbody></Table></Card>

    <div className="design-grid design-section"><Card><div className="eyebrow">06 · Loading</div><h2 style={{ margin: "6px 0 18px" }}>Keep the page useful on slow connections</h2><div className="stack"><Skeleton className="skeleton-72" /><Skeleton className="skeleton-46" /><Skeleton className="skeleton-88" /></div></Card><Card className="metric-accent"><div className="eyebrow">Key stat · accent-700</div><div className="metric-value">112</div><div className="metric-foot">Completed jobs · sample only</div></Card></div>
    <p className="subtle" style={{ marginTop: 18, fontSize: 12 }}>Phase 2 identity preview · Local database, Redis and provider setup are required to use sign-in. Marketplace values are illustrative.</p>
  </main>;
}
