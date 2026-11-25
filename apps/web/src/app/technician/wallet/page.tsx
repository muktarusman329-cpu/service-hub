import { ProductShell } from "@/components/product-shell";
import { TechnicianWallet } from "@/components/technician-app-workspace";

export default function TechnicianWalletPage() {
  return <ProductShell audience="Technician"><div className="page-heading"><div><div className="eyebrow">YOUR MONEY</div><h1>Wallet and payouts</h1><p className="subtle">Wallet and payout information is shown only when the live API supports it.</p></div></div><TechnicianWallet /></ProductShell>;
}
