import { useMemo } from "react";
import { KeyboardKey, KEY_GAP } from "./KeyboardKey";
import { QWERTY_LAYOUT } from "../../lib/kanata/keys";
import type { KeyAction } from "../../lib/kanata/types";
import type { KeyDef } from "../../lib/kanata/types";

// ---------------------------------------------------------------------------
// Layout row computation
// ---------------------------------------------------------------------------

interface LayoutRow {
  rowIndex: number;
  keys: KeyDef[];
}

function groupByRow(layout: KeyDef[]): LayoutRow[] {
  const map = new Map<number, KeyDef[]>();
  for (const key of layout) {
    const arr = map.get(key.row) ?? [];
    arr.push(key);
    map.set(key.row, arr);
  }
  return Array.from(map.entries())
    .sort(([a], [b]) => a - b)
    .map(([rowIndex, keys]) => ({ rowIndex, keys }));
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export interface KeyboardLayoutProps {
  /** Set of key names in defsrc (determines which keys are active). */
  defsrc: Set<string>;
  /** Map from key name to its current layer action. */
  layerActions: Map<string, KeyAction>;
  /** Currently selected key name, if any. */
  selectedKey?: string | null;
  /** Called when a key is clicked. */
  onKeySelect?: (keyName: string) => void;
}

export function KeyboardLayout({
  defsrc,
  layerActions,
  selectedKey,
  onKeySelect,
}: KeyboardLayoutProps) {
  const rows = useMemo(() => groupByRow(QWERTY_LAYOUT), []);

  return (
    <div className="inline-flex flex-col gap-1">
      {rows.map((row) => (
        <div
          key={row.rowIndex}
          className="flex"
          style={{ gap: `${KEY_GAP}px` }}
        >
          {row.keys.map((keyDef) => {
            const inDefsrc = defsrc.has(keyDef.name);
            const action = layerActions.get(keyDef.name);

            return (
              <KeyboardKey
                key={keyDef.name}
                keyName={keyDef.name}
                action={action}
                width={keyDef.width}
                selected={selectedKey === keyDef.name}
                inDefsrc={inDefsrc}
                onClick={() => onKeySelect?.(keyDef.name)}
              />
            );
          })}
        </div>
      ))}
    </div>
  );
}
