// ============================================================================
// Home Row Mod Presets
// ============================================================================

import type {
  KanataConfig,
  HomeRowModConfig,
  ModifierOrder,
  Layer,
  Alias,
  Variable,
  FakeKey,
  KeyAction,
  TapHoldAction,
  MultiAction,
  AliasRef,
  GenericAction,
  SList,
  SAtom,
} from './types';
import { HOME_ROW_DEFSRC } from './keys';

// ---------------------------------------------------------------------------
// Modifier orderings
// ---------------------------------------------------------------------------

/**
 * GACS: GUI, Alt, Ctrl, Shift (from pinky to index)
 * CAGS: Ctrl, Alt, GUI, Shift (alternative popular ordering)
 *
 * Left hand: pinky=a, ring=s, middle=d, index=f
 * Right hand: index=j, ring=k, middle=l, pinky=;
 */
const MOD_ORDERS: Record<ModifierOrder, { left: string[]; right: string[] }> = {
  GACS: {
    left: ['lmet', 'lalt', 'lctl', 'lsft'],
    right: ['rsft', 'rctl', 'ralt', 'rmet'],
  },
  CAGS: {
    left: ['lctl', 'lalt', 'lmet', 'lsft'],
    right: ['rsft', 'rmet', 'ralt', 'rctl'],
  },
};

// ---------------------------------------------------------------------------
// Preset: Basic home row mods
// ---------------------------------------------------------------------------

/**
 * Generate a basic home row mods config.
 *
 * Uses plain `tap-hold` for each home row key.
 * Matches the structure from kanata/cfg_samples/home-row-mod-basic.kbd.
 */
export function basicHomeRowMods(opts?: Partial<HomeRowModConfig>): KanataConfig {
  const tapTime = opts?.tapTime ?? 200;
  const holdTime = opts?.holdTime ?? 150;
  const order = opts?.modifierOrder ?? 'GACS';

  const mods = MOD_ORDERS[order];
  const keys = HOME_ROW_DEFSRC;

  const variables: Variable[] = [
    { name: 'tap-time', value: String(tapTime) },
    { name: 'hold-time', value: String(holdTime) },
  ];

  const aliases: Alias[] = keys.map((key, i) => {
    const mod = i < 4 ? mods.left[i] : mods.right[i - 4];
    const action: TapHoldAction = {
      type: 'tap-hold',
      variant: 'tap-hold',
      tapTimeout: '$tap-time',
      holdTimeout: '$hold-time',
      tapAction: key,
      holdAction: mod,
    };
    return { name: key, action };
  });

  const baseLayer: Layer = {
    name: 'base',
    keys: keys.map((key): AliasRef => ({
      type: 'alias-ref',
      name: key,
    })),
  };

  return {
    defcfg: { 'process-unmapped-keys': 'yes' },
    defsrc: [...keys],
    layers: [baseLayer],
    aliases,
    variables,
    fakekeys: [],
  };
}

// ---------------------------------------------------------------------------
// Preset: Advanced home row mods
// ---------------------------------------------------------------------------

/**
 * Generate an advanced home row mods config with anti-misfiring.
 *
 * Uses `tap-hold-release-keys` with per-hand key lists and a nomods layer
 * that temporarily disables mods during fast typing.
 * Matches the structure from kanata/cfg_samples/home-row-mod-advanced.kbd.
 */
