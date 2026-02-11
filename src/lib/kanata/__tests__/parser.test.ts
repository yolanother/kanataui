import { describe, it, expect } from 'vitest';
import { tokenize, parseSExp, parseKanataConfig } from '../parser';
import { generateConfig, keyActionToString } from '../generator';
import { basicHomeRowMods, advancedHomeRowMods } from '../presets';
import type { TapHoldAction, AliasRef, MultiAction, LayerAction, SList } from '../types';

// ============================================================================
// Tokenizer tests
// ============================================================================

describe('tokenize', () => {
  it('handles empty input', () => {
    expect(tokenize('')).toEqual([]);
  });

  it('tokenizes parentheses', () => {
    const tokens = tokenize('()');
    expect(tokens).toEqual([{ type: 'lparen' }, { type: 'rparen' }]);
  });

  it('tokenizes atoms', () => {
    const tokens = tokenize('a b c');
    expect(tokens).toEqual([
      { type: 'atom', value: 'a' },
      { type: 'atom', value: 'b' },
      { type: 'atom', value: 'c' },
    ]);
  });

  it('tokenizes variable references', () => {
    const tokens = tokenize('$tap-time');
    expect(tokens).toEqual([{ type: 'atom', value: '$tap-time' }]);
  });

  it('tokenizes alias references', () => {
    const tokens = tokenize('@a @tap');
    expect(tokens).toEqual([
      { type: 'atom', value: '@a' },
      { type: 'atom', value: '@tap' },
    ]);
  });

  it('skips line comments', () => {
    const tokens = tokenize(';; this is a comment\na');
    expect(tokens).toEqual([{ type: 'atom', value: 'a' }]);
  });

  it('skips block comments', () => {
    const tokens = tokenize('#| comment |# a');
    expect(tokens).toEqual([{ type: 'atom', value: 'a' }]);
  });

  it('handles nested block comments', () => {
    const tokens = tokenize('a #| outer #| inner |# still comment |# b');
    expect(tokens).toEqual([
      { type: 'atom', value: 'a' },
      { type: 'atom', value: 'b' },
    ]);
  });

  it('handles empty block comments inline', () => {
    const tokens = tokenize('a #||# b #| |# c');
    expect(tokens).toEqual([
      { type: 'atom', value: 'a' },
      { type: 'atom', value: 'b' },
      { type: 'atom', value: 'c' },
    ]);
  });

  it('tokenizes quoted strings', () => {
    const tokens = tokenize('"hello world"');
    expect(tokens).toEqual([{ type: 'string', value: 'hello world' }]);
  });

  it('tokenizes a complete S-expression', () => {
    const tokens = tokenize('(defcfg process-unmapped-keys yes)');
    expect(tokens.length).toBe(5);
    expect(tokens[0]).toEqual({ type: 'lparen' });
    expect(tokens[1]).toEqual({ type: 'atom', value: 'defcfg' });
    expect(tokens[4]).toEqual({ type: 'rparen' });
  });
});

// ============================================================================
// S-Expression parser tests
// ============================================================================

describe('parseSExp', () => {
  it('parses a simple list', () => {
    const result = parseSExp('(a b c)');
    expect(result.length).toBe(1);
    expect(result[0].type).toBe('list');
    const list = result[0] as SList;
    expect(list.items.length).toBe(3);
  });

  it('parses nested lists', () => {
    const result = parseSExp('(a (b c) d)');
    expect(result.length).toBe(1);
    const outer = result[0] as SList;
    expect(outer.items.length).toBe(3);
    expect(outer.items[1].type).toBe('list');
  });

  it('parses multiple top-level expressions', () => {
    const result = parseSExp('(defcfg) (defsrc a b)');
    expect(result.length).toBe(2);
  });
});

// ============================================================================
// Config parser tests
// ============================================================================

