import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "leaflet/dist/leaflet.css";
import "@servicehub/ui/globals.css";
import "./site.css";
import { DevStateSwitcher } from "../components/dev-state-switcher";
import { DataProvider } from "../components/data-provider";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
export const metadata: Metadata = { title: "ServiceHub · Minna", description: "Local services, made easier.", manifest: "/manifest.webmanifest" };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en" className={inter.variable}><body><DataProvider>{children}<DevStateSwitcher /></DataProvider></body></html>;
}