export function advancedHomeRowMods(opts?: Partial<HomeRowModConfig>): KanataConfig {
  const tapTime = opts?.tapTime ?? 200;
  const holdTime = opts?.holdTime ?? 150;
  const order = opts?.modifierOrder ?? 'GACS';

  const mods = MOD_ORDERS[order];
  const keys = HOME_ROW_DEFSRC;

  // Variable definitions
  const leftHandKeys: SList = {
    type: 'list',
    items: [
      'q', 'w', 'e', 'r', 't',
      'a', 's', 'd', 'f', 'g',
      'z', 'x', 'c', 'v', 'b',
    ].map((k): SAtom => ({ type: 'atom', value: k })),
  };

  const rightHandKeys: SList = {
    type: 'list',
    items: [
      'y', 'u', 'i', 'o', 'p',
      'h', 'j', 'k', 'l', ';',
      'n', 'm', ',', '.', '/',
    ].map((k): SAtom => ({ type: 'atom', value: k })),
  };

  const variables: Variable[] = [
    { name: 'tap-time', value: String(tapTime) },
    { name: 'hold-time', value: String(holdTime) },
    { name: 'left-hand-keys', value: leftHandKeys },
    { name: 'right-hand-keys', value: rightHandKeys },
  ];

  // The @tap alias: switches to nomods layer and schedules return to base
  const tapAlias: Alias = {
    name: 'tap',
    action: {
      type: 'multi',
      actions: [
        {
          type: 'layer-action',
          op: 'layer-switch',
          layer: 'nomods',
        },
        {
          type: 'generic',
          sexp: {
            type: 'list',
            items: [
              { type: 'atom', value: 'on-idle-fakekey' },
              { type: 'atom', value: 'to-base' },
              { type: 'atom', value: 'tap' },
              { type: 'atom', value: '20' },
            ],
          },
        } as GenericAction,
      ],
    } as MultiAction,
  };

  // Per-key aliases using tap-hold-release-keys
  const keyAliases: Alias[] = keys.map((key, i) => {
    const mod = i < 4 ? mods.left[i] : mods.right[i - 4];
    const handVar = i < 4 ? '$left-hand-keys' : '$right-hand-keys';

    const tapAction: MultiAction = {
      type: 'multi',
      actions: [key, { type: 'alias-ref', name: 'tap' } as AliasRef],
    };

    const action: TapHoldAction = {
      type: 'tap-hold',
      variant: 'tap-hold-release-keys',
      tapTimeout: '$tap-time',
      holdTimeout: '$hold-time',
      tapAction,
      holdAction: mod,
      extraKeys: { type: 'atom', value: handVar } as SAtom,
    };
    return { name: key, action };
  });

  const aliases = [tapAlias, ...keyAliases];

  // Layers
  const baseLayer: Layer = {
    name: 'base',
    keys: keys.map((key): AliasRef => ({
      type: 'alias-ref',
      name: key,
    })),
  };

  const nomodsLayer: Layer = {
    name: 'nomods',
    keys: keys.map((key): KeyAction => key),
  };

  // Fakekeys
  const fakekeys: FakeKey[] = [
    {
      name: 'to-base',
      action: {
        type: 'layer-action',
        op: 'layer-switch',
        layer: 'base',
      },
    },
  ];

  return {
    defcfg: { 'process-unmapped-keys': 'yes' },
    defsrc: [...keys],
    layers: [baseLayer, nomodsLayer],
    aliases,
    variables,
    fakekeys,
  };
}

// ---------------------------------------------------------------------------
// Convenience: CAGS-order variants
// ---------------------------------------------------------------------------

/** Basic home row mods with CAGS modifier order. */
export function basicHomeRowModsCAGS(
  opts?: Partial<Omit<HomeRowModConfig, 'modifierOrder'>>
): KanataConfig {
  return basicHomeRowMods({ ...opts, modifierOrder: 'CAGS' });
}

/** Advanced home row mods with CAGS modifier order. */
export function advancedHomeRowModsCAGS(
  opts?: Partial<Omit<HomeRowModConfig, 'modifierOrder'>>
): KanataConfig {
  return advancedHomeRowMods({ ...opts, modifierOrder: 'CAGS' });
}

// ---------------------------------------------------------------------------
// Preset: Miryoku-style (for ergonomic keyboards)
// ---------------------------------------------------------------------------

/**
 * Generate a Miryoku-style config for ergonomic keyboards.
 *
 * Home row mods in GACS order with thumb keys assigned to:
 * Space, Enter, Backspace, Delete, Tab, Escape (and layer-hold placeholders).
 *
 * The defsrc must be provided (varies by ergo layout).
 */