describe('parseKanataConfig', () => {
  const basicKbd = `
    (defcfg
      process-unmapped-keys yes
    )
    (defsrc
      a   s   d   f   j   k   l   ;
    )
    (defvar
      tap-time 200
      hold-time 150
    )
    (defalias
      a (tap-hold $tap-time $hold-time a lmet)
      s (tap-hold $tap-time $hold-time s lalt)
    )
    (deflayer base
      @a  @s  @d  @f  @j  @k  @l  @;
    )
  `;

  it('parses defcfg', () => {
    const config = parseKanataConfig(basicKbd);
    expect(config.defcfg['process-unmapped-keys']).toBe('yes');
  });

  it('parses defsrc', () => {
    const config = parseKanataConfig(basicKbd);
    expect(config.defsrc).toEqual(['a', 's', 'd', 'f', 'j', 'k', 'l', ';']);
  });

  it('parses defvar', () => {
    const config = parseKanataConfig(basicKbd);
    expect(config.variables.length).toBe(2);
    expect(config.variables[0]).toEqual({ name: 'tap-time', value: '200' });
    expect(config.variables[1]).toEqual({ name: 'hold-time', value: '150' });
  });

  it('parses defalias with tap-hold', () => {
    const config = parseKanataConfig(basicKbd);
    expect(config.aliases.length).toBe(2);
    const alias = config.aliases[0];
    expect(alias.name).toBe('a');
    const action = alias.action as TapHoldAction;
    expect(action.type).toBe('tap-hold');
    expect(action.variant).toBe('tap-hold');
    expect(action.tapTimeout).toBe('$tap-time');
    expect(action.holdTimeout).toBe('$hold-time');
    expect(action.tapAction).toBe('a');
    expect(action.holdAction).toBe('lmet');
  });

  it('parses deflayer with alias references', () => {
    const config = parseKanataConfig(basicKbd);
    expect(config.layers.length).toBe(1);
    expect(config.layers[0].name).toBe('base');
    expect(config.layers[0].keys.length).toBe(8);
    const firstKey = config.layers[0].keys[0] as AliasRef;
    expect(firstKey.type).toBe('alias-ref');
    expect(firstKey.name).toBe('a');
  });

  it('parses the advanced home row mod config', () => {
    const advancedKbd = `
      (defcfg
        process-unmapped-keys yes
      )
      (defsrc
        a   s   d   f   j   k   l   ;
      )
      (defvar
        tap-time 200
        hold-time 150
        left-hand-keys (
          q w e r t
          a s d f g
          z x c v b
        )
        right-hand-keys (
          y u i o p
          h j k l ;
          n m , . /
        )
      )
      (deflayer base
        @a  @s  @d  @f  @j  @k  @l  @;
      )
      (deflayer nomods
        a   s   d   f   j   k   l   ;
      )
      (deffakekeys
        to-base (layer-switch base)
      )
      (defalias
        tap (multi
          (layer-switch nomods)
          (on-idle-fakekey to-base tap 20)
        )
        a (tap-hold-release-keys $tap-time $hold-time (multi a @tap) lmet $left-hand-keys)
      )
    `;

    const config = parseKanataConfig(advancedKbd);

    // Variables including list values
    expect(config.variables.length).toBe(4);
    expect(config.variables[2].name).toBe('left-hand-keys');
    expect(config.variables[2].value).toHaveProperty('type', 'list');

    // Two layers
    expect(config.layers.length).toBe(2);
    expect(config.layers[0].name).toBe('base');
    expect(config.layers[1].name).toBe('nomods');
    // nomods has plain key names
    expect(config.layers[1].keys[0]).toBe('a');

    // Fakekeys
    expect(config.fakekeys.length).toBe(1);
    expect(config.fakekeys[0].name).toBe('to-base');
    const fkAction = config.fakekeys[0].action as LayerAction;
    expect(fkAction.type).toBe('layer-action');
    expect(fkAction.layer).toBe('base');

    // Aliases
    expect(config.aliases.length).toBe(2);
    // The 'tap' alias is a multi action
    const tapAlias = config.aliases[0];
    expect(tapAlias.name).toBe('tap');
    const tapAction = tapAlias.action as MultiAction;
    expect(tapAction.type).toBe('multi');
    expect(tapAction.actions.length).toBe(2);

    // The 'a' alias uses tap-hold-release-keys
    const aAlias = config.aliases[1];
    const aAction = aAlias.action as TapHoldAction;
    expect(aAction.variant).toBe('tap-hold-release-keys');
    expect(aAction.tapTimeout).toBe('$tap-time');
    // tap action is (multi a @tap)
    const aTap = aAction.tapAction as MultiAction;
    expect(aTap.type).toBe('multi');
    expect(aTap.actions.length).toBe(2);
  });

  it('parses a full QWERTY defsrc', () => {
    const fullKbd = `
      (defsrc
        grv  1    2    3    4    5    6    7    8    9    0    -    =    bspc
        tab  q    w    e    r    t    y    u    i    o    p    [    ]    \\
        caps a    s    d    f    g    h    j    k    l    ;    '    ret
        lsft z    x    c    v    b    n    m    ,    .    /    rsft
        lctl lmet lalt           spc            ralt rmet rctl
      )
    `;
    const config = parseKanataConfig(fullKbd);
    expect(config.defsrc.length).toBe(60);
    expect(config.defsrc[0]).toBe('grv');
    expect(config.defsrc[config.defsrc.length - 1]).toBe('rctl');
  });
});

