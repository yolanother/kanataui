// ============================================================================
// SetupWizard - Multi-step quick setup wizard
// ============================================================================

import { useState, useMemo } from 'react';
import { cn } from '../../lib/utils';
import type { KanataConfig, HomeRowModConfig, KeyAction } from '../../lib/kanata/types';
import type { LayoutType } from '../../lib/config-state';
import {
  basicHomeRowMods,
  advancedHomeRowMods,
  basicHomeRowModsCAGS,
  advancedHomeRowModsCAGS,
  miryokuPreset,
} from '../../lib/kanata/presets';
import { FULL_QWERTY_DEFSRC } from '../../lib/kanata/keys';
import { generateConfig } from '../../lib/kanata/generator';
import {
  ERGO_LAYOUTS,
  getErgoLayout,
  type ErgoLayoutDef,
} from '../../lib/kanata/ergo-layouts';
import { QwertyEditor } from '../keyboard/QwertyEditor';
import { ErgoEditor } from '../keyboard/ErgoEditor';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type KeyboardChoice = 'qwerty' | 'ergo';
type ErgoPreset = 'corne' | 'lily58' | 'moonlander' | 'kinesis';
type ModPreset = 'basic-gacs' | 'advanced-gacs' | 'basic-cags' | 'advanced-cags' | 'miryoku' | 'none';

export interface WizardResult {
  config: KanataConfig;
  layout: LayoutType;
}

export interface SetupWizardProps {
  onComplete: (result: WizardResult) => void;
  onCancel?: () => void;
}

// ---------------------------------------------------------------------------
// Step indicator
// ---------------------------------------------------------------------------

const STEP_LABELS = ['Keyboard', 'Preset', 'Timing', 'Preview'];

