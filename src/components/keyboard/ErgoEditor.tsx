// ============================================================================
// ErgoEditor - Ergonomic split keyboard layout editor
// ============================================================================

import { useState, useCallback, useMemo, useEffect } from 'react';
import { cn } from '../../lib/utils';
import type {
  KanataConfig,
  KeyAction,
  Layer,
  TapHoldAction,
  TapHoldVariant,
  LayerAction,
  Alias,
} from '../../lib/kanata/types';
import { KEY_LABELS, getKeyLabel, MODIFIER_KEYS, resolveActionForDisplay, CODE_TO_KANATA } from '../../lib/kanata/keys';
import {
  ERGO_LAYOUTS,
  getErgoLayout,
  getTotalKeys,
  buildCustomLayout,
  type ErgoLayoutDef,
} from '../../lib/kanata/ergo-layouts';
import { ErgoKeyboard } from './ErgoKeyboard';

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------

export interface ErgoEditorProps {
  config: KanataConfig;
  onChange: (config: KanataConfig) => void;
  selectedLayout: string;
  onLayoutChange: (layoutId: string) => void;
  selectedLayer?: string;
  onLayerChange?: (layerName: string) => void;
}

// ---------------------------------------------------------------------------
// Key editor panel (self-contained; no dependency on QWERTY editor)
// ---------------------------------------------------------------------------

interface KeyEditorPanelProps {
  keyIndex: number;
  defsrcName: string;
  action: KeyAction | undefined;
  aliases?: Alias[];
  layers: Layer[];
  onActionChange: (keyIndex: number, action: KeyAction) => void;
  onClose: () => void;
}

const TAP_HOLD_VARIANTS: { value: TapHoldVariant; label: string }[] = [
  { value: 'tap-hold', label: 'tap-hold' },
  { value: 'tap-hold-press', label: 'tap-hold-press' },
  { value: 'tap-hold-release', label: 'tap-hold-release' },
  { value: 'tap-hold-press-timeout', label: 'tap-hold-press-timeout' },
  { value: 'tap-hold-release-timeout', label: 'tap-hold-release-timeout' },
  { value: 'tap-hold-release-keys', label: 'tap-hold-release-keys' },
];

const LAYER_OPS: { value: LayerAction['op']; label: string; description: string }[] = [
  { value: 'layer-switch', label: 'Layer Switch', description: 'Permanently switch to another layer' },
  { value: 'layer-toggle', label: 'Layer Toggle', description: 'Toggle a layer on/off' },
  { value: 'layer-while-held', label: 'Layer While Held', description: 'Activate layer while key is held' },
];

/** All key name options for the dropdown. */
const KEY_OPTIONS = Object.entries(KEY_LABELS).map(([name, label]) => ({
  value: name,
  label: `${label} (${name})`,
}));

