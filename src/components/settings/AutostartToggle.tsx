import { useState, useEffect } from "react";
import {
  enableAutostart,
  disableAutostart,
  isAutoStartEnabled,
} from "../../lib/autostart";

export function AutostartToggle() {
  const [enabled, setEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    isAutoStartEnabled()
      .then(setEnabled)
      .catch(() => setError("Failed to check autostart status"))
      .finally(() => setLoading(false));
  }, []);

  const handleToggle = async () => {
    setError(null);
    setLoading(true);
    try {
      if (enabled) {
        await disableAutostart();
        setEnabled(false);
      } else {
        await enableAutostart();
        setEnabled(true);
      }
    } catch {
      setError("Failed to update autostart setting");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-between rounded-lg border border-border p-4">
      <div>
        <h3 className="text-sm font-medium text-foreground">
          Launch at startup
        </h3>
        <p className="text-sm text-muted-foreground">
          Automatically start KanataUI when you log in.
        </p>
        {error && (
          <p className="mt-1 text-sm text-red-500">{error}</p>
        )}
      </div>
      <button
        role="switch"
        aria-checked={enabled}
        disabled={loading}
        onClick={handleToggle}
        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${
          enabled ? "bg-primary" : "bg-neutral-200 dark:bg-neutral-700"
        }`}
      >
        <span
          className={`pointer-events-none block h-5 w-5 rounded-full bg-white shadow-lg ring-0 transition-transform ${
            enabled ? "translate-x-5" : "translate-x-0"
          }`}
        />
      </button>
    </div>
  );
}