function StepIndicator({ current }: { current: number }) {
  return (
    <div className="flex items-center gap-2 mb-6">
      {STEP_LABELS.map((label, i) => {
        const step = i + 1;
        const isActive = step === current;
        const isDone = step < current;
        return (
          <div key={label} className="flex items-center gap-2">
            <div
              className={cn(
                'flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium transition-colors',
                isActive && 'bg-primary text-primary-foreground ring-2 ring-ring ring-offset-2 ring-offset-background',
                isDone && 'bg-primary text-primary-foreground',
                !isActive && !isDone && 'bg-muted text-muted-foreground',
              )}
            >
              {isDone ? (
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              ) : (
                step
              )}
            </div>
            <span
              className={cn(
                'text-xs font-medium',
                isActive || isDone ? 'text-foreground' : 'text-muted-foreground',
              )}
            >
              {label}
            </span>
            {i < STEP_LABELS.length - 1 && (
              <div
                className={cn(
                  'h-0.5 w-8 transition-colors',
                  step < current ? 'bg-primary/50' : 'bg-muted',
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Selection card
// ---------------------------------------------------------------------------

function SelectionCard({
  title,
  description,
  selected,
  onClick,
  badge,
  icon,
}: {
  title: string;
  description: string;
  selected: boolean;
  onClick: () => void;
  badge?: string;
  icon?: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'relative flex flex-col gap-1.5 rounded-lg border-2 p-4 text-left transition-all',
        selected
          ? 'border-primary bg-primary/5'
          : 'border-border hover:border-primary/40 hover:bg-accent/50',
      )}
    >
      {badge && (
        <span className="absolute top-2 right-2 rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-semibold text-primary">
          {badge}
        </span>
      )}
      <div className="flex items-center gap-2">
        {icon}
        <span className="text-sm font-semibold">{title}</span>
      </div>
      <p className="text-xs text-muted-foreground leading-relaxed">{description}</p>
    </button>
  );
}

// ---------------------------------------------------------------------------
// Config builder
// ---------------------------------------------------------------------------

function buildConfig(
  keyboard: KeyboardChoice,
  ergoPreset: ErgoPreset,
  modPreset: ModPreset,
  tapTime: number,
  holdTime: number,
): KanataConfig {
  const opts: Partial<HomeRowModConfig> = { tapTime, holdTime };

  // Miryoku is ergo-only
  if (keyboard === 'ergo' && modPreset === 'miryoku') {
    const layout = getErgoLayout(ergoPreset);
    return miryokuPreset(layout.defaultDefsrc, opts);
  }

  // None preset: passthrough config
  if (modPreset === 'none') {
    const defsrc =
      keyboard === 'ergo'
        ? getErgoLayout(ergoPreset).defaultDefsrc
        : FULL_QWERTY_DEFSRC;
    return {
      defcfg: { 'process-unmapped-keys': 'yes' },
      defsrc,
      layers: [{ name: 'base', keys: defsrc.map((k) => k) }],
      aliases: [],
      variables: [],
      fakekeys: [],
    };
  }

  // Standard home row mod presets
  let config: KanataConfig;
  switch (modPreset) {
    case 'basic-gacs':
      config = basicHomeRowMods(opts);
      break;
    case 'advanced-gacs':
      config = advancedHomeRowMods(opts);
      break;
    case 'basic-cags':
      config = basicHomeRowModsCAGS(opts);
      break;
    case 'advanced-cags':
      config = advancedHomeRowModsCAGS(opts);
      break;
    default:
      config = basicHomeRowMods(opts);
  }

  // The presets produce home-row-only defsrc. Expand to the full layout.
  const targetDefsrc =
    keyboard === 'ergo'
      ? getErgoLayout(ergoPreset).defaultDefsrc
      : FULL_QWERTY_DEFSRC;

  const aliasMap = new Map<string, number>();
  config.defsrc.forEach((key, i) => aliasMap.set(key, i));

  const newLayers = config.layers.map((layer) => {
    const newKeys: KeyAction[] = targetDefsrc.map((key) => {
      const idx = aliasMap.get(key);
      if (idx !== undefined) {
        return layer.keys[idx];
      }
      return key;
    });
    return { ...layer, keys: newKeys };
  });

  return {
    ...config,
    defsrc: targetDefsrc,
    layers: newLayers,
  };
}

// ---------------------------------------------------------------------------
// Step 1: Keyboard Layout
// ---------------------------------------------------------------------------

function StepKeyboard({
  keyboard,
  ergoPreset,
  onKeyboardChange,
  onErgoPresetChange,
}: {
  keyboard: KeyboardChoice;
  ergoPreset: ErgoPreset;
  onKeyboardChange: (v: KeyboardChoice) => void;
  onErgoPresetChange: (v: ErgoPreset) => void;
}) {
  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-base font-semibold">Choose Your Keyboard Layout</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Select the type of keyboard you use.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <SelectionCard
          title="Standard QWERTY"
          description="Full-size or TKL keyboard with standard ANSI layout. Works with any regular keyboard."
          selected={keyboard === 'qwerty'}
          onClick={() => onKeyboardChange('qwerty')}
          icon={
            <svg className="h-5 w-5 flex-shrink-0 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <rect x="2" y="6" width="20" height="12" rx="2" />
              <line x1="6" y1="10" x2="8" y2="10" />
              <line x1="10" y1="10" x2="12" y2="10" />
              <line x1="14" y1="10" x2="16" y2="10" />
              <line x1="7" y1="14" x2="17" y2="14" />
            </svg>
          }
        />
        <SelectionCard
          title="Ergonomic Split"
          description="Split ergonomic keyboard with column stagger and thumb clusters (Corne, Lily58, Moonlander)."
          selected={keyboard === 'ergo'}
          onClick={() => onKeyboardChange('ergo')}
          icon={
            <svg className="h-5 w-5 flex-shrink-0 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <rect x="1" y="7" width="9" height="10" rx="1.5" />
              <rect x="14" y="7" width="9" height="10" rx="1.5" />
            </svg>
          }
        />
      </div>

      {keyboard === 'ergo' && (
        <div className="space-y-2 pt-1">
          <label className="text-sm font-medium">Ergonomic Keyboard Preset</label>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            {(Object.values(ERGO_LAYOUTS) as ErgoLayoutDef[]).map((layout) => (
              <SelectionCard
                key={layout.id}
                title={layout.name}
                description={layout.description}
                selected={ergoPreset === layout.id}
                onClick={() => onErgoPresetChange(layout.id as ErgoPreset)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Step 2: Home Row Mod Preset
// ---------------------------------------------------------------------------

function StepPreset({
  keyboard,
  preset,
  onPresetChange,
}: {
  keyboard: KeyboardChoice;
  preset: ModPreset;
  onPresetChange: (v: ModPreset) => void;
}) {
  const presets: Array<{ id: ModPreset; title: string; description: string; badge?: string }> = [
    {
      id: 'basic-gacs',
      title: 'Basic GACS',
      description: 'Simple tap-hold. GUI on A/;, Alt on S/L, Ctrl on D/K, Shift on F/J. Best for beginners.',
    },
    {
      id: 'advanced-gacs',
      title: 'Advanced GACS',
      description: 'Anti-misfire protection. Disables mods during fast typing. Recommended for daily use.',
      badge: 'Recommended',
    },
    {
      id: 'basic-cags',
      title: 'Basic CAGS',
      description: 'Alternative order: Ctrl on A/;, Alt on S/L, GUI on D/K, Shift on F/J.',
    },
    {
      id: 'advanced-cags',
      title: 'Advanced CAGS',
      description: 'CAGS order with anti-misfire protection.',
    },
  ];

  if (keyboard === 'ergo') {
    presets.push({
      id: 'miryoku',
      title: 'Miryoku',
      description: 'Ergonomic-optimized layout with home row mods and thumb key assignments for Space, Enter, Backspace, and more.',
      badge: 'Ergo',
    });
  }

  presets.push({
    id: 'none',
    title: 'None',
    description: 'No home row mods. Start with a blank layout and configure manually.',
  });

  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-base font-semibold">Choose a Home Row Mod Preset</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Home row mods let you use home row keys as modifiers when held. Pick a preset to get started.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {presets.map((p) => (
          <SelectionCard
            key={p.id}
            title={p.title}
            description={p.description}
            selected={preset === p.id}
            onClick={() => onPresetChange(p.id)}
            badge={p.badge}
          />
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Step 3: Timing
// ---------------------------------------------------------------------------

function StepTiming({
  tapTime,
  holdTime,
  onTapTimeChange,
  onHoldTimeChange,
}: {
  tapTime: number;
  holdTime: number;
  onTapTimeChange: (v: number) => void;
  onHoldTimeChange: (v: number) => void;
}) {
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-base font-semibold">Adjust Timing</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Fine-tune how responsive the tap-hold behavior feels. These values can be changed later.
        </p>
      </div>

      <div className="rounded-lg border border-border bg-card p-5 space-y-6">
        {/* Tap time */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium">Tap Time</label>
            <div className="flex items-center gap-2">
              <span className="text-sm font-mono font-semibold">{tapTime}ms</span>
              {tapTime === 200 && (
                <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-semibold text-primary">
                  Recommended
                </span>
              )}
            </div>
          </div>
          <input
            type="range"
            min={100}
            max={400}
            step={10}
            value={tapTime}
            onChange={(e) => onTapTimeChange(Number(e.target.value))}
            className="w-full accent-primary"
          />
          <div className="flex justify-between text-[10px] text-muted-foreground">
            <span>100ms (fast)</span>
            <span>400ms (slow)</span>
          </div>
          <p className="text-xs text-muted-foreground">
            How fast you must release a key for it to register as a tap instead of a hold.
          </p>
        </div>

        {/* Hold time */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium">Hold Time</label>
            <div className="flex items-center gap-2">
              <span className="text-sm font-mono font-semibold">{holdTime}ms</span>
              {holdTime === 150 && (
                <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[10px] font-semibold text-primary">
                  Recommended
                </span>
              )}
            </div>
          </div>
          <input
            type="range"
            min={100}
            max={400}
            step={10}
            value={holdTime}
            onChange={(e) => onHoldTimeChange(Number(e.target.value))}
            className="w-full accent-primary"
          />
          <div className="flex justify-between text-[10px] text-muted-foreground">
            <span>100ms (sensitive)</span>
            <span>400ms (deliberate)</span>
          </div>
          <p className="text-xs text-muted-foreground">
            How long you must hold a key before it activates as a modifier.
          </p>
        </div>
      </div>

      <div className="rounded-md bg-muted/50 p-3 text-xs text-muted-foreground">
        <strong>Tip:</strong> Start with the defaults (200ms tap / 150ms hold) and adjust after a few days of use.
        If you get accidental holds, increase hold time. If mods feel sluggish, decrease tap time.
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Step 4: Preview & Apply
// ---------------------------------------------------------------------------

function StepPreview({
  config,
  keyboard,
  ergoPreset,
}: {
  config: KanataConfig;
  keyboard: KeyboardChoice;
  ergoPreset: ErgoPreset;
}) {
  const [showRaw, setShowRaw] = useState(false);
  const [previewLayer, setPreviewLayer] = useState('base');
  const configText = useMemo(() => generateConfig(config), [config]);

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-base font-semibold">Preview Your Configuration</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          Review the generated configuration below, then click "Apply" to use it.
        </p>
      </div>

      {/* Visual preview */}
      <div className="overflow-x-auto rounded-lg border border-border p-4">
        {keyboard === 'qwerty' ? (
          <QwertyEditor
            config={config}
            onChange={() => {}}
            selectedLayer={previewLayer}
            onLayerChange={setPreviewLayer}
          />
        ) : (
          <ErgoEditor
            config={config}
            onChange={() => {}}
            selectedLayout={ergoPreset}
            onLayoutChange={() => {}}
            selectedLayer={previewLayer}
            onLayerChange={setPreviewLayer}
          />
        )}
      </div>

      {/* Toggle raw config */}
      <div>
        <button
          type="button"
          onClick={() => setShowRaw(!showRaw)}
          className="text-xs font-medium text-primary hover:underline"
        >
          {showRaw ? 'Hide' : 'Show'} raw .kbd config
        </button>
        {showRaw && (
          <pre className="mt-2 max-h-64 overflow-auto rounded-md bg-zinc-950 border border-border p-4 text-xs font-mono text-zinc-300 whitespace-pre leading-relaxed">
            {configText}
          </pre>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main wizard
// ---------------------------------------------------------------------------

export function SetupWizard({ onComplete, onCancel }: SetupWizardProps) {
  const [step, setStep] = useState(1);
  const [keyboard, setKeyboard] = useState<KeyboardChoice>('qwerty');
  const [ergoPreset, setErgoPreset] = useState<ErgoPreset>('corne');
  const [modPreset, setModPreset] = useState<ModPreset>('advanced-gacs');
  const [tapTime, setTapTime] = useState(200);
  const [holdTime, setHoldTime] = useState(150);

  const totalSteps = 4;

  // When switching keyboard type, reset mod preset if miryoku on non-ergo
  const handleKeyboardChange = (v: KeyboardChoice) => {
    setKeyboard(v);
    if (v === 'qwerty' && modPreset === 'miryoku') {
      setModPreset('advanced-gacs');
    }
  };

  // Generate config based on current selections
  const generatedConfig = useMemo(
    () => buildConfig(keyboard, ergoPreset, modPreset, tapTime, holdTime),
    [keyboard, ergoPreset, modPreset, tapTime, holdTime],
  );

  function goNext() {
    // Skip timing step for 'none' preset
    if (step === 2 && modPreset === 'none') {
      setStep(4);
    } else if (step < totalSteps) {
      setStep(step + 1);
    }
  }

  function goBack() {
    // If on preview and preset is 'none', skip back over timing
    if (step === 4 && modPreset === 'none') {
      setStep(2);
    } else if (step > 1) {
      setStep(step - 1);
    }
  }

  function handleApply() {
    const layout: LayoutType = keyboard === 'qwerty' ? 'qwerty' : ergoPreset;
    onComplete({ config: generatedConfig, layout });
  }

  return (
    <div className="mx-auto max-w-3xl">
      <StepIndicator current={step} />

      {/* Step content */}
      <div className="min-h-[320px]">
        {step === 1 && (
          <StepKeyboard
            keyboard={keyboard}
            ergoPreset={ergoPreset}
            onKeyboardChange={handleKeyboardChange}
            onErgoPresetChange={setErgoPreset}
          />
        )}
        {step === 2 && (
          <StepPreset
            keyboard={keyboard}
            preset={modPreset}
            onPresetChange={setModPreset}
          />
        )}
        {step === 3 && (
          <StepTiming
            tapTime={tapTime}
            holdTime={holdTime}
            onTapTimeChange={setTapTime}
            onHoldTimeChange={setHoldTime}
          />
        )}
        {step === 4 && (
          <StepPreview
            config={generatedConfig}
            keyboard={keyboard}
            ergoPreset={ergoPreset}
          />
        )}
      </div>

      {/* Navigation buttons */}
      <div className="mt-6 flex items-center justify-between border-t border-border pt-4">
        <div>
          {onCancel && step === 1 && (
            <button
              type="button"
              onClick={onCancel}
              className="rounded-md px-4 py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Cancel
            </button>
          )}
          {step > 1 && (
            <button
              type="button"
              onClick={goBack}
              className="rounded-md border border-border bg-background px-4 py-2 text-sm font-medium hover:bg-muted transition-colors"
            >
              Back
            </button>
          )}
        </div>
        <div className="flex gap-3">
          {step < totalSteps ? (
            <button
              type="button"
              onClick={goNext}
              className="rounded-md bg-primary px-5 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              Next
            </button>
          ) : (
            <button
              type="button"
              onClick={handleApply}
              className="rounded-md bg-primary px-5 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              Apply Configuration
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
