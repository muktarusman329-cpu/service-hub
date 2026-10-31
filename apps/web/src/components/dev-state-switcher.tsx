"use client";

import Link from "next/link";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { mockApiClient } from "@servicehub/shared/mock-api-client";
import { messages } from "@servicehub/shared/messages/en";

export function DevStateSwitcher() {
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [empty, setEmpty] = useState(false);
  const [offline, setOffline] = useState(false);
  const [role, setRole] = useState<"Customer" | "Technician" | "Admin">("Customer");
  const dashboard = role === "Customer" ? "/app" : role === "Technician" ? "/technician" : "/admin";

  if (process.env.NODE_ENV === "production") return null;

  return (
    <>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="dev-state-toggle"
        type="button"
      >
        {messages.dev.stateSwitcher}
      </button>
      {isOpen && (
        <div className="dev-state-panel">
          <h3>State switcher</h3>
          <label className="field">
            <span className="field-label">{messages.dev.role}</span>
            <select className="input" value={role} onChange={(event) => setRole(event.target.value as typeof role)}>
              <option>Customer</option><option>Technician</option><option>Admin</option>
            </select>
          </label>
          <Link className="button button-secondary dev-role-link" href={dashboard} onClick={() => setIsOpen(false)}>{messages.dev.dashboard}</Link>
          <div className="dev-state-options">
            <label>
              <input
                type="checkbox"
                checked={loading}
                onChange={(e) => {
                  setLoading(e.target.checked);
                  mockApiClient.setSimulations({ loading: e.target.checked });
                  void queryClient.invalidateQueries();
                }}
              />
              {messages.dev.loading}
            </label>
            <label>
              <input
                type="checkbox"
                checked={error}
                onChange={(e) => {
                  setError(e.target.checked);
                  mockApiClient.setSimulations({ error: e.target.checked });
                  void queryClient.invalidateQueries();
                }}
              />
              {messages.dev.error}
            </label>
            <label>
              <input
                type="checkbox"
                checked={empty}
                onChange={(e) => {
                  setEmpty(e.target.checked);
                  mockApiClient.setSimulations({ empty: e.target.checked });
                  void queryClient.invalidateQueries();
                }}
              />
              {messages.dev.empty}
            </label>
            <label>
              <input
                type="checkbox"
                checked={offline}
                onChange={(event) => {
                  setOffline(event.target.checked);
                  mockApiClient.setSimulations({ offline: event.target.checked });
                  void queryClient.invalidateQueries();
                }}
              />
              {messages.dev.offline}
            </label>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className="button button-secondary dev-state-close"
            type="button"
          >
            {messages.dev.close}
          </button>
        </div>
      )}
    </>
  );
}
