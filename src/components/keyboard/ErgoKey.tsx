// ============================================================================
// ErgoKey - Individual key component with rotation/offset support
// ============================================================================

import { cn } from '../../lib/utils';
import type { KeyAction, TapHoldAction, LayerAction, Alias } from '../../lib/kanata/types';
import { getKeyLabel, MODIFIER_KEYS, resolveActionForDisplay } from '../../lib/kanata/keys';

// ---------------------------------------------------------------------------
// Layer action icons (inline SVGs)
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

/** Get the hold label and optional icon for display. */
function holdInfo(action: KeyAction | undefined): { label: string | null; icon: React.ReactNode | null } {
  if (!action) return { label: null, icon: null };
  if (typeof action !== 'string' && action.type === 'tap-hold') {
    const hold = action.holdAction;
    if (typeof hold === 'string') return { label: getKeyLabel(hold), icon: null };
    if (hold.type === 'alias-ref') return { label: `@${hold.name}`, icon: null };
    if (hold.type === 'layer-action') {
      const la = hold as LayerAction;
      const Icon = LAYER_ICON_MAP[la.op];
      return { label: la.layer, icon: Icon ? <Icon className="h-3 w-3 inline-block" /> : null };
    }
    return { label: null, icon: null };
  }
  return { label: null, icon: null };
}

/** Get layer action icon for standalone layer actions. */
function layerActionInfo(action: KeyAction | undefined): { icon: React.ReactNode | null; abbr: string | null } {
  if (!action || typeof action === 'string') return { icon: null, abbr: null };
  if (action.type === 'layer-action') {
    const la = action as LayerAction;
    const Icon = LAYER_ICON_MAP[la.op];
    const abbr = la.op === 'layer-switch' ? 'sw' : la.op === 'layer-toggle' ? 'tg' : 'held';
    return { icon: Icon ? <Icon className="h-3 w-3 inline-block" /> : null, abbr };
  }
  return { icon: null, abbr: null };
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

function isLayerAction(action: KeyAction | undefined): boolean {
  if (!action || typeof action === 'string') return false;
  if (action.type === 'layer-action') return true;
  if (action.type === 'tap-hold') {
    const hold = (action as TapHoldAction).holdAction;
    return typeof hold !== 'string' && hold.type === 'layer-action';
  }
  return false;
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
  const holdData = holdInfo(resolvedAction);
  const layerData = layerActionInfo(resolvedAction);
  const modColor = getModifierColor(resolvedAction);
  const isLayer = isLayerAction(resolvedAction);

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
          : isLayer
            ? 'border-indigo-500/40 bg-indigo-500/10'
            : modColor
              ? modColor
              : 'border-border bg-card',
      )}
    >
      {/* Hold label with optional icon */}
      {(holdData.label || holdData.icon) && (
        <span className="flex items-center text-[9px] leading-tight text-muted-foreground">
          {holdData.icon}
          {holdData.label}
        </span>
      )}
      {/* Layer action icon for standalone layer actions */}
      {!holdData.label && layerData.icon && (
        <span className="flex items-center text-[9px] leading-tight text-muted-foreground">
          {layerData.icon}
          {layerData.abbr}
        </span>
      )}
      <span className="font-medium leading-tight truncate max-w-full px-0.5">{tap || defsrcName}</span>
    </button>
  );
}