// ============================================================================
// Key action serialization tests
// ============================================================================

describe('keyActionToString', () => {
  it('serializes a plain key', () => {
    expect(keyActionToString('a')).toBe('a');
  });

  it('serializes an alias reference', () => {
    expect(keyActionToString({ type: 'alias-ref', name: 'tap' })).toBe('@tap');
  });

  it('serializes a tap-hold action', () => {
    const action: TapHoldAction = {
      type: 'tap-hold',
      variant: 'tap-hold',
      tapTimeout: '$tap-time',
      holdTimeout: '$hold-time',
      tapAction: 'a',
      holdAction: 'lmet',
    };
    expect(keyActionToString(action)).toBe('(tap-hold $tap-time $hold-time a lmet)');
  });

  it('serializes a multi action', () => {
    const action: MultiAction = {
      type: 'multi',
      actions: ['a', { type: 'alias-ref', name: 'tap' } as AliasRef],
    };
    expect(keyActionToString(action)).toBe('(multi a @tap)');
  });

  it('serializes a layer action', () => {
    const action: LayerAction = {
      type: 'layer-action',
      op: 'layer-switch',
      layer: 'base',
    };
    expect(keyActionToString(action)).toBe('(layer-switch base)');
  });
});

// ============================================================================
// Generator tests
// ============================================================================

describe('generateConfig', () => {
  it('generates a valid config from basicHomeRowMods', () => {
    const config = basicHomeRowMods();
    const output = generateConfig(config);

    expect(output).toContain('(defcfg');
    expect(output).toContain('process-unmapped-keys yes');
    expect(output).toContain('(defsrc');
    expect(output).toContain('(defvar');
    expect(output).toContain('tap-time 200');
    expect(output).toContain('hold-time 150');
    expect(output).toContain('(defalias');
    expect(output).toContain('(tap-hold $tap-time $hold-time a lmet)');
    expect(output).toContain('(deflayer base');
    expect(output).toContain('@a');
  });

  it('generates a valid config from advancedHomeRowMods', () => {
    const config = advancedHomeRowMods();
    const output = generateConfig(config);

    expect(output).toContain('(defcfg');
    expect(output).toContain('(defsrc');
    expect(output).toContain('(defvar');
    expect(output).toContain('left-hand-keys');
    expect(output).toContain('right-hand-keys');
    expect(output).toContain('(deffakekeys');
    expect(output).toContain('to-base (layer-switch base)');
    expect(output).toContain('(defalias');
    expect(output).toContain('tap-hold-release-keys');
    expect(output).toContain('(deflayer base');
    expect(output).toContain('(deflayer nomods');
  });
});

// ============================================================================
// Round-trip tests
// ============================================================================

