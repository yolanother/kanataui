import { cn } from "../../lib/utils";
import type { KeyAction, AliasRef, TapHoldAction, MultiAction, LayerAction, MacroAction, Alias } from "../../lib/kanata/types";
import { getKeyLabel, isModifier, MODIFIER_SHORT, resolveActionForDisplay } from "../../lib/kanata/keys";
import { keyActionToString } from "../../lib/kanata/generator";
import { getKeyIcon } from "../../lib/kanata/key-icons";

// ---------------------------------------------------------------------------
// Layer action icons (inline SVGs for compact display)
// ---------------------------------------------------------------------------

function LayerSwitchIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.5}>
      <path d="M3 8h10M10 5l3 3-3 3" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function LayerToggleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.5}>
      <rect x="3" y="5" width="10" height="6" rx="3" />
      <circle cx="10" cy="8" r="2" fill="currentColor" />
    </svg>
  );
}

function LayerHeldIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth={1.5}>
      <rect x="3" y="4" width="10" height="3" rx="1" />
      <rect x="3" y="9" width="10" height="3" rx="1" />
    </svg>
  );
}

const LAYER_ICON_MAP: Record<string, React.FC<{ className?: string }>> = {
  'layer-switch': LayerSwitchIcon,
  'layer-toggle': LayerToggleIcon,
  'layer-while-held': LayerHeldIcon,
};

// ---------------------------------------------------------------------------
// Key action display helpers
// ---------------------------------------------------------------------------

interface ActionDisplay {
  topLabel: string;
  bottomLabel?: string;
  bottomIcon?: React.ReactNode;
  isModified: boolean;
  modChar?: string;
}

function getActionDisplay(action: KeyAction | undefined): ActionDisplay {
  if (action === undefined) {
    return { topLabel: "", isModified: false };
  }

  // Plain key string
  if (typeof action === "string") {
    return {
      topLabel: getKeyLabel(action),
      isModified: false,
    };
  }

  // Alias reference
  if (action.type === "alias-ref") {
    return {
      topLabel: `@${(action as AliasRef).name}`,
      isModified: true,
    };
  }

  // Tap-hold action
  if (action.type === "tap-hold") {
    const th = action as TapHoldAction;
    const tapLabel = typeof th.tapAction === "string" ? getKeyLabel(th.tapAction) : keyActionToString(th.tapAction);
    const holdAction = th.holdAction;
    let holdLabel: string;
    let modChar: string | undefined;
    let bottomIcon: React.ReactNode | undefined;

    if (typeof holdAction === "string") {
      holdLabel = getKeyLabel(holdAction);
      if (isModifier(holdAction)) {
        modChar = MODIFIER_SHORT[holdAction];
      }
    } else if (holdAction.type === 'layer-action') {
      const la = holdAction as LayerAction;
      const Icon = LAYER_ICON_MAP[la.op];
      holdLabel = la.layer;
      bottomIcon = Icon ? <Icon className="h-3 w-3 inline-block mr-0.5" /> : undefined;
    } else {
      holdLabel = keyActionToString(holdAction);
    }

    return {
      topLabel: tapLabel,
      bottomLabel: holdLabel,
      bottomIcon,
      isModified: true,
      modChar,
    };
  }

  // Multi action
  if (action.type === "multi") {
    const multi = action as MultiAction;
    const firstAction = multi.actions[0];
    const topLabel = typeof firstAction === "string" ? getKeyLabel(firstAction) : keyActionToString(firstAction);
    return {
      topLabel,
      bottomLabel: `+${multi.actions.length - 1} more`,
      isModified: true,
    };
  }

  // Layer action
  if (action.type === "layer-action") {
    const la = action as LayerAction;
    const Icon = LAYER_ICON_MAP[la.op];
    return {
      topLabel: la.layer,
      bottomIcon: Icon ? <Icon className="h-3 w-3 inline-block" /> : undefined,
      bottomLabel: la.op === 'layer-switch' ? 'sw' : la.op === 'layer-toggle' ? 'tg' : 'held',
      isModified: true,
    };
  }

  // Macro action
  if (action.type === "macro") {
    const ma = action as MacroAction;
    const firstKey = ma.items.find(item => typeof item === 'string');
    return {
      topLabel: firstKey ? getKeyLabel(firstKey as string) : 'macro',
      bottomLabel: `macro(${ma.items.length})`,
      isModified: true,
    };
  }

  // Generic / fallback
  return {
    topLabel: keyActionToString(action),
    isModified: action.type !== undefined,
  };
}

// ---------------------------------------------------------------------------
// Key style helpers
// ---------------------------------------------------------------------------

type KeyVariant = "normal" | "modified" | "homerow" | "transparent" | "noop" | "layer";

function getKeyVariant(action: KeyAction | undefined): KeyVariant {
  if (action === undefined) return "normal";
  if (typeof action === "string") {
    if (action === "_") return "transparent";
    if (action === "XX") return "noop";
    return "normal";
  }
  if (action.type === "tap-hold") {
    const th = action as TapHoldAction;
    if (typeof th.holdAction === "string" && isModifier(th.holdAction)) {
      return "homerow";
    }
    if (typeof th.holdAction !== "string" && th.holdAction.type === "layer-action") {
      return "layer";
    }
    return "modified";
  }
  if (action.type === "layer-action") return "layer";
  if (action.type === "alias-ref") return "modified";
  return "modified";
}

