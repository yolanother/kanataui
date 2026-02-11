// ============================================================================
// Ergonomic Keyboard Layout Definitions
// ============================================================================

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Position and visual properties for a single key in an ergo layout. */
export interface KeyPosition {
  row: number;
  col: number;
  width?: number;   // default 1u
  height?: number;  // default 1u
  rotation?: number; // degrees, for thumb fan
  offsetY?: number;  // vertical stagger per column (in key units)
}

/** Full definition of an ergonomic keyboard layout. */
export interface ErgoLayoutDef {
  id: string;
  name: string;
  description: string;
  rows: number;
  columns: number;       // per half
  thumbKeys: number;     // per side
  leftKeys: KeyPosition[];
  rightKeys: KeyPosition[];
  leftThumb: KeyPosition[];
  rightThumb: KeyPosition[];
  /** Default defsrc key names for this layout (left-to-right, top-to-bottom, then thumbs). */
  defaultDefsrc: string[];
}

// ---------------------------------------------------------------------------
// Column stagger helpers
// ---------------------------------------------------------------------------

/**
 * Standard column stagger offsets (in key units) for a 6-column ergo half.
 * Index 0 = outermost (pinky), index 5 = innermost.
 *
 * Positive = key shifts downward.
 */
const CORNE_STAGGER = [0.25, 0.125, 0, 0, 0.125, 0.25];

function buildHalfKeys(
  rows: number,
  cols: number,
  stagger: number[],
): KeyPosition[] {
  const keys: KeyPosition[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      keys.push({
        row: r,
        col: c,
        offsetY: stagger[c] ?? 0,
      });
    }
  }
  return keys;
}

function mirrorHalf(keys: KeyPosition[], cols: number): KeyPosition[] {
  return keys.map((k) => ({
    ...k,
    col: cols - 1 - k.col,
  }));
}

// ---------------------------------------------------------------------------
// Thumb cluster helpers
// ---------------------------------------------------------------------------

function buildThumbRow(
  count: number,
  baseRow: number,
  fan: boolean,
): KeyPosition[] {
  const keys: KeyPosition[] = [];
  const fanAngles: Record<number, number[]> = {
    3: [-10, 0, 10],
    4: [-15, -5, 5, 15],
    6: [-20, -12, -4, 4, 12, 20],
  };
  const angles = fan ? (fanAngles[count] ?? Array(count).fill(0)) : Array(count).fill(0);

  for (let i = 0; i < count; i++) {
    keys.push({
      row: baseRow,
      col: i,
      rotation: angles[i],
    });
  }
  return keys;
}

// ---------------------------------------------------------------------------
// Preset: Corne (42 keys)
// ---------------------------------------------------------------------------

const CORNE_LEFT = buildHalfKeys(3, 6, CORNE_STAGGER);
const CORNE_RIGHT = mirrorHalf(buildHalfKeys(3, 6, CORNE_STAGGER), 6);
const CORNE_LEFT_THUMB = buildThumbRow(3, 3, true);
const CORNE_RIGHT_THUMB = buildThumbRow(3, 3, true);

const CORNE_DEFSRC = [
  // Row 0 left, right
  'tab',  'q', 'w', 'e', 'r', 't',       'y', 'u', 'i', 'o', 'p', 'bspc',
  // Row 1 (home)
  'lctl', 'a', 's', 'd', 'f', 'g',       'h', 'j', 'k', 'l', ';', "'",
  // Row 2
  'lsft', 'z', 'x', 'c', 'v', 'b',       'n', 'm', ',', '.', '/', 'rsft',
  // Thumbs
  'lmet', 'spc', 'lalt',                   'ralt', 'ret', 'rctl',
];

export const CORNE_LAYOUT: ErgoLayoutDef = {
  id: 'corne',
  name: 'Corne',
  description: '42-key split: 3 rows x 6 cols + 3 thumb keys per side',
  rows: 3,
  columns: 6,
  thumbKeys: 3,
  leftKeys: CORNE_LEFT,
  rightKeys: CORNE_RIGHT,
  leftThumb: CORNE_LEFT_THUMB,
  rightThumb: CORNE_RIGHT_THUMB,
  defaultDefsrc: CORNE_DEFSRC,
};

// ---------------------------------------------------------------------------
// Preset: Lily58 (58 keys)
// ---------------------------------------------------------------------------

const LILY58_STAGGER = [0.375, 0.25, 0, 0, 0.125, 0.25];

