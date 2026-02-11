// ============================================================================
// Kanata Configuration Types
// ============================================================================

/** Top-level representation of a parsed .kbd configuration file. */
export interface KanataConfig {
  defcfg: Record<string, string | SExp>;
  defsrc: string[];
  layers: Layer[];
  aliases: Alias[];
  variables: Variable[];
  fakekeys: FakeKey[];
}

/** A single layer definition (deflayer). */
export interface Layer {
  name: string;
  keys: KeyAction[];
}

/** A variable definition from defvar. */
export interface Variable {
  name: string;
  value: string | SExp;
}

/** An alias definition from defalias. */
export interface Alias {
  name: string;
  action: KeyAction;
}

/** A fake key definition from deffakekeys. */
export interface FakeKey {
  name: string;
  action: KeyAction;
}

// ---------------------------------------------------------------------------
// Key actions
// ---------------------------------------------------------------------------

/**
 * A key action can be a plain key name, a transparent marker, a no-op,
 * an alias reference, or a complex action (tap-hold, multi, layer-switch, etc.).
 */
export type KeyAction =
  | string
  | AliasRef
  | TapHoldAction
  | MultiAction
  | LayerAction
  | OneShotAction
  | TapDanceAction
  | MacroAction
  | FakeKeyOpAction
  | GenericAction;

/** Reference to an alias (@name). */
export interface AliasRef {
  type: 'alias-ref';
  name: string;
}

/**
 * All tap-hold variants.
 *
 * Kanata supports these forms:
 *   (tap-hold           <tap-timeout> <hold-timeout> <tap> <hold>)
 *   (tap-hold-press     <tap-timeout> <hold-timeout> <tap> <hold>)
 *   (tap-hold-release   <tap-timeout> <hold-timeout> <tap> <hold>)
 *   (tap-hold-press-timeout   <tap-timeout> <hold-timeout> <tap> <hold> <timeout-action>)
 *   (tap-hold-release-timeout <tap-timeout> <hold-timeout> <tap> <hold> <timeout-action> [reset-timeout-on-press])
 *   (tap-hold-release-keys    <tap-timeout> <hold-timeout> <tap> <hold> <keys>)
 *   (tap-hold-except-keys     <tap-timeout> <hold-timeout> <tap> <hold> <keys>)
 *   (tap-hold-tap-keys        <tap-timeout> <hold-timeout> <tap> <hold> <keys>)
 *   (tap-hold-release-tap-keys-release <tap-timeout> <hold-timeout> <tap> <hold> <keys> <tap-keys>)
 */
export type TapHoldVariant =
  | 'tap-hold'
  | 'tap-hold-press'
  | 'tap-hold-release'
  | 'tap-hold-press-timeout'
  | 'tap-hold-release-timeout'
  | 'tap-hold-release-keys'
  | 'tap-hold-except-keys'
  | 'tap-hold-tap-keys'
  | 'tap-hold-release-tap-keys-release';

export interface TapHoldAction {
  type: 'tap-hold';
  variant: TapHoldVariant;
  tapTimeout: number | string;   // number or $variable reference
  holdTimeout: number | string;
  tapAction: KeyAction;
  holdAction: KeyAction;
  timeoutAction?: KeyAction;     // for -timeout variants
  extraKeys?: SExp;              // for -keys variants
  tapKeys?: SExp;                // for release-tap-keys-release
}

/** (multi <action> <action> ...) */
export interface MultiAction {
  type: 'multi';
  actions: KeyAction[];
}

/** Layer-related actions: layer-switch, layer-toggle, layer-while-held */
export interface LayerAction {
  type: 'layer-action';
  op: 'layer-switch' | 'layer-toggle' | 'layer-while-held';
  layer: string;
}

/** (one-shot <timeout> <action>) and its variants */
export interface OneShotAction {
  type: 'one-shot';
  variant: 'one-shot' | 'one-shot-press' | 'one-shot-release' | 'one-shot-press-pcancel' | 'one-shot-release-pcancel';
  timeout: number;
  action: KeyAction;
}

/** (tap-dance <timeout> (<action> ...)) */
export interface TapDanceAction {
  type: 'tap-dance';
  variant: 'tap-dance' | 'tap-dance-eager';
  timeout: number;
  actions: KeyAction[];
}

/** (macro ...) and its variants */
export interface MacroAction {
  type: 'macro';
  variant: string;
  items: (KeyAction | number)[];
}

/** (on-press-fakekey <name> <op>) and similar */
export interface FakeKeyOpAction {
  type: 'fakekey-op';
  variant: string;
  name: string;
  op: string;
  delay?: number;
}

/**
 * Generic / fallthrough action for any S-expression action we don't
 * specifically destructure. Preserves the raw S-expression so round-tripping
 * is lossless.
 */
export interface GenericAction {
  type: 'generic';
  sexp: SExp;
}

// ---------------------------------------------------------------------------
// S-Expression AST
// ---------------------------------------------------------------------------

/** An atom in the S-expression tree. */
export interface SAtom {
  type: 'atom';
  value: string;
}

/** A list in the S-expression tree. */
export interface SList {
  type: 'list';
  items: SExp[];
}

export type SExp = SAtom | SList;

// ---------------------------------------------------------------------------
// Home Row Mod configuration helpers
// ---------------------------------------------------------------------------

export type ModifierOrder = 'GACS' | 'CAGS';

export type HandSide = 'left' | 'right';

export interface HomeRowModConfig {
  tapTime: number;
  holdTime: number;
  modifierOrder: ModifierOrder;
  variant: 'basic' | 'advanced';
}

/** Physical key layout metadata for a single key. */
export interface KeyDef {
  /** The kanata key name (e.g. "a", "lsft", "spc"). */
  name: string;
  /** Human-readable display label. */
  label: string;
  /** Row index (0 = top row). */
  row: number;
  /** Column index within the row. */
  col: number;
  /** Width in units (1 = standard key). */
  width: number;
}
