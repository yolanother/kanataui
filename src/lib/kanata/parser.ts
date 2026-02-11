// ============================================================================
// Kanata .kbd S-Expression Parser
// ============================================================================

import type {
  SExp,
  SAtom,
  SList,
  KanataConfig,
  Layer,
  Alias,
  Variable,
  FakeKey,
  KeyAction,
  AliasRef,
  TapHoldAction,
  TapHoldVariant,
  MultiAction,
  LayerAction,
  GenericAction,
} from './types';

// ---------------------------------------------------------------------------
// Tokenizer
// ---------------------------------------------------------------------------

type Token =
  | { type: 'lparen' }
  | { type: 'rparen' }
  | { type: 'string'; value: string }
  | { type: 'atom'; value: string };

/**
 * Tokenize a kanata .kbd file into a flat token stream.
 * Handles:
 *  - ;; line comments
 *  - #| ... |# block comments (nestable in practice, we handle non-nested)
 *  - parentheses
 *  - quoted strings ("...")
 *  - raw strings (r#"..."#)
 *  - unquoted atoms (including $variables, @aliases, key names, numbers)
 */
export function tokenize(input: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  const len = input.length;

  while (i < len) {
    const ch = input[i];

    // Skip whitespace
    if (ch === ' ' || ch === '\t' || ch === '\n' || ch === '\r') {
      i++;
      continue;
    }

    // Line comment: ;;
    if (ch === ';' && i + 1 < len && input[i + 1] === ';') {
      while (i < len && input[i] !== '\n') i++;
      continue;
    }

    // Block comment: #| ... |#
    if (ch === '#' && i + 1 < len && input[i + 1] === '|') {
      i += 2;
      let depth = 1;
      while (i < len && depth > 0) {
        if (input[i] === '#' && i + 1 < len && input[i + 1] === '|') {
          depth++;
          i += 2;
        } else if (input[i] === '|' && i + 1 < len && input[i + 1] === '#') {
          depth--;
          i += 2;
        } else {
          i++;
        }
      }
      continue;
    }

    // Parentheses
    if (ch === '(') {
      tokens.push({ type: 'lparen' });
      i++;
      continue;
    }
    if (ch === ')') {
      tokens.push({ type: 'rparen' });
      i++;
      continue;
    }

    // Raw string: r#"..."#
    if (
      ch === 'r' &&
      i + 1 < len &&
      input[i + 1] === '#' &&
      i + 2 < len &&
      input[i + 2] === '"'
    ) {
      i += 3; // skip r#"
      let s = '';
      while (i < len) {
        if (
          input[i] === '"' &&
          i + 1 < len &&
          input[i + 1] === '#'
        ) {
          i += 2;
          break;
        }
        s += input[i];
        i++;
      }
      tokens.push({ type: 'string', value: s });
      continue;
    }

    // Quoted string
    if (ch === '"') {
      i++; // skip opening "
      let s = '';
      while (i < len && input[i] !== '"') {
        if (input[i] === '\\' && i + 1 < len) {
          s += input[i + 1];
          i += 2;
        } else {
          s += input[i];
          i++;
        }
      }
      if (i < len) i++; // skip closing "
      tokens.push({ type: 'string', value: s });
      continue;
    }

    // Atom (unquoted): everything up to whitespace or parens
    // Includes key names, numbers, $variables, @aliases, _, XX, etc.
    let atom = '';
    while (
      i < len &&
      input[i] !== ' ' &&
      input[i] !== '\t' &&
      input[i] !== '\n' &&
      input[i] !== '\r' &&
      input[i] !== '(' &&
      input[i] !== ')' &&
      // Stop if we hit a comment start
      !(input[i] === ';' && i + 1 < len && input[i + 1] === ';') &&
      !(input[i] === '#' && i + 1 < len && input[i + 1] === '|')
    ) {
      atom += input[i];
      i++;
    }
    if (atom.length > 0) {
      tokens.push({ type: 'atom', value: atom });
    }
  }

  return tokens;
}