const LILY58_LEFT = buildHalfKeys(4, 6, LILY58_STAGGER);
const LILY58_RIGHT = mirrorHalf(buildHalfKeys(4, 6, LILY58_STAGGER), 6);
const LILY58_LEFT_THUMB = buildThumbRow(4, 4, true);
const LILY58_RIGHT_THUMB = buildThumbRow(4, 4, true);

const LILY58_DEFSRC = [
  // Row 0 (number)
  'grv', '1', '2', '3', '4', '5',         '6', '7', '8', '9', '0', 'bspc',
  // Row 1
  'tab', 'q', 'w', 'e', 'r', 't',         'y', 'u', 'i', 'o', 'p', '-',
  // Row 2 (home)
  'lctl', 'a', 's', 'd', 'f', 'g',        'h', 'j', 'k', 'l', ';', "'",
  // Row 3
  'lsft', 'z', 'x', 'c', 'v', 'b',        'n', 'm', ',', '.', '/', 'rsft',
  // Thumbs
  'lmet', 'lalt', 'spc', 'ret',            'bspc', 'ralt', 'rmet', 'rctl',
];

export const LILY58_LAYOUT: ErgoLayoutDef = {
  id: 'lily58',
  name: 'Lily58',
  description: '58-key split: 4 rows x 6 cols + 4 thumb keys per side',
  rows: 4,
  columns: 6,
  thumbKeys: 4,
  leftKeys: LILY58_LEFT,
  rightKeys: LILY58_RIGHT,
  leftThumb: LILY58_LEFT_THUMB,
  rightThumb: LILY58_RIGHT_THUMB,
  defaultDefsrc: LILY58_DEFSRC,
};

// ---------------------------------------------------------------------------
// Preset: Moonlander / Ergodox (76 keys)
// ---------------------------------------------------------------------------

const MOONLANDER_STAGGER = [0.375, 0.25, 0, 0, 0.125, 0.25, 0.375];

const MOONLANDER_LEFT = buildHalfKeys(4, 7, MOONLANDER_STAGGER);
const MOONLANDER_RIGHT = mirrorHalf(buildHalfKeys(4, 7, MOONLANDER_STAGGER), 7);
const MOONLANDER_LEFT_THUMB = buildThumbRow(6, 4, true);
const MOONLANDER_RIGHT_THUMB = buildThumbRow(6, 4, true);

const MOONLANDER_DEFSRC = [
  // Row 0
  '=', '1', '2', '3', '4', '5', 'esc',       'esc', '6', '7', '8', '9', '0', '-',
  // Row 1
  'tab', 'q', 'w', 'e', 'r', 't', '[',       ']', 'y', 'u', 'i', 'o', 'p', '\\',
  // Row 2 (home)
  'lctl', 'a', 's', 'd', 'f', 'g', 'home',   'pgup', 'h', 'j', 'k', 'l', ';', "'",
  // Row 3
  'lsft', 'z', 'x', 'c', 'v', 'b', 'end',    'pgdn', 'n', 'm', ',', '.', '/', 'rsft',
  // Thumbs left, right
  'lmet', 'lalt', 'lctl', 'spc', 'ret', 'del',
  'bspc', 'spc', 'rctl', 'ralt', 'rmet', 'rctl',
];

export const MOONLANDER_LAYOUT: ErgoLayoutDef = {
  id: 'moonlander',
  name: 'Moonlander / Ergodox',
  description: '76-key split: 4 rows x 7 cols + 6 thumb keys per side',
  rows: 4,
  columns: 7,
  thumbKeys: 6,
  leftKeys: MOONLANDER_LEFT,
  rightKeys: MOONLANDER_RIGHT,
  leftThumb: MOONLANDER_LEFT_THUMB,
  rightThumb: MOONLANDER_RIGHT_THUMB,
  defaultDefsrc: MOONLANDER_DEFSRC,
};

// ---------------------------------------------------------------------------
// Preset: Kinesis Advantage Pro (60 keys)
// ---------------------------------------------------------------------------

const KINESIS_STAGGER = [0.5, 0.25, 0, 0, 0.125, 0.375];

const KINESIS_LEFT = buildHalfKeys(4, 6, KINESIS_STAGGER);
const KINESIS_RIGHT = mirrorHalf(buildHalfKeys(4, 6, KINESIS_STAGGER), 6);

