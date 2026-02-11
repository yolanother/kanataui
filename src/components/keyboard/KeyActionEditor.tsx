import { useState, useEffect } from "react";
import { cn } from "../../lib/utils";
import type {
  KeyAction,
  TapHoldAction,
  TapHoldVariant,
  LayerAction,
  MacroAction,
  Alias,
  Layer,
  SExp,
} from "../../lib/kanata/types";
import { getKeyLabel, MODIFIER_KEYS, resolveActionForDisplay, CODE_TO_KANATA } from "../../lib/kanata/keys";
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

const LAYER_OPS: { value: LayerAction['op']; label: string; description: string }[] = [
  { value: 'layer-switch', label: 'Layer Switch', description: 'Permanently switch to another layer' },
  { value: 'layer-toggle', label: 'Layer Toggle', description: 'Toggle a layer on/off' },
  { value: 'layer-while-held', label: 'Layer While Held', description: 'Activate layer while key is held' },
];

const MACRO_VARIANT_OPTIONS = [
  { value: 'macro', label: 'macro' },
  { value: 'macro-repeat', label: 'macro-repeat' },
  { value: 'macro-release-cancel', label: 'macro-release-cancel' },
  { value: 'macro-repeat-release-cancel', label: 'macro-repeat-release-cancel' },
];

type EditorMode = "passthrough" | "tap-hold" | "layer" | "macro";

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export interface KeyActionEditorProps {
  keyName: string;
  action?: KeyAction;
  aliases?: Alias[];
  layers?: Layer[];
  onChange: (keyName: string, newAction: KeyAction) => void;
  onClose: () => void;
}

