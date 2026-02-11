import { useState, useCallback, useMemo } from "react";
import type { KanataConfig, KeyAction, Layer } from "../../lib/kanata/types";
import { KeyboardLayout } from "./KeyboardLayout";
import { KeyActionEditor } from "./KeyActionEditor";
import { LayerTabs } from "./LayerTabs";

export interface QwertyEditorProps {
  config: KanataConfig;
  onChange: (config: KanataConfig) => void;
  selectedLayer?: string;
  onLayerChange?: (layerName: string) => void;
}

export function QwertyEditor({
  config,
  onChange,
  selectedLayer,
  onLayerChange,
}: QwertyEditorProps) {
  const [selectedKey, setSelectedKey] = useState<string | null>(null);

  // Determine the active layer
  const activeLayerName =
    selectedLayer ?? config.layers[0]?.name ?? "base";
  const activeLayer = config.layers.find((l) => l.name === activeLayerName);

  // Build a set of defsrc keys for quick lookup
  const defsrcSet = useMemo(
    () => new Set(config.defsrc),
    [config.defsrc]
  );

  // Build action map for the active layer
  const layerActions = useMemo(() => {
    const map = new Map<string, KeyAction>();
    if (!activeLayer) return map;
    activeLayer.keys.forEach((action, i) => {
      const keyName = config.defsrc[i];
      if (keyName) {
        map.set(keyName, action);
      }
    });
    return map;
  }, [activeLayer, config.defsrc]);

  // Handle key selection
  const handleKeySelect = useCallback(
    (keyName: string) => {
      if (!defsrcSet.has(keyName)) return;
      setSelectedKey((prev) => (prev === keyName ? null : keyName));
    },
    [defsrcSet]
  );

  // Handle layer change
  const handleLayerChange = useCallback(
    (layerName: string) => {
      setSelectedKey(null);
      onLayerChange?.(layerName);
    },
    [onLayerChange]
  );

  // Handle adding a new layer
  const handleAddLayer = useCallback(() => {
    const layerNames = config.layers.map((l) => l.name);
    let newName = "layer1";
    let counter = 1;
    while (layerNames.includes(newName)) {
      counter++;
      newName = `layer${counter}`;
    }

    const newLayer: Layer = {
      name: newName,
      keys: config.defsrc.map((k) => k),
    };

    onChange({
      ...config,
      layers: [...config.layers, newLayer],
    });
    onLayerChange?.(newName);
  }, [config, onChange, onLayerChange]);

  // Handle key action change from the editor panel
  const handleActionChange = useCallback(
    (keyName: string, newAction: KeyAction) => {
      if (!activeLayer) return;
      const keyIndex = config.defsrc.indexOf(keyName);
      if (keyIndex === -1) return;

      const newKeys = [...activeLayer.keys];
      newKeys[keyIndex] = newAction;

      const newLayers = config.layers.map((l) =>
        l.name === activeLayerName ? { ...l, keys: newKeys } : l
      );

      onChange({ ...config, layers: newLayers });
    },
    [activeLayer, activeLayerName, config, onChange]
  );

  const selectedAction = selectedKey ? layerActions.get(selectedKey) : undefined;

  return (
    <div className="space-y-4">
      {/* Layer tabs */}
      <LayerTabs
        layers={config.layers}
        selectedLayer={activeLayerName}
        onLayerChange={handleLayerChange}
        onAddLayer={handleAddLayer}
      />

      {/* Responsive layout: side-by-side on wide screens */}
      <div className="lg:flex lg:gap-6">
        {/* Keyboard + legend */}
        <div className="flex-1 min-w-0 space-y-4">
          {/* Keyboard visualization */}
          <div className="overflow-x-auto pb-2">
            <KeyboardLayout
              defsrc={defsrcSet}
              layerActions={layerActions}
              selectedKey={selectedKey}
              aliases={config.aliases}
              onKeySelect={handleKeySelect}
            />
          </div>

          {/* Color legend */}
          <div className="flex flex-wrap items-center gap-4 px-1 text-xs text-zinc-500">
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-3 w-3 rounded-sm bg-blue-900/60 border border-blue-500/50" />
              GUI/Super
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-3 w-3 rounded-sm bg-emerald-900/60 border border-emerald-500/50" />
              Alt
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-3 w-3 rounded-sm bg-amber-900/60 border border-amber-500/50" />
              Ctrl
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-3 w-3 rounded-sm bg-purple-900/60 border border-purple-500/50" />
              Shift
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block h-3 w-3 rounded-sm bg-zinc-800 border border-zinc-600" />
              Unmodified
            </span>
          </div>
        </div>

        {/* Key editor panel — side panel on wide screens */}
        {selectedKey && (
          <div className="mt-4 lg:mt-0 lg:w-80 lg:flex-shrink-0">
            <KeyActionEditor
              keyName={selectedKey}
              action={selectedAction}
              aliases={config.aliases}
              onChange={handleActionChange}
              onClose={() => setSelectedKey(null)}
            />
          </div>
        )}
      </div>
    </div>
  );
}