function buildThumbGrid(baseRow: number): KeyPosition[] {
  return [
    { row: baseRow, col: 0 },
    { row: baseRow, col: 1 },
    { row: baseRow, col: 2 },
    { row: baseRow + 1, col: 0 },
    { row: baseRow + 1, col: 1 },
    { row: baseRow + 1, col: 2 },
  ];
}

const KINESIS_LEFT_THUMB = buildThumbGrid(4);
const KINESIS_RIGHT_THUMB = buildThumbGrid(4);

const KINESIS_DEFSRC = [
  // Row 0
  '=', '1', '2', '3', '4', '5',          '6', '7', '8', '9', '0', '-',
  // Row 1
  'tab', 'q', 'w', 'e', 'r', 't',        'y', 'u', 'i', 'o', 'p', '\\',
  // Row 2 (home)
  'caps', 'a', 's', 'd', 'f', 'g',        'h', 'j', 'k', 'l', ';', "'",
  // Row 3
  'lsft', 'z', 'x', 'c', 'v', 'b',       'n', 'm', ',', '.', '/', 'rsft',
  // Thumbs left, right
  'lctl', 'lalt', 'home', 'end', 'spc', 'bspc',
  'del', 'ret', 'pgup', 'pgdn', 'ralt', 'rctl',
];

export const KINESIS_LAYOUT: ErgoLayoutDef = {
  id: 'kinesis',
  name: 'Kinesis Advantage',
  description: '60-key split: 4 rows x 6 cols + 6 thumb keys per side (2x3 grid)',
  rows: 4,
  columns: 6,
  thumbKeys: 6,
  leftKeys: KINESIS_LEFT,
  rightKeys: KINESIS_RIGHT,
  leftThumb: KINESIS_LEFT_THUMB,
  rightThumb: KINESIS_RIGHT_THUMB,
  defaultDefsrc: KINESIS_DEFSRC,
};

// ---------------------------------------------------------------------------
// Custom layout builder
// ---------------------------------------------------------------------------

/** Build a custom ergo layout definition from user parameters. */
export function buildCustomLayout(
  rows: number,
  columns: number,
  thumbKeys: number,
): ErgoLayoutDef {
  const stagger = Array(columns).fill(0);
  // Apply a mild standard stagger for the custom layout
  if (columns >= 6) {
    stagger[0] = 0.25;
    stagger[1] = 0.125;
    stagger[columns - 1] = 0.25;
    stagger[columns - 2] = 0.125;
  }

  const leftKeys = buildHalfKeys(rows, columns, stagger);
  const rightKeys = mirrorHalf(buildHalfKeys(rows, columns, stagger), columns);
  const leftThumb = buildThumbRow(thumbKeys, rows, thumbKeys >= 3);
  const rightThumb = buildThumbRow(thumbKeys, rows, thumbKeys >= 3);

  // Build a default defsrc with placeholder key names
  const totalKeys = (rows * columns * 2) + (thumbKeys * 2);
  const defaultDefsrc: string[] = [];
  const alpha = 'abcdefghijklmnopqrstuvwxyz';
  for (let i = 0; i < totalKeys; i++) {
    if (i < alpha.length) {
      defaultDefsrc.push(alpha[i]);
    } else {
      defaultDefsrc.push(`XX`);
    }
  }

  return {
    id: 'custom',
    name: 'Custom',
    description: `Custom: ${rows} rows x ${columns} cols + ${thumbKeys} thumb keys per side`,
    rows,
    columns,
    thumbKeys,
    leftKeys,
    rightKeys,
    leftThumb,
    rightThumb,
    defaultDefsrc,
  };
}

// ---------------------------------------------------------------------------
// Registry
// ---------------------------------------------------------------------------

export const ERGO_LAYOUTS: Record<string, ErgoLayoutDef> = {
  corne: CORNE_LAYOUT,
  lily58: LILY58_LAYOUT,
  moonlander: MOONLANDER_LAYOUT,
  kinesis: KINESIS_LAYOUT,
};

/** Get layout definition by id, falling back to Corne. */
export function getErgoLayout(id: string): ErgoLayoutDef {
  return ERGO_LAYOUTS[id] ?? CORNE_LAYOUT;
}

/**
 * Get the total number of keys for a layout.
 */
export function getTotalKeys(layout: ErgoLayoutDef): number {
  return layout.leftKeys.length
    + layout.rightKeys.length
    + layout.leftThumb.length
    + layout.rightThumb.length;
}
