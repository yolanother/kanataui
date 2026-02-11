import { cn } from "../../lib/utils";
import type { KeyAction, AliasRef, TapHoldAction, MultiAction, Alias } from "../../lib/kanata/types";
import { getKeyLabel, isModifier, MODIFIER_SHORT, resolveActionForDisplay } from "../../lib/kanata/keys";
import { keyActionToString } from "../../lib/kanata/generator";

// ---------------------------------------------------------------------------
// Key action display helpers
// ---------------------------------------------------------------------------

interface ActionDisplay {
  topLabel: string;
  bottomLabel?: string;
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

    if (typeof holdAction === "string") {
      holdLabel = getKeyLabel(holdAction);
      if (isModifier(holdAction)) {
        modChar = MODIFIER_SHORT[holdAction];
      }
    } else {
      holdLabel = keyActionToString(holdAction);
    }

    return {
      topLabel: tapLabel,
      bottomLabel: holdLabel,
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
    return {
      topLabel: action.layer,
      bottomLabel: action.op.replace("layer-", ""),
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

type KeyVariant = "normal" | "modified" | "homerow" | "transparent" | "noop";

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
    return "modified";
  }
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
          display.bottomLabel ? "text-[10px]" : "text-xs",
        )}
      >
        {display.topLabel || getKeyLabel(keyName)}
      </span>

      {/* Bottom label (hold action) */}
      {display.bottomLabel && (
        <span className="truncate px-0.5 text-[9px] leading-tight text-muted-foreground">
          {display.bottomLabel}
        </span>
      )}
    </button>
  );
}
