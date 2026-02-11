// ============================================================================
// Kanata .kbd Config Generator
// ============================================================================

import type {
  KanataConfig,
  KeyAction,
  AliasRef,
  TapHoldAction,
  MultiAction,
  LayerAction,
  GenericAction,
  SExp,
  SList,
  Layer,
  Alias,
  Variable,
  FakeKey,
} from './types';

// ---------------------------------------------------------------------------
// S-Expression serializer
// ---------------------------------------------------------------------------

/** Serialize an SExp back to string form. */
export function sexpToString(s: SExp): string {
  if (s.type === 'atom') return s.value;
  const inner = (s as SList).items.map(sexpToString).join(' ');
  return `(${inner})`;
}

// ---------------------------------------------------------------------------
// Key action serializer
// ---------------------------------------------------------------------------

/** Serialize a KeyAction back to its kanata string form. */
export function keyActionToString(action: KeyAction): string {
  if (typeof action === 'string') return action;

  switch (action.type) {
    case 'alias-ref':
      return `@${(action as AliasRef).name}`;

    case 'tap-hold':
      return tapHoldToString(action as TapHoldAction);

    case 'multi':
      return `(multi ${(action as MultiAction).actions.map(keyActionToString).join(' ')})`;

    case 'layer-action': {
      const la = action as LayerAction;
      return `(${la.op} ${la.layer})`;
    }

    case 'one-shot':
      return `(${action.variant} ${action.timeout} ${keyActionToString(action.action)})`;

    case 'tap-dance':
      return `(${action.variant} ${action.timeout} (${action.actions.map(keyActionToString).join(' ')}))`;

    case 'generic':
      return sexpToString((action as GenericAction).sexp);

    default:
      return String(action);
  }
}

function tapHoldToString(th: TapHoldAction): string {
  const parts: string[] = [
    th.variant,
    String(th.tapTimeout),
    String(th.holdTimeout),
    keyActionToString(th.tapAction),
    keyActionToString(th.holdAction),
  ];

  if (th.timeoutAction !== undefined) {
    parts.push(keyActionToString(th.timeoutAction));
  }

  if (th.extraKeys !== undefined) {
    parts.push(sexpToString(th.extraKeys));
  }

  if (th.tapKeys !== undefined) {
    parts.push(sexpToString(th.tapKeys));
  }

  return `(${parts.join(' ')})`;
}

// ---------------------------------------------------------------------------
// Full config generator
// ---------------------------------------------------------------------------

/**
 * Generate a complete .kbd config file string from a KanataConfig object.
 */
export function generateConfig(config: KanataConfig): string {
  const sections: string[] = [];

  // defcfg
  sections.push(generateDefcfg(config));

  // defsrc
  sections.push(generateDefsrc(config));

  // defvar
  if (config.variables.length > 0) {
    sections.push(generateDefvar(config.variables));
  }

  // deffakekeys
  if (config.fakekeys.length > 0) {
    sections.push(generateDeffakekeys(config.fakekeys));
  }

  // defalias
  if (config.aliases.length > 0) {
    sections.push(generateDefalias(config.aliases));
  }

  // deflayers
  for (const layer of config.layers) {
    sections.push(generateDeflayer(layer, config.defsrc));
  }

  return sections.join('\n') + '\n';
}

// ---------------------------------------------------------------------------
// Section generators
// ---------------------------------------------------------------------------

function generateDefcfg(config: KanataConfig): string {
  const entries = Object.entries(config.defcfg);
  if (entries.length === 0) return '(defcfg\n)\n';

  const lines = entries.map(([key, val]) => {
    const v = typeof val === 'string' ? val : sexpToString(val);
    return `  ${key} ${v}`;
  });

  return `(defcfg\n${lines.join('\n')}\n)\n`;
}

function generateDefsrc(config: KanataConfig): string {
  const formatted = formatKeyRow(config.defsrc);
  return `(defsrc\n  ${formatted}\n)\n`;
}

function generateDefvar(variables: Variable[]): string {
  const lines = variables.map((v) => {
    const val = typeof v.value === 'string' ? v.value : sexpToString(v.value);
    return `  ${v.name} ${val}`;
  });
  return `(defvar\n${lines.join('\n')}\n)\n`;
}

function generateDeffakekeys(fakekeys: FakeKey[]): string {
  const lines = fakekeys.map(
    (fk) => `  ${fk.name} ${keyActionToString(fk.action)}`
  );
  return `(deffakekeys\n${lines.join('\n')}\n)\n`;
}

function generateDefalias(aliases: Alias[]): string {
  const lines = aliases.map(
    (a) => `  ${a.name} ${keyActionToString(a.action)}`
  );
  return `(defalias\n${lines.join('\n')}\n)\n`;
}

function generateDeflayer(layer: Layer, defsrc: string[]): string {
  const keyStrings = layer.keys.map(keyActionToString);
  const formatted = formatKeyRowAligned(keyStrings, defsrc);
  return `(deflayer ${layer.name}\n  ${formatted}\n)\n`;
}

// ---------------------------------------------------------------------------
// Formatting helpers
// ---------------------------------------------------------------------------

/**
 * Format a list of key names into space-separated groups that roughly
 * match standard keyboard row widths. Since we don't know the exact
 * physical layout we just output them with consistent spacing.
 */
function formatKeyRow(keys: string[]): string {
  return keys.map((k) => k.padEnd(4)).join(' ').trimEnd();
}

/**
 * Align layer keys to match defsrc column widths for readability.
 */
function formatKeyRowAligned(layerKeys: string[], defsrc: string[]): string {
  const result: string[] = [];
  for (let i = 0; i < layerKeys.length; i++) {
    const srcWidth = defsrc[i] ? Math.max(defsrc[i].length, 1) : 1;
    const padded = layerKeys[i].padEnd(srcWidth);
    result.push(padded);
  }
  return result.join(' ').trimEnd();
}
