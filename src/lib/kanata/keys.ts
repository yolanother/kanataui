// ============================================================================
// Kanata Key Names, Display Labels, and Physical Layout
// ============================================================================

import type { KeyDef, KeyAction, Alias, TapHoldAction, MultiAction } from './types';

// ---------------------------------------------------------------------------
// Key name -> display label mapping
// ---------------------------------------------------------------------------

/** Map from kanata key name to a human-friendly display label. */
export const KEY_LABELS: Record<string, string> = {
  // Row 0: Number row
  grv: '`',
  1: '1',
  2: '2',
  3: '3',
  4: '4',
  5: '5',
  6: '6',
  7: '7',
  8: '8',
  9: '9',
  0: '0',
  '-': '-',
  '=': '=',
  bspc: 'Bksp',

  // Row 1: QWERTY top row
  tab: 'Tab',
  q: 'Q',
  w: 'W',
  e: 'E',
  r: 'R',
  t: 'T',
  y: 'Y',
  u: 'U',
  i: 'I',
  o: 'O',
  p: 'P',
  '[': '[',
  ']': ']',
  '\\': '\\',

  // Row 2: Home row
  caps: 'Caps',
  a: 'A',
  s: 'S',
  d: 'D',
  f: 'F',
  g: 'G',
  h: 'H',
  j: 'J',
  k: 'K',
  l: 'L',
  ';': ';',
  "'": "'",
  ret: 'Enter',

  // Row 3: Bottom row
  lsft: 'LShift',
  z: 'Z',
  x: 'X',
  c: 'C',
  v: 'V',
  b: 'B',
  n: 'N',
  m: 'M',
  ',': ',',
  '.': '.',
  '/': '/',
  rsft: 'RShift',

  // Row 4: Modifiers / space
  lctl: 'LCtrl',
  lmet: 'Super',
  lalt: 'LAlt',
  spc: 'Space',
  ralt: 'RAlt',
  rmet: 'Super',
  rctl: 'RCtrl',

  // Function keys
  esc: 'Esc',
  f1: 'F1',
  f2: 'F2',
  f3: 'F3',
  f4: 'F4',
  f5: 'F5',
  f6: 'F6',
  f7: 'F7',
  f8: 'F8',
  f9: 'F9',
  f10: 'F10',
  f11: 'F11',
  f12: 'F12',

  // Navigation
  ins: 'Ins',
  del: 'Del',
  home: 'Home',
  end: 'End',
  pgup: 'PgUp',
  pgdn: 'PgDn',
  up: 'Up',
  down: 'Down',
  left: 'Left',
  rght: 'Right',

  // Numpad
  nlk: 'NumLk',
  kp0: 'KP0',
  kp1: 'KP1',
  kp2: 'KP2',
  kp3: 'KP3',
  kp4: 'KP4',
  kp5: 'KP5',
  kp6: 'KP6',
  kp7: 'KP7',
  kp8: 'KP8',
  kp9: 'KP9',

  // Mouse buttons
  mlft: 'LClick',
  mrgt: 'RClick',
  mmid: 'MClick',
  mfwd: 'Fwd',
  mbck: 'Back',

  // Special actions
  _: '_',
  XX: 'XX',
  lrld: 'Reload',
};

// ---------------------------------------------------------------------------
// Modifier keys
// ---------------------------------------------------------------------------

/** Set of all modifier key names in kanata. */
export const MODIFIER_KEYS = new Set([
  'lsft',
  'rsft',
  'lctl',
  'rctl',
  'lalt',
  'ralt',
  'lmet',
  'rmet',
]);

/** Human-readable modifier names keyed by kanata name. */
export const MODIFIER_LABELS: Record<string, string> = {
  lmet: 'GUI',
  rmet: 'GUI',
  lalt: 'Alt',
  ralt: 'Alt',
  lctl: 'Ctrl',
  rctl: 'Ctrl',
  lsft: 'Shift',
  rsft: 'Shift',
};

/** Short single-letter labels for use in compact displays. */
export const MODIFIER_SHORT: Record<string, string> = {
  lmet: 'G',
  rmet: 'G',
  lalt: 'A',
  ralt: 'A',
  lctl: 'C',
  rctl: 'C',
  lsft: 'S',
  rsft: 'S',
};

