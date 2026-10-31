import { ProductShell } from "@/components/product-shell";
import { TechnicianWallet } from "@/components/technician-app-workspace";

export default function TechnicianWalletPage() {
  return <ProductShell audience="Technician"><div className="page-heading"><div><div className="eyebrow">YOUR MONEY</div><h1>Wallet and payouts</h1><p className="subtle">Preview balances and payout requests with demo data.</p></div></div><TechnicianWallet /></ProductShell>;
}
