// ============================================================================
// ErgoKey - Individual key component with rotation/offset support
// ============================================================================

import { cn } from '../../lib/utils';
import type { KeyAction, TapHoldAction, Alias } from '../../lib/kanata/types';
import { getKeyLabel, MODIFIER_KEYS, resolveActionForDisplay } from '../../lib/kanata/keys';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Resolve the display label for a KeyAction. */
function actionLabel(action: KeyAction | undefined): string {
  if (!action) return '';
  if (typeof action === 'string') return getKeyLabel(action);
  if (action.type === 'alias-ref') return `@${action.name}`;
  if (action.type === 'tap-hold') return actionLabel(action.tapAction);
  if (action.type === 'layer-action') return action.layer;
  if (action.type === 'multi') return actionLabel(action.actions[0]);
  return '...';
}

/** Get the hold modifier label (if tap-hold). */
function holdLabel(action: KeyAction | undefined): string | null {
  if (!action) return null;
  if (typeof action !== 'string' && action.type === 'tap-hold') {
    const hold = action.holdAction;
    if (typeof hold === 'string') return getKeyLabel(hold);
    if (hold.type === 'alias-ref') return `@${hold.name}`;
    return null;
  }
  return null;
}

/** Modifier key name to accent color class. */
const MODIFIER_COLORS: Record<string, string> = {
  lmet: 'border-blue-500/50 bg-blue-500/10',
  rmet: 'border-blue-500/50 bg-blue-500/10',
  lalt: 'border-amber-500/50 bg-amber-500/10',
  ralt: 'border-amber-500/50 bg-amber-500/10',
  lctl: 'border-emerald-500/50 bg-emerald-500/10',
  rctl: 'border-emerald-500/50 bg-emerald-500/10',
  lsft: 'border-rose-500/50 bg-rose-500/10',
  rsft: 'border-rose-500/50 bg-rose-500/10',
};

function getModifierColor(action: KeyAction | undefined): string | null {
  if (!action) return null;
  if (typeof action !== 'string' && action.type === 'tap-hold') {
    const hold = (action as TapHoldAction).holdAction;
    if (typeof hold === 'string' && MODIFIER_KEYS.has(hold)) {
      return MODIFIER_COLORS[hold] ?? null;
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const KEY_SIZE = 48; // 1u in pixels
const KEY_GAP = 4;   // gap between keys

export interface ErgoKeyProps {
  /** Index into the defsrc / layer key arrays. */
  keyIndex: number;
  /** The KeyAction for the current layer (if any). */
  action?: KeyAction;
  /** Key name from defsrc. */
  defsrcName: string;
  /** Visual position. */
  row: number;
  col: number;
  /** Vertical offset from column stagger (key units). */
  offsetY?: number;
  /** Rotation in degrees (for thumb fans). */
  rotation?: number;
  /** Key width in units. */
  width?: number;
  /** Key height in units. */
  height?: number;
  /** Is this key currently selected? */
  selected?: boolean;
  /** Aliases from config for resolving alias-ref actions. */
  aliases?: Alias[];
  /** Click handler. */
  onClick?: () => void;
}

export function ErgoKey({
  action,
  defsrcName,
  row,
  col,
  offsetY = 0,
  rotation = 0,
  width = 1,
  height = 1,
  selected = false,
  aliases,
  onClick,
}: ErgoKeyProps) {
  const resolvedAction = resolveActionForDisplay(action, aliases ?? []);
  const tap = actionLabel(resolvedAction);
  const hold = holdLabel(resolvedAction);
  const modColor = getModifierColor(resolvedAction);

  const w = width * KEY_SIZE + (width - 1) * KEY_GAP;
  const h = height * KEY_SIZE + (height - 1) * KEY_GAP;

  const x = col * (KEY_SIZE + KEY_GAP);
  const y = row * (KEY_SIZE + KEY_GAP) + offsetY * (KEY_SIZE + KEY_GAP);

  const style: React.CSSProperties = {
    position: 'absolute',
    left: x,
    top: y,
    width: w,
    height: h,
    transform: rotation !== 0 ? `rotate(${rotation}deg)` : undefined,
    transformOrigin: 'center center',
  };

  return (
    <button
      type="button"
      onClick={onClick}
      style={style}
      title={defsrcName}
      className={cn(
        'flex flex-col items-center justify-center rounded-md border text-xs transition-colors',
        'hover:border-primary/60 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
        selected
          ? 'border-primary bg-primary/15 ring-1 ring-primary'
          : modColor
            ? modColor
            : 'border-border bg-card',
      )}
    >
      {hold && (
        <span className="text-[9px] leading-tight text-muted-foreground">
          {hold}
        </span>
      )}
      <span className="font-medium leading-tight">{tap || defsrcName}</span>
    </button>
  );
}
