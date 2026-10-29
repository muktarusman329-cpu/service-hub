import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "@servicehub/ui/globals.css";
import "./site.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
export const metadata: Metadata = { title: "ServiceHub · Minna", description: "Local services, made easier.", manifest: "/manifest.webmanifest" };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en" className={inter.variable}><body>{children}</body></html>;
}
