// ============================================================================
// SimulationBuilder - Build and run key event sequences for simulation
// ============================================================================

import { useState, useCallback } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { generateConfig } from '../../lib/kanata/generator';
import type { KanataConfig } from '../../lib/kanata/types';

interface SimulationBuilderProps {
  config: KanataConfig;
  onSimResult: (output: string) => void;
  onKeyNeeded: () => void;
  lastClickedKey: string | null;
}

interface KeyEvent {
  type: 'press' | 'release' | 'tick';
  key?: string;
  ms?: number;
}

function eventToString(event: KeyEvent): string {
  if (event.type === 'tick') return `tick:${event.ms ?? 50}`;
  return `${event.type}:${event.key}`;
}

function eventsToSimInput(events: KeyEvent[]): string {
  return events.map(eventToString).join('\n');
}

export function SimulationBuilder({
  config,
  onSimResult,
  lastClickedKey,
}: SimulationBuilderProps) {
  const [events, setEvents] = useState<KeyEvent[]>([]);
  const [rawInput, setRawInput] = useState('');
  const [useRaw, setUseRaw] = useState(false);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [defaultTick, setDefaultTick] = useState(50);

  // Add a press+tick or release+tick for the last-clicked key
  const addPress = useCallback((key: string) => {
    setEvents((prev) => [
      ...prev,
      { type: 'press', key },
      { type: 'tick', ms: defaultTick },
    ]);
  }, [defaultTick]);

  const addRelease = useCallback((key: string) => {
    setEvents((prev) => [
      ...prev,
      { type: 'release', key },
      { type: 'tick', ms: defaultTick },
    ]);
  }, [defaultTick]);

  const addTick = useCallback(() => {
    setEvents((prev) => [...prev, { type: 'tick', ms: defaultTick }]);
  }, [defaultTick]);

  const removeEvent = useCallback((index: number) => {
    setEvents((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const clearEvents = useCallback(() => {
    setEvents([]);
    setRawInput('');
    setError(null);
    onSimResult('');
  }, [onSimResult]);

  const runSimulation = useCallback(async () => {
    setRunning(true);
    setError(null);
    try {
      const configText = generateConfig(config);
      const simInput = useRaw ? rawInput : eventsToSimInput(events);
      const result = await invoke<string>('run_simulation', {
        configText,
        simInput,
      });
      onSimResult(result);
    } catch (e) {
      setError(String(e));
      onSimResult('');
    } finally {
      setRunning(false);
    }
  }, [config, events, rawInput, useRaw, onSimResult]);

  const computedInput = useRaw ? rawInput : eventsToSimInput(events);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium">Simulation Input</h3>
        <label className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <input
            type="checkbox"
            checked={useRaw}
            onChange={(e) => setUseRaw(e.target.checked)}
            className="rounded"
          />
          Edit raw text
        </label>
      </div>

      {!useRaw && (
        <div className="space-y-2">
          <div className="flex items-center gap-2 flex-wrap">
            {lastClickedKey && (
              <>
                <button
                  type="button"
                  onClick={() => addPress(lastClickedKey)}
                  className="rounded-md border border-border px-2.5 py-1 text-xs font-medium hover:bg-muted transition-colors"
                >
                  Press {lastClickedKey}
                </button>
                <button
                  type="button"
                  onClick={() => addRelease(lastClickedKey)}
                  className="rounded-md border border-border px-2.5 py-1 text-xs font-medium hover:bg-muted transition-colors"
                >
                  Release {lastClickedKey}
                </button>
              </>
            )}
            <button
              type="button"
              onClick={addTick}
              className="rounded-md border border-border px-2.5 py-1 text-xs font-medium hover:bg-muted transition-colors"
            >
              + Tick
            </button>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <span>Tick ms:</span>
              <input
                type="number"
                value={defaultTick}
                onChange={(e) => setDefaultTick(Math.max(1, parseInt(e.target.value) || 50))}
                className="w-14 rounded border border-border bg-background px-1.5 py-0.5 text-xs"
                min={1}
              />
            </div>
          </div>

          {events.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {events.map((evt, i) => (
                <span
                  key={i}
                  className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-mono cursor-pointer hover:opacity-70 ${
                    evt.type === 'press'
                      ? 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200'
                      : evt.type === 'release'
                        ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                        : 'bg-zinc-100 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-400'
                  }`}
                  onClick={() => removeEvent(i)}
                  title="Click to remove"
                >
                  {eventToString(evt)}
                </span>
              ))}
            </div>
          )}

          {!lastClickedKey && events.length === 0 && (
            <p className="text-xs text-muted-foreground">
              Click a key on the keyboard above, then use Press/Release to add events.
            </p>
          )}
        </div>
      )}

      {useRaw && (
        <textarea
          value={rawInput}
          onChange={(e) => setRawInput(e.target.value)}
          placeholder={"press:a\ntick:50\nrelease:a\ntick:50"}
          className="w-full h-24 rounded-lg border border-border bg-background p-3 text-xs font-mono resize-y"
        />
      )}

      {computedInput && !useRaw && (
        <details className="text-xs">
          <summary className="text-muted-foreground cursor-pointer hover:text-foreground">
            Show raw sim input
          </summary>
          <pre className="mt-1 rounded-lg border border-border bg-zinc-950 dark:bg-zinc-900 p-2 text-zinc-300 whitespace-pre">
            {computedInput}
          </pre>
        </details>
      )}

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={runSimulation}
          disabled={running || (!events.length && !rawInput)}
          className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
        >
          {running ? 'Running...' : 'Run Simulation'}
        </button>
        <button
          type="button"
          onClick={clearEvents}
          className="rounded-md border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
        >
          Clear
        </button>
      </div>

      {error && (
        <div className="rounded-lg border border-red-300 dark:border-red-800 bg-red-50 dark:bg-red-950 p-3 text-xs text-red-700 dark:text-red-300 break-all">
          {error}
        </div>
      )}
    </div>
  );
}