function KeyEditorPanel({ keyIndex, defsrcName, action, aliases, layers, onActionChange, onClose }: KeyEditorPanelProps) {
  // Resolve alias-ref to underlying action for display
  const resolved = resolveActionForDisplay(action, aliases ?? []);
  // Determine current tap/hold values
  const isTapHold = resolved && typeof resolved !== 'string' && resolved.type === 'tap-hold';
  const isLayerAction = resolved && typeof resolved !== 'string' && resolved.type === 'layer-action';
  const tapHold = isTapHold ? (resolved as TapHoldAction) : null;
  const layerAct = isLayerAction ? (resolved as LayerAction) : null;

  const tapValue = tapHold
    ? (typeof tapHold.tapAction === 'string' ? tapHold.tapAction : '')
    : (typeof resolved === 'string' ? resolved : '');

  // Hold action analysis
  const holdIsLayerAction = tapHold && typeof tapHold.holdAction !== 'string' && tapHold.holdAction.type === 'layer-action';
  const holdLayerAct = holdIsLayerAction ? (tapHold!.holdAction as LayerAction) : null;

  const holdValue = tapHold
    ? (holdIsLayerAction ? '' : (typeof tapHold.holdAction === 'string' ? tapHold.holdAction : ''))
    : '';

  const variant = tapHold?.variant ?? 'tap-hold';
  const tapTimeout = tapHold ? String(tapHold.tapTimeout) : '200';
  const holdTimeout = tapHold ? String(tapHold.holdTimeout) : '150';

  // Local state for hold type
  const [holdType, setHoldType] = useState<'modifier' | 'layer'>(holdIsLayerAction ? 'layer' : 'modifier');
  const [holdLayerOp, setHoldLayerOp] = useState<LayerAction['op']>(holdLayerAct?.op ?? 'layer-while-held');
  const [holdLayerTarget, setHoldLayerTarget] = useState(holdLayerAct?.layer ?? '');

  // Local state for standalone layer action mode
  const [mode, setMode] = useState<'key' | 'layer'>(isLayerAction ? 'layer' : 'key');
  const [layerOp, setLayerOp] = useState<LayerAction['op']>(layerAct?.op ?? 'layer-switch');
  const [layerTarget, setLayerTarget] = useState(layerAct?.layer ?? '');
  const [listening, setListening] = useState(false);

  // Listen for physical keypress to set tap key
  useEffect(() => {
    if (!listening) return;

    const handler = (e: KeyboardEvent) => {
      e.preventDefault();
      e.stopPropagation();
      const kanataName = CODE_TO_KANATA[e.code];
      if (kanataName) {
        handleTapChange(kanataName);
      }
      setListening(false);
    };

    document.addEventListener('keydown', handler, true); // capture phase
    return () => document.removeEventListener('keydown', handler, true);
  }, [listening]);

  // Reset local state when action changes
  useEffect(() => {
    const res = resolveActionForDisplay(action, aliases ?? []);
    if (res && typeof res !== 'string' && res.type === 'layer-action') {
      setMode('layer');
      setLayerOp((res as LayerAction).op);
      setLayerTarget((res as LayerAction).layer);
    } else {
      setMode('key');
    }
    if (res && typeof res !== 'string' && res.type === 'tap-hold') {
      const th = res as TapHoldAction;
      if (typeof th.holdAction !== 'string' && th.holdAction.type === 'layer-action') {
        setHoldType('layer');
        setHoldLayerOp((th.holdAction as LayerAction).op);
        setHoldLayerTarget((th.holdAction as LayerAction).layer);
      } else {
        setHoldType('modifier');
      }
    }
  }, [action, aliases]);

  const layerNames = layers.map(l => l.name);

  const handleTapChange = (newTap: string) => {
    if (holdValue || holdType === 'layer') {
      let holdAction: KeyAction;
      if (holdType === 'layer' && holdLayerTarget) {
        holdAction = { type: 'layer-action', op: holdLayerOp, layer: holdLayerTarget };
      } else {
        holdAction = holdValue || 'lctl';
      }
      const th: TapHoldAction = {
        type: 'tap-hold',
        variant,
        tapTimeout: Number(tapTimeout) || 200,
        holdTimeout: Number(holdTimeout) || 150,
        tapAction: newTap,
        holdAction,
      };
      onActionChange(keyIndex, th);
    } else {
      onActionChange(keyIndex, newTap);
    }
  };

  const handleHoldChange = (newHold: string) => {
    if (newHold) {
      setHoldType('modifier');
      const th: TapHoldAction = {
        type: 'tap-hold',
        variant,
        tapTimeout: Number(tapTimeout) || 200,
        holdTimeout: Number(holdTimeout) || 150,
        tapAction: tapValue || defsrcName,
        holdAction: newHold,
      };
      onActionChange(keyIndex, th);
    } else {
      // Remove hold -> plain key
      onActionChange(keyIndex, tapValue || defsrcName);
    }
  };

  const handleHoldLayerApply = () => {
    if (!holdLayerTarget) return;
    setHoldType('layer');
    const th: TapHoldAction = {
      type: 'tap-hold',
      variant,
      tapTimeout: Number(tapTimeout) || 200,
      holdTimeout: Number(holdTimeout) || 150,
      tapAction: tapValue || defsrcName,
      holdAction: { type: 'layer-action', op: holdLayerOp, layer: holdLayerTarget },
    };
    onActionChange(keyIndex, th);
  };

  const handleVariantChange = (newVariant: TapHoldVariant) => {
    if (tapHold) {
      onActionChange(keyIndex, { ...tapHold, variant: newVariant });
    }
  };

  const handleTimingChange = (field: 'tap' | 'hold', value: string) => {
    if (tapHold) {
      const updated = { ...tapHold };
      if (field === 'tap') updated.tapTimeout = Number(value) || 200;
      else updated.holdTimeout = Number(value) || 150;
      onActionChange(keyIndex, updated);
    }
  };

  const handleLayerActionApply = () => {
    if (!layerTarget) return;
    onActionChange(keyIndex, { type: 'layer-action', op: layerOp, layer: layerTarget });
  };

  const handleReset = () => {
    onActionChange(keyIndex, defsrcName);
  };

  return (
    <div className="space-y-4 rounded-lg border border-border bg-card p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">
          Edit Key: <span className="text-primary">{getKeyLabel(defsrcName)}</span>
        </h3>
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

      {/* Mode toggle: Key editing vs Layer action */}
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setMode('key')}
          className={cn(
            'rounded-md px-3 py-1.5 text-xs font-medium transition-colors',
            mode === 'key'
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted text-muted-foreground hover:bg-accent hover:text-foreground',
          )}
        >
          Key / Tap-Hold
        </button>
        <button
          type="button"
          onClick={() => setMode('layer')}
          className={cn(
            'rounded-md px-3 py-1.5 text-xs font-medium transition-colors',
            mode === 'layer'
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted text-muted-foreground hover:bg-accent hover:text-foreground',
          )}
        >
          Layer Action
        </button>
      </div>

      {mode === 'key' && (
        <>
          {/* Tap action */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Tap Action</label>
            <div className="flex gap-2">
              <select
                value={tapValue}
                onChange={(e) => handleTapChange(e.target.value)}
                className={cn(
                  "flex-1 rounded-md border px-3 py-1.5 text-sm",
                  listening
                    ? "border-amber-500 bg-amber-500/10"
                    : "border-input bg-background"
                )}
                disabled={listening}
              >
                <option value="">-- select --</option>
                {KEY_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => setListening(!listening)}
                className={cn(
                  "rounded-md px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap",
                  listening
                    ? "bg-amber-500 text-white animate-pulse"
                    : "border border-border bg-muted text-muted-foreground hover:bg-accent hover:text-foreground"
                )}
              >
                {listening ? "Press key..." : "Listen"}
              </button>
            </div>
          </div>

          {/* Hold action type toggle */}
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Hold Action</label>
            <div className="flex gap-2 mt-1">
              <button
                type="button"
                onClick={() => setHoldType('modifier')}
                className={cn(
                  'rounded-md px-2.5 py-1 text-xs font-medium transition-colors',
                  holdType === 'modifier'
                    ? 'bg-primary/15 text-primary border border-primary/30'
                    : 'bg-muted text-muted-foreground hover:bg-accent',
                )}
              >
                Modifier
              </button>
              <button
                type="button"
                onClick={() => setHoldType('layer')}
                className={cn(
                  'rounded-md px-2.5 py-1 text-xs font-medium transition-colors',
                  holdType === 'layer'
                    ? 'bg-primary/15 text-primary border border-primary/30'
                    : 'bg-muted text-muted-foreground hover:bg-accent',
                )}
              >
                Layer Action
              </button>
            </div>
          </div>

          {/* Hold modifier */}
          {holdType === 'modifier' && (
            <div className="space-y-1">
              <select
                value={holdValue}
                onChange={(e) => handleHoldChange(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm"
              >
                <option value="">None (plain key)</option>
                {[...MODIFIER_KEYS].map((mod) => (
                  <option key={mod} value={mod}>
                    {getKeyLabel(mod)} ({mod})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Hold layer action */}
          {holdType === 'layer' && (
            <div className="space-y-2">
              <select
                value={holdLayerOp}
                onChange={(e) => setHoldLayerOp(e.target.value as LayerAction['op'])}
                className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm"
              >
                {LAYER_OPS.map(op => (
                  <option key={op.value} value={op.value}>{op.label}</option>
                ))}
              </select>
              <p className="text-xs text-muted-foreground">
                {LAYER_OPS.find(op => op.value === holdLayerOp)?.description}
              </p>
              {layerNames.length > 0 ? (
                <select
                  value={holdLayerTarget}
                  onChange={(e) => setHoldLayerTarget(e.target.value)}
                  className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm"
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
                  className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm"
                />
              )}
              <button
                type="button"
                onClick={handleHoldLayerApply}
                disabled={!holdLayerTarget}
                className="rounded-md bg-primary px-3 py-1 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
              >
                Apply Hold Layer
              </button>
            </div>
          )}

          {/* Tap-hold variant & timing (shown when hold is set) */}
          {tapHold && (
            <>
              <div className="space-y-1">
                <label className="text-xs font-medium text-muted-foreground">Tap-Hold Variant</label>
                <select
                  value={variant}
                  onChange={(e) => handleVariantChange(e.target.value as TapHoldVariant)}
                  className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm"
                >
                  {TAP_HOLD_VARIANTS.map((v) => (
                    <option key={v.value} value={v.value}>
                      {v.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">Tap Timeout (ms)</label>
                  <input
                    type="number"
                    value={tapTimeout}
                    onChange={(e) => handleTimingChange('tap', e.target.value)}
                    className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm"
                    min={0}
                    step={10}
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-xs font-medium text-muted-foreground">Hold Timeout (ms)</label>
                  <input
                    type="number"
                    value={holdTimeout}
                    onChange={(e) => handleTimingChange('hold', e.target.value)}
                    className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm"
                    min={0}
                    step={10}
                  />
                </div>
              </div>
            </>
          )}
        </>
      )}

      {mode === 'layer' && (
        <div className="space-y-3">
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Operation</label>
            <select
              value={layerOp}
              onChange={(e) => setLayerOp(e.target.value as LayerAction['op'])}
              className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm"
            >
              {LAYER_OPS.map(op => (
                <option key={op.value} value={op.value}>{op.label}</option>
              ))}
            </select>
            <p className="text-xs text-muted-foreground">
              {LAYER_OPS.find(op => op.value === layerOp)?.description}
            </p>
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Target Layer</label>
            {layerNames.length > 0 ? (
              <select
                value={layerTarget}
                onChange={(e) => setLayerTarget(e.target.value)}
                className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm"
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
                className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm"
              />
            )}
          </div>
          <button
            type="button"
            onClick={handleLayerActionApply}
            disabled={!layerTarget}
            className="rounded-md bg-primary px-4 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            Apply Layer Action
          </button>
        </div>
      )}

      {/* Reset button */}
      <div className="pt-2 border-t border-border">
        <button
          type="button"
          onClick={handleReset}
          className="rounded-md border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
          title="Reset key to its default (passthrough) value"
        >
          Reset to Default
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Layer tabs
// ---------------------------------------------------------------------------

interface LayerTabsProps {
  layers: Layer[];
  selectedLayer: string;
  onSelectLayer: (name: string) => void;
  onAddLayer: () => void;
}

function LayerTabs({ layers, selectedLayer, onSelectLayer, onAddLayer }: LayerTabsProps) {
  return (
    <div className="flex items-center gap-1 border-b border-border pb-1">
      {layers.map((layer) => (
        <button
          key={layer.name}
          type="button"
          onClick={() => onSelectLayer(layer.name)}
          className={cn(
            'rounded-t-md px-3 py-1.5 text-sm font-medium transition-colors',
            selectedLayer === layer.name
              ? 'bg-primary text-primary-foreground'
              : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
          )}
        >
          {layer.name}
        </button>
      ))}
      <button
        type="button"
        onClick={onAddLayer}
        className="ml-1 rounded-md px-2 py-1.5 text-sm text-muted-foreground hover:bg-accent hover:text-accent-foreground"
        title="Add layer"
      >
        + Add Layer
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Custom layout form
// ---------------------------------------------------------------------------

interface CustomLayoutFormProps {
  onApply: (rows: number, cols: number, thumbKeys: number) => void;
}

function CustomLayoutForm({ onApply }: CustomLayoutFormProps) {
  const [rows, setRows] = useState(3);
  const [cols, setCols] = useState(6);
  const [thumbs, setThumbs] = useState(3);

  return (
    <div className="flex flex-wrap items-end gap-3 rounded-lg border border-border bg-card p-3">
      <div className="space-y-1">
        <label className="text-xs font-medium text-muted-foreground">Rows</label>
        <input
          type="number"
          value={rows}
          onChange={(e) => setRows(Math.max(1, Math.min(6, Number(e.target.value))))}
          className="w-20 rounded-md border border-input bg-background px-2 py-1 text-sm"
          min={1}
          max={6}
        />
      </div>
      <div className="space-y-1">
        <label className="text-xs font-medium text-muted-foreground">Cols per side</label>
        <input
          type="number"
          value={cols}
          onChange={(e) => setCols(Math.max(3, Math.min(10, Number(e.target.value))))}
          className="w-20 rounded-md border border-input bg-background px-2 py-1 text-sm"
          min={3}
          max={10}
        />
      </div>
      <div className="space-y-1">
        <label className="text-xs font-medium text-muted-foreground">Thumb keys per side</label>
        <input
          type="number"
          value={thumbs}
          onChange={(e) => setThumbs(Math.max(1, Math.min(8, Number(e.target.value))))}
          className="w-20 rounded-md border border-input bg-background px-2 py-1 text-sm"
          min={1}
          max={8}
        />
      </div>
      <button
        type="button"
        onClick={() => onApply(rows, cols, thumbs)}
        className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90"
      >
        Apply
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export function ErgoEditor({
  config,
  onChange,
  selectedLayout,
  onLayoutChange,
  selectedLayer: selectedLayerProp,
  onLayerChange,
}: ErgoEditorProps) {
  // Local state
  const [selectedKeyIndex, setSelectedKeyIndex] = useState<number>(-1);
  const [customLayout, setCustomLayout] = useState<ErgoLayoutDef | null>(null);

  // Resolve active layout
  const layout = useMemo<ErgoLayoutDef>(() => {
    if (selectedLayout === 'custom' && customLayout) return customLayout;
    return getErgoLayout(selectedLayout);
  }, [selectedLayout, customLayout]);

  const totalKeys = getTotalKeys(layout);

  // Layer management
  const layers = config.layers;
  const activeLayerName = selectedLayerProp ?? layers[0]?.name ?? 'base';
  const activeLayerIdx = layers.findIndex((l) => l.name === activeLayerName);
  const activeLayer = layers[activeLayerIdx] ?? layers[0];

  // Ensure layer keys array matches total keys
  const layerKeys: KeyAction[] = useMemo(() => {
    const keys = activeLayer?.keys ?? [];
    if (keys.length >= totalKeys) return keys.slice(0, totalKeys);
    return [...keys, ...Array(totalKeys - keys.length).fill('XX')];
  }, [activeLayer, totalKeys]);

  // Physical keyboard listener — select key by defsrc name
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

      const kanataName = CODE_TO_KANATA[e.code];
      if (kanataName) {
        const idx = layout.defaultDefsrc.indexOf(kanataName);
        if (idx >= 0) {
          e.preventDefault();
          setSelectedKeyIndex(idx);
        }
      }
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [layout.defaultDefsrc]);

  // Handlers
  const handleKeyClick = useCallback((idx: number) => {
    setSelectedKeyIndex((prev) => (prev === idx ? -1 : idx));
  }, []);

  const handleLayerSelect = useCallback(
    (name: string) => {
      setSelectedKeyIndex(-1);
      onLayerChange?.(name);
    },
    [onLayerChange],
  );

  const handleAddLayer = useCallback(() => {
    const name = `layer${layers.length}`;
    const newLayer: Layer = {
      name,
      keys: Array(totalKeys).fill('_'),
    };
    onChange({
      ...config,
      layers: [...config.layers, newLayer],
    });
    onLayerChange?.(name);
  }, [config, onChange, onLayerChange, layers.length, totalKeys]);

  const handleActionChange = useCallback(
    (keyIndex: number, action: KeyAction) => {
      if (!activeLayer) return;
      const newKeys = [...layerKeys];
      newKeys[keyIndex] = action;
      const newLayers = config.layers.map((l) =>
        l.name === activeLayer.name ? { ...l, keys: newKeys } : l,
      );
      onChange({ ...config, layers: newLayers });
    },
    [config, onChange, activeLayer, layerKeys],
  );

  const handleLayoutChange = useCallback(
    (id: string) => {
      setSelectedKeyIndex(-1);
      if (id !== 'custom') {
        setCustomLayout(null);
      }
      onLayoutChange(id);

      // Resize layers to match new key count
      const newLayout = id === 'custom' && customLayout ? customLayout : getErgoLayout(id);
      const newTotal = getTotalKeys(newLayout);
      const newLayers = config.layers.map((layer) => {
        const keys = [...layer.keys];
        if (keys.length < newTotal) {
          return { ...layer, keys: [...keys, ...Array(newTotal - keys.length).fill('XX')] };
        }
        if (keys.length > newTotal) {
          return { ...layer, keys: keys.slice(0, newTotal) };
        }
        return layer;
      });

      onChange({
        ...config,
        defsrc: newLayout.defaultDefsrc,
        layers: newLayers,
      });
    },
    [onLayoutChange, config, onChange, customLayout],
  );

  const handleCustomApply = useCallback(
    (rows: number, cols: number, thumbKeys: number) => {
      const custom = buildCustomLayout(rows, cols, thumbKeys);
      setCustomLayout(custom);
      setSelectedKeyIndex(-1);

      const newTotal = getTotalKeys(custom);
      const newLayers = config.layers.map((layer) => {
        const keys = [...layer.keys];
        if (keys.length < newTotal) {
          return { ...layer, keys: [...keys, ...Array(newTotal - keys.length).fill('XX')] };
        }
        if (keys.length > newTotal) {
          return { ...layer, keys: keys.slice(0, newTotal) };
        }
        return layer;
      });

      onChange({
        ...config,
        defsrc: custom.defaultDefsrc,
        layers: newLayers,
      });
    },
    [config, onChange],
  );

  // Defsrc name for selected key
  const selectedDefsrc = selectedKeyIndex >= 0
    ? (layout.defaultDefsrc[selectedKeyIndex] ?? `k${selectedKeyIndex}`)
    : '';

  return (
    <div className="flex flex-col gap-4">
      {/* Layout selector */}
      <div className="flex flex-wrap items-center gap-3">
        <label className="text-sm font-medium">Layout:</label>
        <select
          value={selectedLayout}
          onChange={(e) => handleLayoutChange(e.target.value)}
          className="rounded-md border border-input bg-background px-3 py-1.5 text-sm"
        >
          {Object.values(ERGO_LAYOUTS).map((l) => (
            <option key={l.id} value={l.id}>
              {l.name} ({getTotalKeys(l)} keys)
            </option>
          ))}
          <option value="custom">Custom</option>
        </select>
        <span className="text-xs text-muted-foreground">{layout.description}</span>
      </div>

      {/* Custom layout form */}
      {selectedLayout === 'custom' && (
        <CustomLayoutForm onApply={handleCustomApply} />
      )}

      {/* Layer tabs */}
      <LayerTabs
        layers={layers}
        selectedLayer={activeLayerName}
        onSelectLayer={handleLayerSelect}
        onAddLayer={handleAddLayer}
      />

      {/* Responsive layout: side-by-side on wide screens */}
      <div className="lg:flex lg:gap-6">
        {/* Keyboard visualization */}
        <div className="flex-1 min-w-0">
          <ErgoKeyboard
            layout={layout}
            layerKeys={layerKeys}
            selectedKeyIndex={selectedKeyIndex >= 0 ? selectedKeyIndex : undefined}
            aliases={config.aliases}
            onKeyClick={handleKeyClick}
          />
        </div>

        {/* Key editor panel — always rendered to prevent layout shift */}
        <div className="mt-4 lg:mt-0 lg:w-80 lg:flex-shrink-0">
          {selectedKeyIndex >= 0 ? (
            <KeyEditorPanel
              keyIndex={selectedKeyIndex}
              defsrcName={selectedDefsrc}
              action={layerKeys[selectedKeyIndex]}
              aliases={config.aliases}
              layers={config.layers}
              onActionChange={handleActionChange}
              onClose={() => setSelectedKeyIndex(-1)}
            />
          ) : (
            <div className="rounded-lg border border-dashed border-border bg-card/50 p-6 text-center">
              <p className="text-sm text-muted-foreground">
                Click a key or press a physical key to edit its action
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