export function KeyActionEditor({
  keyName,
  action,
  aliases,
  layers,
  onChange,
  onClose,
}: KeyActionEditorProps) {
  const [mode, setMode] = useState<EditorMode>("passthrough");
  const [tapKey, setTapKey] = useState(keyName);
  const [holdMod, setHoldMod] = useState("lctl");
  const [holdIsLayer, setHoldIsLayer] = useState(false);
  const [holdLayerOp, setHoldLayerOp] = useState<LayerAction['op']>('layer-while-held');
  const [holdLayerTarget, setHoldLayerTarget] = useState('');
  const [variant, setVariant] = useState<TapHoldVariant>("tap-hold");
  const [tapTime, setTapTime] = useState("200");
  const [holdTime, setHoldTime] = useState("150");
  // Layer action mode
  const [layerOp, setLayerOp] = useState<LayerAction['op']>('layer-switch');
  const [layerTarget, setLayerTarget] = useState('');
  const [listening, setListening] = useState(false);
  // Extra keys for -keys tap-hold variants (preserved from existing action)
  const [savedExtraKeys, setSavedExtraKeys] = useState<SExp | undefined>(undefined);
  const [savedTapKeys, setSavedTapKeys] = useState<SExp | undefined>(undefined);
  // Macro mode
  const [macroVariant, setMacroVariant] = useState('macro');
  const [macroSteps, setMacroSteps] = useState<Array<{ type: 'key' | 'delay'; value: string }>>([
    { type: 'key', value: 'a' },
  ]);

  // Listen for physical keypress to set tap key
  useEffect(() => {
    if (!listening) return;

    const handler = (e: KeyboardEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const kanataName = CODE_TO_KANATA[e.code];
      if (kanataName) {
        setTapKey(kanataName);
      }
      setListening(false);
    };

    document.addEventListener('keydown', handler, true); // capture phase
    return () => document.removeEventListener('keydown', handler, true);
  }, [listening]);

  // Sync state from current action when key changes
  useEffect(() => {
    const resolved = resolveActionForDisplay(action, aliases ?? []);

    if (!resolved || typeof resolved === "string") {
      setMode("passthrough");
      setTapKey(typeof resolved === "string" ? resolved : keyName);
      setHoldIsLayer(false);
      return;
    }

    if (resolved.type === "tap-hold") {
      const th = resolved as TapHoldAction;
      setMode("tap-hold");
      setVariant(th.variant);
      setTapKey(typeof th.tapAction === "string" ? th.tapAction : keyName);

      // Check if hold action is a layer action
      if (typeof th.holdAction !== 'string' && th.holdAction.type === 'layer-action') {
        const la = th.holdAction as LayerAction;
        setHoldIsLayer(true);
        setHoldLayerOp(la.op);
        setHoldLayerTarget(la.layer);
        setHoldMod('lctl');
      } else {
        setHoldIsLayer(false);
        setHoldMod(typeof th.holdAction === "string" ? th.holdAction : "lctl");
      }

      setTapTime(String(th.tapTimeout));
      setHoldTime(String(th.holdTimeout));
      setSavedExtraKeys(th.extraKeys);
      setSavedTapKeys(th.tapKeys);
      return;
    }

    if (resolved.type === "layer-action") {
      const la = resolved as LayerAction;
      setMode("layer");
      setLayerOp(la.op);
      setLayerTarget(la.layer);
      return;
    }

    if (resolved.type === 'macro') {
      const ma = resolved as MacroAction;
      setMode('macro');
      setMacroVariant(ma.variant);
      setMacroSteps(
        ma.items.map(item =>
          typeof item === 'number'
            ? { type: 'delay' as const, value: String(item) }
            : { type: 'key' as const, value: typeof item === 'string' ? item : keyName }
        )
      );
      return;
    }

    setMode("passthrough");
    setHoldIsLayer(false);
  }, [action, keyName, aliases]);

  function applyChange() {
    if (mode === "passthrough") {
      onChange(keyName, tapKey);
      return;
    }

    if (mode === "layer") {
      if (!layerTarget) return;
      const la: LayerAction = { type: 'layer-action', op: layerOp, layer: layerTarget };
      onChange(keyName, la);
      return;
    }

    if (mode === "macro") {
      const items: (KeyAction | number)[] = macroSteps.map(step =>
        step.type === 'delay' ? Number(step.value) || 0 : step.value
      );
      const ma: MacroAction = { type: 'macro', variant: macroVariant, items };
      onChange(keyName, ma);
      return;
    }

    if (mode === "tap-hold") {
      let holdAction: KeyAction;
      if (holdIsLayer) {
        if (!holdLayerTarget) return;
        holdAction = { type: 'layer-action', op: holdLayerOp, layer: holdLayerTarget };
      } else {
        holdAction = holdMod;
      }

      const needsExtraKeys =
        variant === 'tap-hold-release-keys' ||
        variant === 'tap-hold-except-keys' ||
        variant === 'tap-hold-tap-keys' ||
        variant === 'tap-hold-release-tap-keys-release';
      // Use saved extraKeys, or provide a default key list for -keys variants
      const defaultKeyList: SExp = { type: 'list' as const, items: 'q w e r t y u i o p a s d f g h j k l z x c v b n m'.split(' ').map(k => ({ type: 'atom' as const, value: k })) };
      const extraKeys: SExp | undefined = needsExtraKeys
        ? (savedExtraKeys ?? defaultKeyList)
        : undefined;
      const tapKeysVal: SExp | undefined = variant === 'tap-hold-release-tap-keys-release'
        ? savedTapKeys
        : undefined;

      const newAction: TapHoldAction = {
        type: "tap-hold",
        variant,
        tapTimeout: tapTime.startsWith("$") ? tapTime : Number(tapTime),
        holdTimeout: holdTime.startsWith("$") ? holdTime : Number(holdTime),
        tapAction: tapKey,
        holdAction,
        extraKeys,
        tapKeys: tapKeysVal,
      };
      onChange(keyName, newAction);
    }
  }

  function handleReset() {
    onChange(keyName, keyName);
  }

  const currentDisplay = action ? keyActionToString(action) : keyName;
  const layerNames = (layers ?? []).map(l => l.name);

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
        {(["passthrough", "tap-hold", "layer", "macro"] as const).map((m) => (
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
            {m === "passthrough" ? "Simple Key" : m === "tap-hold" ? "Tap-Hold" : m === "layer" ? "Layer" : "Macro"}
          </button>
        ))}
      </div>

      {/* Passthrough editor */}
      {mode === "passthrough" && (
        <div className="space-y-3">
          <label className="block">
            <span className="text-xs font-medium text-muted-foreground">Key Output</span>
            <div className="mt-1 flex gap-2">
              <input
                type="text"
                value={tapKey}
                onChange={(e) => setTapKey(e.target.value)}
                placeholder={listening ? "Press a key..." : ""}
                className={cn(
                  "block flex-1 rounded-md border px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-ring",
                  listening
                    ? "border-amber-500 bg-amber-500/10 animate-pulse"
                    : "border-input bg-background focus:border-ring"
                )}
                readOnly={listening}
              />
              <button
                type="button"
                onClick={() => setListening(!listening)}
                className={cn(
                  "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                  listening
                    ? "bg-amber-500 text-white"
                    : "border border-border bg-muted text-muted-foreground hover:bg-accent hover:text-foreground"
                )}
              >
                {listening ? "Listening..." : "Listen"}
              </button>
            </div>
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
            <div className="mt-1 flex gap-2">
              <input
                type="text"
                value={tapKey}
                onChange={(e) => setTapKey(e.target.value)}
                placeholder={listening ? "Press a key..." : ""}
                className={cn(
                  "block flex-1 rounded-md border px-3 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-ring",
                  listening
                    ? "border-amber-500 bg-amber-500/10 animate-pulse"
                    : "border-input bg-background focus:border-ring"
                )}
                readOnly={listening}
              />
              <button
                type="button"
                onClick={() => setListening(!listening)}
                className={cn(
                  "rounded-md px-3 py-1.5 text-xs font-medium transition-colors",
                  listening
                    ? "bg-amber-500 text-white"
                    : "border border-border bg-muted text-muted-foreground hover:bg-accent hover:text-foreground"
                )}
              >
                {listening ? "Listening..." : "Listen"}
              </button>
            </div>
          </label>

          {/* Hold action type toggle */}
          <div className="space-y-1">
            <span className="text-xs font-medium text-muted-foreground">Hold Action Type</span>
            <div className="flex gap-2 mt-1">
              <button
                type="button"
                onClick={() => setHoldIsLayer(false)}
                className={cn(
                  "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                  !holdIsLayer
                    ? "bg-primary/15 text-primary border border-primary/30"
                    : "bg-muted text-muted-foreground hover:bg-accent",
                )}
              >
                Modifier
              </button>
              <button
                type="button"
                onClick={() => setHoldIsLayer(true)}
                className={cn(
                  "rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
                  holdIsLayer
                    ? "bg-primary/15 text-primary border border-primary/30"
                    : "bg-muted text-muted-foreground hover:bg-accent",
                )}
              >
                Layer Action
              </button>
            </div>
          </div>

          {/* Hold modifier */}
          {!holdIsLayer && (
            <label className="block">
              <span className="text-xs font-medium text-muted-foreground">Hold Modifier</span>
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
          )}

          {/* Hold layer action */}
          {holdIsLayer && (
            <>
              <label className="block">
                <span className="text-xs font-medium text-muted-foreground">Layer Operation</span>
                <select
                  value={holdLayerOp}
                  onChange={(e) => setHoldLayerOp(e.target.value as LayerAction['op'])}
                  className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
                >
                  {LAYER_OPS.map((op) => (
                    <option key={op.value} value={op.value}>
                      {op.label}
                    </option>
                  ))}
                </select>
                <p className="mt-1 text-xs text-muted-foreground">
                  {LAYER_OPS.find(op => op.value === holdLayerOp)?.description}
                </p>
              </label>
              <label className="block">
                <span className="text-xs font-medium text-muted-foreground">Target Layer</span>
                {layerNames.length > 0 ? (
                  <select
                    value={holdLayerTarget}
                    onChange={(e) => setHoldLayerTarget(e.target.value)}
                    className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
                  >
                    <option value="">-- select layer --</option>
                    {layerNames.map(name => (
                      <option key={name} value={name}>{name}</option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="text"
                    value={holdLayerTarget}
                    onChange={(e) => setHoldLayerTarget(e.target.value)}
                    placeholder="layer name"
                    className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
                  />
                )}
              </label>
            </>
          )}

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

      {/* Layer action editor */}
      {mode === "layer" && (
        <div className="space-y-3">
          <label className="block">
            <span className="text-xs font-medium text-muted-foreground">Operation</span>
            <select
              value={layerOp}
              onChange={(e) => setLayerOp(e.target.value as LayerAction['op'])}
              className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
            >
              {LAYER_OPS.map((op) => (
                <option key={op.value} value={op.value}>
                  {op.label}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-muted-foreground">
              {LAYER_OPS.find(op => op.value === layerOp)?.description}
            </p>
          </label>
          <label className="block">
            <span className="text-xs font-medium text-muted-foreground">Target Layer</span>
            {layerNames.length > 0 ? (
              <select
                value={layerTarget}
                onChange={(e) => setLayerTarget(e.target.value)}
                className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
              >
                <option value="">-- select layer --</option>
                {layerNames.map(name => (
                  <option key={name} value={name}>{name}</option>
                ))}
              </select>
            ) : (
              <input
                type="text"
                value={layerTarget}
                onChange={(e) => setLayerTarget(e.target.value)}
                placeholder="layer name"
                className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
              />
            )}
          </label>
        </div>
      )}

      {/* Macro editor */}
      {mode === "macro" && (
        <div className="space-y-3">
          <label className="block">
            <span className="text-xs font-medium text-muted-foreground">Macro Variant</span>
            <select
              value={macroVariant}
              onChange={(e) => setMacroVariant(e.target.value)}
              className="mt-1 block w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring"
            >
              {MACRO_VARIANT_OPTIONS.map((v) => (
                <option key={v.value} value={v.value}>{v.label}</option>
              ))}
            </select>
          </label>

          <div className="space-y-2">
            <span className="text-xs font-medium text-muted-foreground">Steps</span>
            {macroSteps.map((step, i) => (
              <div key={i} className="flex items-center gap-2">
                <select
                  value={step.type}
                  onChange={(e) => {
                    const newSteps = [...macroSteps];
                    newSteps[i] = { type: e.target.value as 'key' | 'delay', value: step.type === e.target.value ? step.value : (e.target.value === 'delay' ? '100' : 'a') };
                    setMacroSteps(newSteps);
                  }}
                  className="rounded-md border border-input bg-background px-2 py-1 text-xs"
                >
                  <option value="key">Key</option>
                  <option value="delay">Delay</option>
                </select>
                <input
                  type={step.type === 'delay' ? 'number' : 'text'}
                  value={step.value}
                  onChange={(e) => {
                    const newSteps = [...macroSteps];
                    newSteps[i] = { ...step, value: e.target.value };
                    setMacroSteps(newSteps);
                  }}
                  placeholder={step.type === 'delay' ? 'ms' : 'key name'}
                  className="flex-1 rounded-md border border-input bg-background px-2 py-1 text-sm"
                />
                <button
                  type="button"
                  onClick={() => setMacroSteps(macroSteps.filter((_, j) => j !== i))}
                  className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
                  disabled={macroSteps.length <= 1}
                >
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={() => setMacroSteps([...macroSteps, { type: 'key', value: '' }])}
              className="rounded-md border border-dashed border-border px-3 py-1 text-xs text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              + Add Step
            </button>
          </div>
        </div>
      )}

      {/* Action buttons */}
      <div className="mt-4 flex items-center justify-between">
        <button
          type="button"
          onClick={handleReset}
          className="rounded-md border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          title="Reset key to its default (passthrough) value"
        >
          Reset to Default
        </button>
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