const variantStyles: Record<KeyVariant, string> = {
  normal:
    "bg-zinc-800 border-zinc-600 text-zinc-100 hover:bg-zinc-700",
  modified:
    "bg-zinc-700 border-zinc-500 text-zinc-100 hover:bg-zinc-600",
  homerow:
    "bg-blue-900/60 border-blue-500/50 text-white hover:bg-blue-900/80",
  transparent:
    "bg-zinc-900/50 border-zinc-700/50 text-zinc-500 hover:bg-zinc-800/50",
  noop:
    "bg-zinc-900/30 border-zinc-700/30 text-zinc-600",
  layer:
    "bg-indigo-900/50 border-indigo-500/40 text-indigo-100 hover:bg-indigo-900/70",
};

/** Per-modifier color overrides for home row mod keys. */
function getModifierStyle(action: KeyAction | undefined): string | null {
  if (action === undefined || typeof action === "string") return null;
  if (action.type !== "tap-hold") return null;
  const th = action as TapHoldAction;
  const hold = th.holdAction;
  if (typeof hold !== "string") return null;

  if (hold === "lmet" || hold === "rmet")
    return "bg-blue-900/60 border-blue-500/50 text-white hover:bg-blue-900/80";
  if (hold === "lalt" || hold === "ralt")
    return "bg-emerald-900/60 border-emerald-500/50 text-white hover:bg-emerald-900/80";
  if (hold === "lctl" || hold === "rctl")
    return "bg-amber-900/60 border-amber-500/50 text-white hover:bg-amber-900/80";
  if (hold === "lsft" || hold === "rsft")
    return "bg-purple-900/60 border-purple-500/50 text-white hover:bg-purple-900/80";

  return null;
}

// ---------------------------------------------------------------------------
// Icon helpers
// ---------------------------------------------------------------------------

/** Resolve the kanata key name to use for icon lookup. */
function getIconKeyName(action: KeyAction | undefined, keyName: string): string {
  if (!action) return keyName;
  if (typeof action === 'string') return action;
  if (action.type === 'tap-hold') {
    const tap = (action as TapHoldAction).tapAction;
    return typeof tap === 'string' ? tap : keyName;
  }
  return keyName;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export interface KeyboardKeyProps {
  /** kanata key name from defsrc. */
  keyName: string;
  /** Current action assigned to this key on the active layer. */
  action?: KeyAction;
  /** Width in key units (1 = standard key). */
  width?: number;
  /** Whether the key is currently selected. */
  selected?: boolean;
  /** Whether the key is in the defsrc set. */
  inDefsrc?: boolean;
  /** Aliases from config for resolving alias-ref actions. */
  aliases?: Alias[];
  /** Called when the key is clicked. */
  onClick?: () => void;
}

/** Unit size in pixels for a single key. */
export const KEY_UNIT = 48;
/** Gap between keys in pixels. */
export const KEY_GAP = 4;

export function KeyboardKey({
  keyName,
  action,
  width = 1,
  selected = false,
  inDefsrc = true,
  aliases,
  onClick,
}: KeyboardKeyProps) {
  const resolvedAction = resolveActionForDisplay(action, aliases ?? []);
  const display = getActionDisplay(resolvedAction);
  const variant = getKeyVariant(resolvedAction);
  const modStyle = getModifierStyle(resolvedAction);
  const pixelWidth = width * KEY_UNIT + (width - 1) * KEY_GAP;

  return (
    <button
      type="button"
      onClick={onClick}
      title={action ? keyActionToString(action) : keyName}
      className={cn(
        "relative flex flex-col items-center justify-center rounded-md border text-center transition-all duration-150 select-none cursor-pointer",
        "focus:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        modStyle ?? variantStyles[variant],
        selected && "ring-2 ring-sky-400 ring-offset-1 ring-offset-zinc-900 z-10 shadow-md",
        !inDefsrc && "opacity-40 cursor-default",
      )}
      style={{
        width: `${pixelWidth}px`,
        height: `${KEY_UNIT}px`,
        minWidth: `${pixelWidth}px`,
      }}
    >
      {/* Modifier badge */}
      {display.modChar && (
        <span className="absolute top-0.5 right-0.5 flex h-4 w-4 items-center justify-center rounded-sm bg-blue-500/20 text-[9px] font-bold text-blue-600 dark:text-blue-400">
          {display.modChar}
        </span>
      )}

      {/* Top label (tap action or key name) */}
      <span
        className={cn(
          "truncate px-0.5 leading-tight font-medium",
          display.bottomLabel || display.bottomIcon ? "text-[10px]" : "text-xs",
        )}
      >
        {(() => {
          const iconKeyName = getIconKeyName(resolvedAction, keyName);
          const Icon = getKeyIcon(iconKeyName);
          if (Icon) {
            return <Icon size={14} strokeWidth={2} />;
          }
          return display.topLabel || getKeyLabel(keyName);
        })()}
      </span>

      {/* Bottom label (hold action) with optional icon */}
      {(display.bottomLabel || display.bottomIcon) && (
        <span className="flex items-center truncate px-0.5 text-[9px] leading-tight text-muted-foreground">
          {display.bottomIcon}
          {display.bottomLabel}
        </span>
      )}
    </button>
  );
}