// ---------------------------------------------------------------------------
// Standard QWERTY physical layout
// ---------------------------------------------------------------------------

/**
 * Standard ANSI QWERTY physical key layout.
 *
 * Each key has a row/col position and a width (in standard key units).
 * The layout matches the typical full defsrc order.
 */
export const QWERTY_LAYOUT: KeyDef[] = [
  // Row 0 — Number row
  { name: 'grv',  label: '`',      row: 0, col: 0,  width: 1 },
  { name: '1',    label: '1',      row: 0, col: 1,  width: 1 },
  { name: '2',    label: '2',      row: 0, col: 2,  width: 1 },
  { name: '3',    label: '3',      row: 0, col: 3,  width: 1 },
  { name: '4',    label: '4',      row: 0, col: 4,  width: 1 },
  { name: '5',    label: '5',      row: 0, col: 5,  width: 1 },
  { name: '6',    label: '6',      row: 0, col: 6,  width: 1 },
  { name: '7',    label: '7',      row: 0, col: 7,  width: 1 },
  { name: '8',    label: '8',      row: 0, col: 8,  width: 1 },
  { name: '9',    label: '9',      row: 0, col: 9,  width: 1 },
  { name: '0',    label: '0',      row: 0, col: 10, width: 1 },
  { name: '-',    label: '-',      row: 0, col: 11, width: 1 },
  { name: '=',    label: '=',      row: 0, col: 12, width: 1 },
  { name: 'bspc', label: 'Bksp',   row: 0, col: 13, width: 2 },

  // Row 1 — Top letter row
  { name: 'tab',  label: 'Tab',    row: 1, col: 0,  width: 1.5 },
  { name: 'q',    label: 'Q',      row: 1, col: 1,  width: 1 },
  { name: 'w',    label: 'W',      row: 1, col: 2,  width: 1 },
  { name: 'e',    label: 'E',      row: 1, col: 3,  width: 1 },
  { name: 'r',    label: 'R',      row: 1, col: 4,  width: 1 },
  { name: 't',    label: 'T',      row: 1, col: 5,  width: 1 },
  { name: 'y',    label: 'Y',      row: 1, col: 6,  width: 1 },
  { name: 'u',    label: 'U',      row: 1, col: 7,  width: 1 },
  { name: 'i',    label: 'I',      row: 1, col: 8,  width: 1 },
  { name: 'o',    label: 'O',      row: 1, col: 9,  width: 1 },
  { name: 'p',    label: 'P',      row: 1, col: 10, width: 1 },
  { name: '[',    label: '[',      row: 1, col: 11, width: 1 },
  { name: ']',    label: ']',      row: 1, col: 12, width: 1 },
  { name: '\\',   label: '\\',     row: 1, col: 13, width: 1.5 },

  // Row 2 — Home row
  { name: 'caps', label: 'Caps',   row: 2, col: 0,  width: 1.75 },
  { name: 'a',    label: 'A',      row: 2, col: 1,  width: 1 },
  { name: 's',    label: 'S',      row: 2, col: 2,  width: 1 },
  { name: 'd',    label: 'D',      row: 2, col: 3,  width: 1 },
  { name: 'f',    label: 'F',      row: 2, col: 4,  width: 1 },
  { name: 'g',    label: 'G',      row: 2, col: 5,  width: 1 },
  { name: 'h',    label: 'H',      row: 2, col: 6,  width: 1 },
  { name: 'j',    label: 'J',      row: 2, col: 7,  width: 1 },
  { name: 'k',    label: 'K',      row: 2, col: 8,  width: 1 },
  { name: 'l',    label: 'L',      row: 2, col: 9,  width: 1 },
  { name: ';',    label: ';',      row: 2, col: 10, width: 1 },
  { name: "'",    label: "'",      row: 2, col: 11, width: 1 },
  { name: 'ret',  label: 'Enter',  row: 2, col: 12, width: 2.25 },

  // Row 3 — Bottom row
  { name: 'lsft', label: 'LShift', row: 3, col: 0,  width: 2.25 },
  { name: 'z',    label: 'Z',      row: 3, col: 1,  width: 1 },
  { name: 'x',    label: 'X',      row: 3, col: 2,  width: 1 },
  { name: 'c',    label: 'C',      row: 3, col: 3,  width: 1 },
  { name: 'v',    label: 'V',      row: 3, col: 4,  width: 1 },
  { name: 'b',    label: 'B',      row: 3, col: 5,  width: 1 },
  { name: 'n',    label: 'N',      row: 3, col: 6,  width: 1 },
  { name: 'm',    label: 'M',      row: 3, col: 7,  width: 1 },
  { name: ',',    label: ',',      row: 3, col: 8,  width: 1 },
  { name: '.',    label: '.',      row: 3, col: 9,  width: 1 },
  { name: '/',    label: '/',      row: 3, col: 10, width: 1 },
  { name: 'rsft', label: 'RShift', row: 3, col: 11, width: 2.75 },

  // Row 4 — Bottom modifiers
  { name: 'lctl', label: 'LCtrl',  row: 4, col: 0,  width: 1.25 },
  { name: 'lmet', label: 'Super',  row: 4, col: 1,  width: 1.25 },
  { name: 'lalt', label: 'LAlt',   row: 4, col: 2,  width: 1.25 },
  { name: 'spc',  label: 'Space',  row: 4, col: 3,  width: 6.25 },
  { name: 'ralt', label: 'RAlt',   row: 4, col: 4,  width: 1.25 },
  { name: 'rmet', label: 'Super',  row: 4, col: 5,  width: 1.25 },
  { name: 'rctl', label: 'RCtrl',  row: 4, col: 6,  width: 1.25 },
];