export function miryokuPreset(
  defsrc: string[],
  opts?: Partial<HomeRowModConfig>,
): KanataConfig {
  const tapTime = opts?.tapTime ?? 200;
  const holdTime = opts?.holdTime ?? 150;
  const order = opts?.modifierOrder ?? 'GACS';
  const mods = MOD_ORDERS[order];

  const variables: Variable[] = [
    { name: 'tap-time', value: String(tapTime) },
    { name: 'hold-time', value: String(holdTime) },
  ];

  // Identify home row keys (a/s/d/f on left, j/k/l/; on right)
  const homeRowLeft = ['a', 's', 'd', 'f'];
  const homeRowRight = ['j', 'k', 'l', ';'];

  // Build aliases for home row mod keys
  const aliases: Alias[] = [];

  homeRowLeft.forEach((key, i) => {
    if (!defsrc.includes(key)) return;
    const action: TapHoldAction = {
      type: 'tap-hold',
      variant: 'tap-hold',
      tapTimeout: '$tap-time',
      holdTimeout: '$hold-time',
      tapAction: key,
      holdAction: mods.left[i],
    };
    aliases.push({ name: `hrm-${key}`, action });
  });

  homeRowRight.forEach((key, i) => {
    if (!defsrc.includes(key)) return;
    const action: TapHoldAction = {
      type: 'tap-hold',
      variant: 'tap-hold',
      tapTimeout: '$tap-time',
      holdTimeout: '$hold-time',
      tapAction: key,
      holdAction: mods.right[i],
    };
    aliases.push({ name: `hrm-${key}`, action });
  });

  // Thumb key aliases with layer-hold actions
  const thumbAliases: Array<{ name: string; tap: string; hold: string }> = [
    { name: 'th-spc', tap: 'spc', hold: 'lsft' },
    { name: 'th-ret', tap: 'ret', hold: 'lctl' },
    { name: 'th-bspc', tap: 'bspc', hold: 'lalt' },
    { name: 'th-del', tap: 'del', hold: 'lmet' },
    { name: 'th-tab', tap: 'tab', hold: 'ralt' },
    { name: 'th-esc', tap: 'esc', hold: 'rctl' },
  ];

  for (const ta of thumbAliases) {
    const action: TapHoldAction = {
      type: 'tap-hold',
      variant: 'tap-hold',
      tapTimeout: '$tap-time',
      holdTimeout: '$hold-time',
      tapAction: ta.tap,
      holdAction: ta.hold,
    };
    aliases.push({ name: ta.name, action });
  }

  // Map to build the aliases lookup
  const aliasNames = new Set(aliases.map((a) => a.name));

  // Build base layer: replace home row and known thumb keys with alias refs
  const homeRowMap: Record<string, string> = {};
  for (const key of [...homeRowLeft, ...homeRowRight]) {
    homeRowMap[key] = `hrm-${key}`;
  }

  // Map defsrc thumb key names to thumb alias names
  const thumbKeyMap: Record<string, string> = {
    spc: 'th-spc',
    ret: 'th-ret',
    bspc: 'th-bspc',
    del: 'th-del',
    tab: 'th-tab',
    esc: 'th-esc',
  };

  const baseKeys: KeyAction[] = defsrc.map((key): KeyAction => {
    const hrmAlias = homeRowMap[key];
    if (hrmAlias && aliasNames.has(hrmAlias)) {
      return { type: 'alias-ref', name: hrmAlias } as AliasRef;
    }
    const thumbAlias = thumbKeyMap[key];
    if (thumbAlias && aliasNames.has(thumbAlias)) {
      return { type: 'alias-ref', name: thumbAlias } as AliasRef;
    }
    return key;
  });

  const baseLayer: Layer = {
    name: 'base',
    keys: baseKeys,
  };

  return {
    defcfg: { 'process-unmapped-keys': 'yes' },
    defsrc: [...defsrc],
    layers: [baseLayer],
    aliases,
    variables,
    fakekeys: [],
  };
}