describe('round-trip: parse -> generate -> parse', () => {
  it('round-trips a basic home row mods config', () => {
    const original = basicHomeRowMods({ tapTime: 200, holdTime: 150 });
    const generated = generateConfig(original);
    const reparsed = parseKanataConfig(generated);

    expect(reparsed.defcfg['process-unmapped-keys']).toBe('yes');
    expect(reparsed.defsrc).toEqual(original.defsrc);
    expect(reparsed.variables.length).toBe(original.variables.length);
    expect(reparsed.layers.length).toBe(original.layers.length);
    expect(reparsed.layers[0].name).toBe('base');
    expect(reparsed.aliases.length).toBe(original.aliases.length);

    // Verify the first alias action survived the round-trip
    const alias = reparsed.aliases[0];
    const action = alias.action as TapHoldAction;
    expect(action.type).toBe('tap-hold');
    expect(action.variant).toBe('tap-hold');
    expect(action.tapAction).toBe('a');
    expect(action.holdAction).toBe('lmet');
  });

  it('round-trips the advanced home row mods config', () => {
    const original = advancedHomeRowMods({ tapTime: 180, holdTime: 120 });
    const generated = generateConfig(original);
    const reparsed = parseKanataConfig(generated);

    expect(reparsed.defsrc).toEqual(original.defsrc);
    expect(reparsed.layers.length).toBe(2);
    expect(reparsed.layers[0].name).toBe('base');
    expect(reparsed.layers[1].name).toBe('nomods');
    expect(reparsed.fakekeys.length).toBe(1);
    expect(reparsed.variables[0].value).toBe('180');
    expect(reparsed.variables[1].value).toBe('120');
  });
});

// ============================================================================
// Preset tests
// ============================================================================

describe('presets', () => {
  it('basicHomeRowMods uses GACS by default', () => {
    const config = basicHomeRowMods();
    // Pinky (a) -> lmet (GUI)
    const aAction = config.aliases.find((a) => a.name === 'a')?.action as TapHoldAction;
    expect(aAction.holdAction).toBe('lmet');
    // Ring (s) -> lalt
    const sAction = config.aliases.find((a) => a.name === 's')?.action as TapHoldAction;
    expect(sAction.holdAction).toBe('lalt');
    // Middle (d) -> lctl
    const dAction = config.aliases.find((a) => a.name === 'd')?.action as TapHoldAction;
    expect(dAction.holdAction).toBe('lctl');
    // Index (f) -> lsft
    const fAction = config.aliases.find((a) => a.name === 'f')?.action as TapHoldAction;
    expect(fAction.holdAction).toBe('lsft');
  });

  it('basicHomeRowMods CAGS reorders modifiers', () => {
    const config = basicHomeRowMods({ modifierOrder: 'CAGS' });
    // Pinky (a) -> lctl (Ctrl)
    const aAction = config.aliases.find((a) => a.name === 'a')?.action as TapHoldAction;
    expect(aAction.holdAction).toBe('lctl');
    // Ring (s) -> lalt
    const sAction = config.aliases.find((a) => a.name === 's')?.action as TapHoldAction;
    expect(sAction.holdAction).toBe('lalt');
    // Middle (d) -> lmet (GUI)
    const dAction = config.aliases.find((a) => a.name === 'd')?.action as TapHoldAction;
    expect(dAction.holdAction).toBe('lmet');
  });

  it('accepts custom timing parameters', () => {
    const config = basicHomeRowMods({ tapTime: 300, holdTime: 250 });
    expect(config.variables[0].value).toBe('300');
    expect(config.variables[1].value).toBe('250');
  });

  it('advancedHomeRowMods includes nomods layer and fakekeys', () => {
    const config = advancedHomeRowMods();
    expect(config.layers.length).toBe(2);
    expect(config.layers[1].name).toBe('nomods');
    expect(config.fakekeys.length).toBe(1);
    expect(config.fakekeys[0].name).toBe('to-base');
  });

  it('advancedHomeRowMods uses tap-hold-release-keys', () => {
    const config = advancedHomeRowMods();
    // Skip the 'tap' alias (index 0), check key aliases
    const aAlias = config.aliases.find((a) => a.name === 'a');
    const action = aAlias?.action as TapHoldAction;
    expect(action.variant).toBe('tap-hold-release-keys');
  });
});
