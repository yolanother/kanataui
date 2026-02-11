// ============================================================================
// PreviewTab - Read-only keyboard preview with key inspector and simulation
// ============================================================================

import { useState, useMemo, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { useConfigStore } from '../../lib/config-state';
import { KeyboardLayout } from '../keyboard/KeyboardLayout';
import { ErgoKeyboard } from '../keyboard/ErgoKeyboard';
import { getErgoLayout } from '../../lib/kanata/ergo-layouts';
import { generateConfig } from '../../lib/kanata/generator';
import { KeyInspector } from './KeyInspector';
import { SimulationBuilder } from './SimulationBuilder';
import { SimulationTimeline } from './SimulationTimeline';
import type { KeyAction } from '../../lib/kanata/types';

export function PreviewTab() {
  const { currentConfig, selectedLayout } = useConfigStore();
  const [selectedLayer, setSelectedLayer] = useState<string>('');
  const [selectedKeyName, setSelectedKeyName] = useState<string | null>(null);
  const [selectedKeyAction, setSelectedKeyAction] = useState<KeyAction | undefined>(undefined);
  const [simOutput, setSimOutput] = useState('');
  const [validating, setValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<{ ok: boolean; message: string } | null>(null);

  const isErgo = selectedLayout !== 'qwerty';
  const layers = currentConfig.layers;
  const activeLayerName = selectedLayer || (layers[0]?.name ?? 'base');
  const activeLayer = layers.find((l) => l.name === activeLayerName) ?? layers[0];

  // QWERTY mode: build defsrc set and layerActions map
  const defsrcSet = useMemo(() => new Set(currentConfig.defsrc), [currentConfig.defsrc]);
  const layerActionsMap = useMemo(() => {
    if (!activeLayer) return new Map<string, KeyAction>();
    const map = new Map<string, KeyAction>();
    activeLayer.keys.forEach((action, i) => {
      const keyName = currentConfig.defsrc[i];
      if (keyName) map.set(keyName, action);
    });
    return map;
  }, [activeLayer, currentConfig.defsrc]);

  // Ergo mode helpers
  const ergoLayout = useMemo(
    () => (isErgo ? getErgoLayout(selectedLayout) : null),
    [isErgo, selectedLayout],
  );
  const [selectedErgoIndex, setSelectedErgoIndex] = useState<number>(-1);

  const handleQwertyKeySelect = useCallback(
    (keyName: string) => {
      setSelectedKeyName(keyName);
      setSelectedKeyAction(layerActionsMap.get(keyName));
      setSelectedErgoIndex(-1);
    },
    [layerActionsMap],
  );

  const handleErgoKeyClick = useCallback(
    (keyIndex: number) => {
      const defsrcName = ergoLayout?.defaultDefsrc[keyIndex] ?? `k${keyIndex}`;
      setSelectedKeyName(defsrcName);
      setSelectedKeyAction(activeLayer?.keys[keyIndex]);
      setSelectedErgoIndex(keyIndex);
    },
    [ergoLayout, activeLayer],
  );

  const handleValidate = useCallback(async () => {
    setValidating(true);
    setValidationResult(null);
    try {
      const configText = generateConfig(currentConfig);
      await invoke('validate_config', { configText });
      setValidationResult({ ok: true, message: 'Configuration is valid.' });
    } catch (e) {
      setValidationResult({ ok: false, message: String(e) });
    } finally {
      setValidating(false);
    }
  }, [currentConfig]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-base font-semibold">Preview &amp; Test</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Inspect key actions and test your configuration with simulated input.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleValidate}
            disabled={validating}
            className="rounded-md border border-border px-3 py-1.5 text-xs font-medium hover:bg-muted transition-colors disabled:opacity-50"
          >
            {validating ? 'Validating...' : 'Validate Config'}
          </button>
        </div>
      </div>

      {/* Validation result */}
      {validationResult && (
        <div
          className={`rounded-lg border p-3 text-xs ${
            validationResult.ok
              ? 'border-green-300 dark:border-green-800 bg-green-50 dark:bg-green-950 text-green-700 dark:text-green-300'
              : 'border-red-300 dark:border-red-800 bg-red-50 dark:bg-red-950 text-red-700 dark:text-red-300'
          }`}
        >
          {validationResult.ok ? (
            <span>Configuration is valid.</span>
          ) : (
            <pre className="whitespace-pre-wrap break-all">{validationResult.message}</pre>
          )}
        </div>
      )}

      {/* Layer selector */}
      {layers.length > 1 && (
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-muted-foreground">Layer:</span>
          <div className="flex gap-1">
            {layers.map((layer) => (
              <button
                key={layer.name}
                type="button"
                onClick={() => {
                  setSelectedLayer(layer.name);
                  setSelectedKeyName(null);
                  setSelectedKeyAction(undefined);
                  setSelectedErgoIndex(-1);
                }}
                className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                  activeLayerName === layer.name
                    ? 'bg-primary text-primary-foreground'
                    : 'border border-border hover:bg-muted'
                }`}
              >
                {layer.name}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Keyboard */}
      <div className="flex justify-center overflow-auto rounded-lg border border-border bg-card p-4">
        {isErgo && ergoLayout ? (
          <ErgoKeyboard
            layout={ergoLayout}
            layerKeys={activeLayer?.keys ?? []}
            selectedKeyIndex={selectedErgoIndex >= 0 ? selectedErgoIndex : undefined}
            aliases={currentConfig.aliases}
            onKeyClick={handleErgoKeyClick}
          />
        ) : (
          <KeyboardLayout
            defsrc={defsrcSet}
            layerActions={layerActionsMap}
            selectedKey={selectedKeyName}
            aliases={currentConfig.aliases}
            onKeySelect={handleQwertyKeySelect}
          />
        )}
      </div>

      {/* Inspector + Simulation side by side */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div>
          <h3 className="mb-2 text-sm font-medium">Key Inspector</h3>
          <KeyInspector
            keyName={selectedKeyName ?? ''}
            action={selectedKeyAction}
            aliases={currentConfig.aliases}
          />
        </div>

        <div className="space-y-4">
          <SimulationBuilder
            config={currentConfig}
            onSimResult={setSimOutput}
            onKeyNeeded={() => {}}
            lastClickedKey={selectedKeyName}
          />
          <SimulationTimeline output={simOutput} />
        </div>
      </div>
    </div>
  );
}
