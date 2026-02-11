// ============================================================================
// ErgoEditor - Ergonomic split keyboard layout editor
// ============================================================================

import { useState, useCallback, useMemo } from 'react';
import { cn } from '../../lib/utils';
import type {
  KanataConfig,
  KeyAction,
  Layer,
  TapHoldAction,
  TapHoldVariant,
  Alias,
} from '../../lib/kanata/types';
import { KEY_LABELS, getKeyLabel, MODIFIER_KEYS, resolveActionForDisplay } from '../../lib/kanata/keys';
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
  onActionChange: (keyIndex: number, action: KeyAction) => void;
}

const TAP_HOLD_VARIANTS: { value: TapHoldVariant; label: string }[] = [
  { value: 'tap-hold', label: 'tap-hold' },
  { value: 'tap-hold-press', label: 'tap-hold-press' },
  { value: 'tap-hold-release', label: 'tap-hold-release' },
  { value: 'tap-hold-press-timeout', label: 'tap-hold-press-timeout' },
  { value: 'tap-hold-release-timeout', label: 'tap-hold-release-timeout' },
  { value: 'tap-hold-release-keys', label: 'tap-hold-release-keys' },
];

/** All key name options for the dropdown. */
const KEY_OPTIONS = Object.entries(KEY_LABELS).map(([name, label]) => ({
  value: name,
  label: `${label} (${name})`,
}));

function KeyEditorPanel({ keyIndex, defsrcName, action, aliases, onActionChange }: KeyEditorPanelProps) {
  // Resolve alias-ref to underlying action for display
  const resolved = resolveActionForDisplay(action, aliases ?? []);
  // Determine current tap/hold values
  const isTapHold = resolved && typeof resolved !== 'string' && resolved.type === 'tap-hold';
  const tapHold = isTapHold ? (resolved as TapHoldAction) : null;

  const tapValue = tapHold
    ? (typeof tapHold.tapAction === 'string' ? tapHold.tapAction : '')
    : (typeof resolved === 'string' ? resolved : '');

  const holdValue = tapHold
    ? (typeof tapHold.holdAction === 'string' ? tapHold.holdAction : '')
    : '';

  const variant = tapHold?.variant ?? 'tap-hold';
  const tapTimeout = tapHold ? String(tapHold.tapTimeout) : '200';
  const holdTimeout = tapHold ? String(tapHold.holdTimeout) : '150';

  const handleTapChange = (newTap: string) => {
    if (holdValue) {
      const th: TapHoldAction = {
        type: 'tap-hold',
        variant,
        tapTimeout: Number(tapTimeout) || 200,
        holdTimeout: Number(holdTimeout) || 150,
        tapAction: newTap,
        holdAction: holdValue,
      };
      onActionChange(keyIndex, th);
    } else {
      onActionChange(keyIndex, newTap);
    }
  };

  const handleHoldChange = (newHold: string) => {
    if (newHold) {
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

  return (
    <div className="space-y-4 rounded-lg border border-border bg-card p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">
          Edit Key: <span className="text-primary">{getKeyLabel(defsrcName)}</span>
        </h3>
        <span className="text-xs text-muted-foreground">Index {keyIndex}</span>
      </div>

      {/* Tap action */}
      <div className="space-y-1">
        <label className="text-xs font-medium text-muted-foreground">Tap Action</label>
        <select
          value={tapValue}
          onChange={(e) => handleTapChange(e.target.value)}
          className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm"
        >
          <option value="">-- select --</option>
          {KEY_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      {/* Hold action */}
      <div className="space-y-1">
        <label className="text-xs font-medium text-muted-foreground">Hold Action (modifier)</label>
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
          <optgroup label="Layer actions">
            <option value="__layer_switch__">Layer switch...</option>
            <option value="__layer_toggle__">Layer toggle...</option>
          </optgroup>
        </select>
      </div>

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

      {/* Keyboard visualization */}
      <ErgoKeyboard
        layout={layout}
        layerKeys={layerKeys}
        selectedKeyIndex={selectedKeyIndex >= 0 ? selectedKeyIndex : undefined}
        aliases={config.aliases}
        onKeyClick={handleKeyClick}
      />

      {/* Key editor panel */}
      {selectedKeyIndex >= 0 && (
        <KeyEditorPanel
          keyIndex={selectedKeyIndex}
          defsrcName={selectedDefsrc}
          action={layerKeys[selectedKeyIndex]}
          aliases={config.aliases}
          onActionChange={handleActionChange}
        />
      )}
    </div>
  );
}