// ---------------------------------------------------------------------------
// S-Expression Parser
// ---------------------------------------------------------------------------

/**
 * Parse a token stream into a list of top-level S-expressions.
 */
export function parseSExpressions(tokens: Token[]): SExp[] {
  let pos = 0;

  function parseOne(): SExp {
    const tok = tokens[pos];
    if (!tok) {
      throw new Error('Unexpected end of input');
    }

    if (tok.type === 'lparen') {
      pos++; // skip (
      const items: SExp[] = [];
      while (pos < tokens.length && tokens[pos].type !== 'rparen') {
        items.push(parseOne());
      }
      if (pos < tokens.length) pos++; // skip )
      return { type: 'list', items } as SList;
    }

    if (tok.type === 'rparen') {
      throw new Error('Unexpected )');
    }

    // atom or string
    pos++;
    return { type: 'atom', value: tok.type === 'string' ? `"${tok.value}"` : tok.value } as SAtom;
  }

  const result: SExp[] = [];
  while (pos < tokens.length) {
    result.push(parseOne());
  }
  return result;
}

/**
 * Parse raw .kbd text into a list of S-expressions.
 */
export function parseSExp(input: string): SExp[] {
  return parseSExpressions(tokenize(input));
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function isAtom(s: SExp): s is SAtom {
  return s.type === 'atom';
}

function isList(s: SExp): s is SList {
  return s.type === 'list';
}

function atomValue(s: SExp): string {
  if (!isAtom(s)) throw new Error(`Expected atom, got list`);
  return s.value;
}



// ---------------------------------------------------------------------------
// Key action interpretation
// ---------------------------------------------------------------------------

const TAP_HOLD_VARIANTS = new Set<string>([
  'tap-hold',
  'tap-hold-press',
  'tap-hold-release',
  'tap-hold-press-timeout',
  'tap-hold-release-timeout',
  'tap-hold-release-keys',
  'tap-hold-except-keys',
  'tap-hold-tap-keys',
  'tap-hold-release-tap-keys-release',
]);

/**
 * Convert a single S-expression into a KeyAction.
 * This interprets common kanata actions but falls back to GenericAction
 * for anything not specifically handled, ensuring lossless round-tripping.
 */
export function sexpToKeyAction(s: SExp): KeyAction {
  // Simple atom: plain key, @alias, $variable, _, XX
  if (isAtom(s)) {
    const v = s.value;
    if (v.startsWith('@')) {
      return { type: 'alias-ref', name: v.slice(1) } as AliasRef;
    }
    return v;
  }

  // List action
  const list = s as SList;
  if (list.items.length === 0) {
    return { type: 'generic', sexp: s } as GenericAction;
  }

  const head = isAtom(list.items[0]) ? list.items[0].value : '';

  // tap-hold variants
  if (TAP_HOLD_VARIANTS.has(head)) {
    return parseTapHold(head as TapHoldVariant, list);
  }

  // multi
  if (head === 'multi') {
    return {
      type: 'multi',
      actions: list.items.slice(1).map(sexpToKeyAction),
    } as MultiAction;
  }

  // layer actions
  if (head === 'layer-switch' || head === 'layer-toggle' || head === 'layer-while-held') {
    return {
      type: 'layer-action',
      op: head as LayerAction['op'],
      layer: atomValue(list.items[1]),
    } as LayerAction;
  }

  // Fallback: preserve as generic
  return { type: 'generic', sexp: s } as GenericAction;
}

function parseTapHold(variant: TapHoldVariant, list: SList): TapHoldAction {
  const items = list.items.slice(1); // skip the variant name

  const tapTimeout = parseNumberOrVar(items[0]);
  const holdTimeout = parseNumberOrVar(items[1]);
  const tapAction = sexpToKeyAction(items[2]);
  const holdAction = sexpToKeyAction(items[3]);

  const result: TapHoldAction = {
    type: 'tap-hold',
    variant,
    tapTimeout,
    holdTimeout,
    tapAction,
    holdAction,
  };

  // -timeout variants: 5th param is timeout action
  if (
    variant === 'tap-hold-press-timeout' ||
    variant === 'tap-hold-release-timeout'
  ) {
    if (items.length > 4) {
      result.timeoutAction = sexpToKeyAction(items[4]);
    }
  }

  // -keys variants: 5th param is a key list
  if (
    variant === 'tap-hold-release-keys' ||
    variant === 'tap-hold-except-keys' ||
    variant === 'tap-hold-tap-keys'
  ) {
    if (items.length > 4) {
      result.extraKeys = items[4];
    }
  }

  // release-tap-keys-release: 5th is keys, 6th is tap-keys
  if (variant === 'tap-hold-release-tap-keys-release') {
    if (items.length > 4) result.extraKeys = items[4];
    if (items.length > 5) result.tapKeys = items[5];
  }

  return result;
}

function parseNumberOrVar(s: SExp): number | string {
  const v = atomValue(s);
  if (v.startsWith('$')) return v;
  const n = Number(v);
  return isNaN(n) ? v : n;
}

// ---------------------------------------------------------------------------
// High-level config parser
// ---------------------------------------------------------------------------

/**
 * Parse a complete .kbd file string into a KanataConfig.
 */
export function parseKanataConfig(input: string): KanataConfig {
  const topLevel = parseSExp(input);

  const config: KanataConfig = {
    defcfg: {},
    defsrc: [],
    layers: [],
    aliases: [],
    variables: [],
    fakekeys: [],
  };

  for (const expr of topLevel) {
    if (!isList(expr) || expr.items.length === 0) continue;
    const head = isAtom(expr.items[0]) ? expr.items[0].value : '';

    switch (head) {
      case 'defcfg':
        config.defcfg = parseDefcfg(expr);
        break;
      case 'defsrc':
        config.defsrc = parseDefsrc(expr);
        break;
      case 'deflayer':
        config.layers.push(parseDeflayer(expr));
        break;
      case 'defalias':
        config.aliases.push(...parseDefalias(expr));
        break;
      case 'defvar':
        config.variables.push(...parseDefvar(expr));
        break;
      case 'deffakekeys':
        config.fakekeys.push(...parseDeffakekeys(expr));
        break;
    }
  }

  return config;
}

function parseDefcfg(expr: SList): Record<string, string | SExp> {
  const result: Record<string, string | SExp> = {};
  const items = expr.items.slice(1);
  let i = 0;
  while (i < items.length - 1) {
    const key = atomValue(items[i]);
    const val = items[i + 1];
    result[key] = isAtom(val) ? val.value : val;
    i += 2;
  }
  return result;
}

function parseDefsrc(expr: SList): string[] {
  return expr.items.slice(1).map(atomValue);
}

function parseDeflayer(expr: SList): Layer {
  const name = atomValue(expr.items[1]);
  const keys = expr.items.slice(2).map(sexpToKeyAction);
  return { name, keys };
}

function parseDefalias(expr: SList): Alias[] {
  const aliases: Alias[] = [];
  const items = expr.items.slice(1);
  let i = 0;
  while (i < items.length - 1) {
    const name = atomValue(items[i]);
    const action = sexpToKeyAction(items[i + 1]);
    aliases.push({ name, action });
    i += 2;
  }
  return aliases;
}

function parseDefvar(expr: SList): Variable[] {
  const vars: Variable[] = [];
  const items = expr.items.slice(1);
  let i = 0;
  while (i < items.length - 1) {
    const name = atomValue(items[i]);
    const val = items[i + 1];
    vars.push({ name, value: isAtom(val) ? val.value : val });
    i += 2;
  }
  return vars;
}

function parseDeffakekeys(expr: SList): FakeKey[] {
  const fakekeys: FakeKey[] = [];
  const items = expr.items.slice(1);
  let i = 0;
  while (i < items.length - 1) {
    const name = atomValue(items[i]);
    const action = sexpToKeyAction(items[i + 1]);
    fakekeys.push({ name, action });
    i += 2;
  }
  return fakekeys;
}