/**
 * Only the home row letter keys (A-;) used for home row mod presets.
 * Index 0-3 = left hand, 4-7 = right hand.
 */
export const HOME_ROW_KEYS = ['a', 's', 'd', 'f', 'j', 'k', 'l', ';'] as const;

/**
 * Full defsrc list matching the standard QWERTY ANSI layout
 * in the order kanata expects.
 */
export const FULL_QWERTY_DEFSRC: string[] = QWERTY_LAYOUT.map((k) => k.name);

/** Subset defsrc for home-row-only configs. */
export const HOME_ROW_DEFSRC: string[] = [...HOME_ROW_KEYS];

/**
 * Lookup a key's display label. Falls back to the raw key name
 * if no mapping is found.
 */
export function getKeyLabel(keyName: string): string {
  return KEY_LABELS[keyName] ?? keyName;
}

/**
 * Check whether a key name is a modifier.
 */
export function isModifier(keyName: string): boolean {
  return MODIFIER_KEYS.has(keyName);
}

/** Resolve an AliasRef to its underlying action. Returns the original action if not an alias. */
export function resolveAlias(action: KeyAction | undefined, aliases: Alias[]): KeyAction | undefined {
  if (!action || typeof action === 'string') return action;
  if (action.type === 'alias-ref') {
    const alias = aliases.find(a => a.name === action.name);
    if (alias) return alias.action;
  }
  return action;
}

/** Deep-resolve an action: if it's an alias whose action is a tap-hold with a multi tap-action,
 *  extract the underlying key from the multi. This handles advanced presets where tap is (multi a @tap). */
export function resolveActionForDisplay(action: KeyAction | undefined, aliases: Alias[]): KeyAction | undefined {
  const resolved = resolveAlias(action, aliases);
  if (!resolved || typeof resolved === 'string') return resolved;

  // For tap-hold with multi tap-action, extract the first key from multi
  if (resolved.type === 'tap-hold') {
    const th = resolved as TapHoldAction;
    let tapAction = th.tapAction;
    // If tap is a multi action, extract the first string key
    if (typeof tapAction !== 'string' && tapAction.type === 'multi') {
      const multi = tapAction as MultiAction;
      const firstKey = multi.actions.find(a => typeof a === 'string');
      if (firstKey) {
        tapAction = firstKey as string;
      }
    }
    return { ...th, tapAction };
  }
  return resolved;
}
