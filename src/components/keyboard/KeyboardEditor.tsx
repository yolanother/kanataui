import { useState, useMemo, useCallback } from "react";
import { cn } from "../../lib/utils";
import { KeyboardLayout } from "./KeyboardLayout";
import { KeyActionEditor } from "./KeyActionEditor";
import type { KanataConfig, KeyAction, Layer } from "../../lib/kanata/types";
import { basicHomeRowMods } from "../../lib/kanata/presets";

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export interface KeyboardEditorProps {
  /** The kanata config to edit. If not provided, a default preset is used. */
  config?: KanataConfig;
  /** Called when the config is modified. */
  onConfigChange?: (config: KanataConfig) => void;
}

export function KeyboardEditor({
  config: externalConfig,
  onConfigChange,
}: KeyboardEditorProps) {
  // Use external config or fall back to a default preset
  const [internalConfig, setInternalConfig] = useState<KanataConfig>(
    () => externalConfig ?? basicHomeRowMods()
  );
  const config = externalConfig ?? internalConfig;

  const [activeLayerIndex, setActiveLayerIndex] = useState(0);
  const [selectedKey, setSelectedKey] = useState<string | null>(null);

  // Derived state
  const defsrcSet = useMemo(() => new Set(config.defsrc), [config.defsrc]);

  const activeLayer: Layer | undefined = config.layers[activeLayerIndex];

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

  const selectedAction = selectedKey ? layerActions.get(selectedKey) : undefined;

  // Update a single key's action on the active layer
  const handleActionChange = useCallback(
    (keyName: string, newAction: KeyAction) => {
      const keyIndex = config.defsrc.indexOf(keyName);
      if (keyIndex === -1 || !activeLayer) return;

      const newKeys = [...activeLayer.keys];
      newKeys[keyIndex] = newAction;

      const newLayers = config.layers.map((layer, i) =>
        i === activeLayerIndex ? { ...layer, keys: newKeys } : layer
      );

      const newConfig: KanataConfig = { ...config, layers: newLayers };

      if (onConfigChange) {
        onConfigChange(newConfig);
      } else {
        setInternalConfig(newConfig);
      }
    },
    [config, activeLayer, activeLayerIndex, onConfigChange]
  );

  return (
    <div className="flex flex-col gap-4">
      {/* Layer tabs */}
      {config.layers.length > 1 && (
        <div className="flex items-center gap-1">
          <span className="mr-2 text-xs font-medium text-muted-foreground">Layer:</span>
          {config.layers.map((layer, i) => (
            <button
              key={layer.name}
              type="button"
              onClick={() => {
                setActiveLayerIndex(i);
                setSelectedKey(null);
              }}
              className={cn(
                "rounded-md px-3 py-1 text-xs font-medium transition-colors",
                i === activeLayerIndex
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted text-muted-foreground hover:bg-accent hover:text-foreground"
              )}
            >
              {layer.name}
            </button>
          ))}
        </div>
      )}

      {/* Keyboard layout */}
      <div className="overflow-x-auto pb-2">
        <KeyboardLayout
          defsrc={defsrcSet}
          layerActions={layerActions}
          selectedKey={selectedKey}
          onKeySelect={setSelectedKey}
        />
      </div>

      {/* Action editor panel */}
      {selectedKey && (
        <KeyActionEditor
          keyName={selectedKey}
          action={selectedAction}
          onChange={handleActionChange}
          onClose={() => setSelectedKey(null)}
        />
      )}
    </div>
  );
}
