// ============================================================================
// KeyInspector - Shows detailed action info for a selected key
// ============================================================================

import type { KeyAction, Alias, TapHoldAction, LayerAction, OneShotAction, TapDanceAction, MultiAction, MacroAction, FakeKeyOpAction } from '../../lib/kanata/types';
import { getKeyLabel, resolveAlias, MODIFIER_LABELS } from '../../lib/kanata/keys';
import { keyActionToString } from '../../lib/kanata/generator';

interface KeyInspectorProps {
  keyName: string;
  action: KeyAction | undefined;
  aliases: Alias[];
}

function getActionTypeName(action: KeyAction): string {
  if (typeof action === 'string') {
    if (action === '_') return 'Transparent';
    if (action === 'XX') return 'No-op (blocked)';
    if (action === 'lrld') return 'Live reload';
    return 'Plain key';
  }
  switch (action.type) {
    case 'alias-ref': return 'Alias reference';
    case 'tap-hold': return 'Tap-Hold';
    case 'multi': return 'Multi action';
    case 'layer-action': return 'Layer action';
    case 'one-shot': return 'One-shot';
    case 'tap-dance': return 'Tap dance';
    case 'macro': return 'Macro';
    case 'fakekey-op': return 'Fake key operation';
    case 'generic': return 'Generic action';
    default: return 'Unknown';
  }
}

function ActionLabel({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline gap-2">
      <span className="text-xs text-muted-foreground shrink-0">{label}:</span>
      <code className="text-xs rounded bg-muted px-1.5 py-0.5 break-all">{value}</code>
    </div>
  );
}

function formatAction(action: KeyAction): string {
  if (typeof action === 'string') return getKeyLabel(action);
  return keyActionToString(action);
}

function TapHoldDetails({ action }: { action: TapHoldAction }) {
  return (
    <div className="space-y-1.5">
      <ActionLabel label="Variant" value={action.variant} />
      <ActionLabel label="Tap timeout" value={`${action.tapTimeout}ms`} />
      <ActionLabel label="Hold timeout" value={`${action.holdTimeout}ms`} />
      <ActionLabel label="Tap action" value={formatAction(action.tapAction)} />
      <ActionLabel label="Hold action" value={formatAction(action.holdAction)} />
      {action.timeoutAction && (
        <ActionLabel label="Timeout action" value={formatAction(action.timeoutAction)} />
      )}
    </div>
  );
}

function LayerDetails({ action }: { action: LayerAction }) {
  return (
    <div className="space-y-1.5">
      <ActionLabel label="Operation" value={action.op} />
      <ActionLabel label="Target layer" value={action.layer} />
    </div>
  );
}

export function KeyInspector({ keyName, action, aliases }: KeyInspectorProps) {
  if (!action) {
    return (
      <div className="rounded-lg border border-border bg-card p-4">
        <p className="text-sm text-muted-foreground">Select a key to inspect its action.</p>
      </div>
    );
  }

  const resolved = resolveAlias(action, aliases);
  const isAlias = typeof action !== 'string' && action.type === 'alias-ref';
  const modLabel = typeof action === 'string' ? MODIFIER_LABELS[action] : undefined;

  return (
    <div className="rounded-lg border border-border bg-card p-4 space-y-3">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-md bg-muted font-mono text-sm font-semibold">
          {getKeyLabel(keyName)}
        </div>
        <div>
          <p className="text-sm font-medium">{keyName}</p>
          <p className="text-xs text-muted-foreground">{getActionTypeName(action)}</p>
        </div>
        {modLabel && (
          <span className="ml-auto rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800 dark:bg-blue-900 dark:text-blue-200">
            {modLabel}
          </span>
        )}
      </div>

      {isAlias && (
        <ActionLabel label="Alias" value={`@${(action as { name: string }).name}`} />
      )}

      {resolved && typeof resolved !== 'string' && resolved.type === 'tap-hold' && (
        <TapHoldDetails action={resolved as TapHoldAction} />
      )}

      {resolved && typeof resolved !== 'string' && resolved.type === 'layer-action' && (
        <LayerDetails action={resolved as LayerAction} />
      )}

      {resolved && typeof resolved !== 'string' && resolved.type === 'one-shot' && (
        <div className="space-y-1.5">
          <ActionLabel label="Variant" value={(resolved as OneShotAction).variant} />
          <ActionLabel label="Timeout" value={`${(resolved as OneShotAction).timeout}ms`} />
          <ActionLabel label="Action" value={formatAction((resolved as OneShotAction).action)} />
        </div>
      )}

      {resolved && typeof resolved !== 'string' && resolved.type === 'tap-dance' && (
        <div className="space-y-1.5">
          <ActionLabel label="Variant" value={(resolved as TapDanceAction).variant} />
          <ActionLabel label="Timeout" value={`${(resolved as TapDanceAction).timeout}ms`} />
          <ActionLabel
            label="Actions"
            value={(resolved as TapDanceAction).actions.map(formatAction).join(', ')}
          />
        </div>
      )}

      {resolved && typeof resolved !== 'string' && resolved.type === 'multi' && (
        <div className="space-y-1.5">
          <ActionLabel
            label="Actions"
            value={(resolved as MultiAction).actions.map(formatAction).join(', ')}
          />
        </div>
      )}

      {resolved && typeof resolved !== 'string' && resolved.type === 'macro' && (
        <div className="space-y-1.5">
          <ActionLabel label="Variant" value={(resolved as MacroAction).variant} />
        </div>
      )}

      {resolved && typeof resolved !== 'string' && resolved.type === 'fakekey-op' && (
        <div className="space-y-1.5">
          <ActionLabel label="Key name" value={(resolved as FakeKeyOpAction).name} />
          <ActionLabel label="Operation" value={(resolved as FakeKeyOpAction).op} />
        </div>
      )}

      <div className="pt-2 border-t border-border">
        <p className="text-xs text-muted-foreground mb-1">Raw config output:</p>
        <code className="block text-xs rounded bg-zinc-950 dark:bg-zinc-900 p-2 text-zinc-300 break-all">
          {typeof action === 'string' ? action : keyActionToString(action)}
        </code>
      </div>
    </div>
  );
}
