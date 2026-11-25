"use client";

import { Card } from "@servicehub/ui/components";

export function AccountWorkspaceScreen({ screen }: { screen: "profile" | "addresses" | "notifications" | "settings" | "onboarding" }) {
  return <section className="account-workspace"><div className="page-heading"><div><h1>{screen === "profile" ? "Profile" : screen === "addresses" ? "Addresses" : screen === "notifications" ? "Notifications" : screen === "settings" ? "Settings" : "Account setup"}</h1></div></div><Card><p className="subtle">This account workflow does not have a live API endpoint yet. No local preview state is used.</p></Card></section>;
}
