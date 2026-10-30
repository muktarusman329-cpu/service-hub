"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { mockApiClient } from "@servicehub/shared/mock-api-client";

export function DevStateSwitcher() {
  const queryClient = useQueryClient();
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [empty, setEmpty] = useState(false);

  if (process.env.NODE_ENV === "production") return null;

  return (
    <>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-4 right-4 bg-gray-900 text-white px-3 py-2 rounded-lg text-xs font-mono z-50"
      >
        Dev State
      </button>
      {isOpen && (
        <div className="fixed bottom-16 right-4 bg-white border rounded-lg shadow-xl p-4 w-64 z-50">
          <h3 className="font-semibold text-sm mb-3">State Switcher</h3>
          <div className="space-y-2">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={loading}
                onChange={(e) => {
                  setLoading(e.target.checked);
                  mockApiClient.setSimulations({ loading: e.target.checked });
                  void queryClient.invalidateQueries();
                }}
              />
              Loading (2s delay)
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={error}
                onChange={(e) => {
                  setError(e.target.checked);
                  mockApiClient.setSimulations({ error: e.target.checked });
                  void queryClient.invalidateQueries();
                }}
              />
              Error
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={empty}
                onChange={(e) => {
                  setEmpty(e.target.checked);
                  mockApiClient.setSimulations({ empty: e.target.checked });
                  void queryClient.invalidateQueries();
                }}
              />
              Empty responses
            </label>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className="mt-3 w-full bg-gray-100 text-gray-700 text-sm py-1 rounded"
          >
            Close
          </button>
        </div>
      )}
    </>
  );
}
