import { useState, useEffect } from "react";
import { cn } from "../../lib/utils";
import type {
  KeyAction,
  TapHoldAction,
  TapHoldVariant,
  Alias,
} from "../../lib/kanata/types";
import { getKeyLabel, MODIFIER_KEYS, resolveActionForDisplay } from "../../lib/kanata/keys";
import { keyActionToString } from "../../lib/kanata/generator";

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const TAP_HOLD_VARIANTS: { value: TapHoldVariant; label: string; description: string }[] = [
  { value: "tap-hold", label: "tap-hold", description: "Basic: hold timeout triggers hold action" },
  { value: "tap-hold-press", label: "tap-hold-press", description: "Hold activates on any other key press" },
  { value: "tap-hold-release", label: "tap-hold-release", description: "Hold activates on press+release of another key" },
  { value: "tap-hold-release-keys", label: "tap-hold-release-keys", description: "Like release, with early tap keys" },
  { value: "tap-hold-except-keys", label: "tap-hold-except-keys", description: "Always tap if listed keys pressed" },
  { value: "tap-hold-tap-keys", label: "tap-hold-tap-keys", description: "Early tap for listed keys, no early hold for others" },
];

const MODIFIER_OPTIONS = Array.from(MODIFIER_KEYS).map((m) => ({
  value: m,
  label: getKeyLabel(m),
}));

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export interface KeyActionEditorProps {
  /** The defsrc key name being edited. */
  keyName: string;
  /** Current action for this key. */
  action?: KeyAction;
  /** Aliases from config for resolving alias-ref actions. */
  aliases?: Alias[];
  /** Called when the action is changed. */
  onChange: (keyName: string, newAction: KeyAction) => void;
  /** Called to close the editor panel. */
  onClose: () => void;
}

export function KeyActionEditor({
  keyName,
  action,
  aliases,
  onChange,
  onClose,
}: KeyActionEditorProps) {
  // Determine the current editing mode
  const [mode, setMode] = useState<"passthrough" | "tap-hold">("passthrough");
  const [tapKey, setTapKey] = useState(keyName);
  const [holdMod, setHoldMod] = useState("lctl");
  const [variant, setVariant] = useState<TapHoldVariant>("tap-hold");
  const [tapTime, setTapTime] = useState("200");
  const [holdTime, setHoldTime] = useState("150");

  // Sync state from current action when key changes
  useEffect(() => {
    const resolved = resolveActionForDisplay(action, aliases ?? []);

    if (!resolved || typeof resolved === "string") {
      setMode("passthrough");
      setTapKey(typeof resolved === "string" ? resolved : keyName);
      return;
    }

    if (resolved.type === "tap-hold") {
      const th = resolved as TapHoldAction;
      setMode("tap-hold");
      setVariant(th.variant);
      setTapKey(typeof th.tapAction === "string" ? th.tapAction : keyName);
      setHoldMod(typeof th.holdAction === "string" ? th.holdAction : "lctl");
      setTapTime(String(th.tapTimeout));
      setHoldTime(String(th.holdTimeout));
      return;
    }

    // For other complex actions, just show as passthrough
    setMode("passthrough");
  }, [action, keyName, aliases]);

  function applyChange() {
    if (mode === "passthrough") {
      onChange(keyName, tapKey);
      return;
    }

    if (mode === "tap-hold") {
      const newAction: TapHoldAction = {
        type: "tap-hold",
        variant,
        tapTimeout: tapTime.startsWith("$") ? tapTime : Number(tapTime),
        holdTimeout: holdTime.startsWith("$") ? holdTime : Number(holdTime),
        tapAction: tapKey,
        holdAction: holdMod,
      };
      onChange(keyName, newAction);
    }
  }

  const currentDisplay = action ? keyActionToString(action) : keyName;

  return (
    <div className="rounded-lg border border-border bg-card p-4 shadow-sm">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold">
            Edit Key: <span className="text-primary">{getKeyLabel(keyName)}</span>
          </h3>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Current: <code className="rounded bg-muted px-1">{currentDisplay}</code>
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-md p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Mode selector */}
      <div className="mb-4 flex gap-2">
        {(["passthrough", "tap-hold"] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setMode(m)}
            className={cn(
              "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
              mode === m
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-accent hover:text-foreground",
            )}
          >
            {m === "passthrough" ? "Simple Key" : "Tap-Hold"}
          </button>
        ))}
      </div>

      {/* Passthrough editor */}
      {mode === "passthrough" && (
        <div className="space-y-3">
          <label className="block">
            <span className="text-xs font-medium text-muted-foreground">Key Output</span>
            <input
              type="text"
              value={tapKey}
              onChange={(e) => setTapKey(e.target.value)}
              className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </label>
        </div>
      )}

      {/* Tap-hold editor */}
      {mode === "tap-hold" && (
        <div className="space-y-3">
          {/* Variant */}
          <label className="block">
            <span className="text-xs font-medium text-muted-foreground">Variant</span>
            <select
              value={variant}
              onChange={(e) => setVariant(e.target.value as TapHoldVariant)}
              className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
            >
              {TAP_HOLD_VARIANTS.map((v) => (
                <option key={v.value} value={v.value}>
                  {v.label}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-muted-foreground">
              {TAP_HOLD_VARIANTS.find((v) => v.value === variant)?.description}
            </p>
          </label>

          {/* Tap key */}
          <label className="block">
            <span className="text-xs font-medium text-muted-foreground">Tap Action (key)</span>
            <input
              type="text"
              value={tapKey}
              onChange={(e) => setTapKey(e.target.value)}
              className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </label>

          {/* Hold modifier */}
          <label className="block">
            <span className="text-xs font-medium text-muted-foreground">Hold Action (modifier)</span>
            <select
              value={holdMod}
              onChange={(e) => setHoldMod(e.target.value)}
              className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
            >
              {MODIFIER_OPTIONS.map((m) => (
                <option key={m.value} value={m.value}>
                  {m.label} ({m.value})
                </option>
              ))}
            </select>
          </label>

          {/* Timing */}
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="text-xs font-medium text-muted-foreground">Tap Timeout (ms)</span>
              <input
                type="text"
                value={tapTime}
                onChange={(e) => setTapTime(e.target.value)}
                placeholder="200 or $tap-time"
                className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </label>
            <label className="block">
              <span className="text-xs font-medium text-muted-foreground">Hold Timeout (ms)</span>
              <input
                type="text"
                value={holdTime}
                onChange={(e) => setHoldTime(e.target.value)}
                placeholder="150 or $hold-time"
                className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
              />
            </label>
          </div>
        </div>
      )}

      {/* Apply button */}
      <div className="mt-4 flex justify-end">
        <button
          type="button"
          onClick={applyChange}
          className="rounded-md bg-primary px-4 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          Apply
        </button>
      </div>
    </div>
  );
}
