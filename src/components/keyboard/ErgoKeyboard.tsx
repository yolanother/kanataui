// ============================================================================
// ErgoKeyboard - Split keyboard visual renderer
// ============================================================================

import type { KeyAction, Alias } from '../../lib/kanata/types';
import type { ErgoLayoutDef, KeyPosition } from '../../lib/kanata/ergo-layouts';
import { getTotalKeys } from '../../lib/kanata/ergo-layouts';
import { ErgoKey } from './ErgoKey';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const KEY_SIZE = 48;
const KEY_GAP = 4;
const HALF_GAP = 64; // gap between left and right halves
const THUMB_OFFSET_Y = 16; // extra spacing above thumb cluster

// ---------------------------------------------------------------------------
// Layout geometry helpers
// ---------------------------------------------------------------------------

interface HalfBounds {
  width: number;
  height: number;
}

function computeHalfBounds(
  keys: KeyPosition[],
  thumbKeys: KeyPosition[],
  rows: number,
): HalfBounds {
  let maxCol = 0;
  for (const k of keys) {
    const right = (k.col + (k.width ?? 1));
    if (right > maxCol) maxCol = right;
  }
  for (const k of thumbKeys) {
    const right = (k.col + (k.width ?? 1));
    if (right > maxCol) maxCol = right;
  }

  const maxRow = rows; // regular keys occupy rows 0..rows-1
  // Thumb keys sit below the main keys
  let thumbMaxRow = 0;
  for (const k of thumbKeys) {
    const bottom = k.row + (k.height ?? 1);
    if (bottom > thumbMaxRow) thumbMaxRow = bottom;
  }

  const mainHeight = maxRow * (KEY_SIZE + KEY_GAP);
  const thumbHeight = thumbKeys.length > 0
    ? THUMB_OFFSET_Y + (thumbMaxRow - maxRow) * (KEY_SIZE + KEY_GAP)
    : 0;

  return {
    width: maxCol * (KEY_SIZE + KEY_GAP),
    height: mainHeight + thumbHeight,
  };
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export interface ErgoKeyboardProps {
  layout: ErgoLayoutDef;
  /** Key actions for the current layer (length = total keys in layout). */
  layerKeys: KeyAction[];
  /** Index of the currently selected key (or -1 / undefined). */
  selectedKeyIndex?: number;
  /** Aliases from config for resolving alias-ref actions. */
  aliases?: Alias[];
  /** Callback when a key is clicked. */
  onKeyClick?: (keyIndex: number) => void;
}

export function ErgoKeyboard({
  layout,
  layerKeys,
  selectedKeyIndex,
  aliases,
  onKeyClick,
}: ErgoKeyboardProps) {
  const { leftKeys, rightKeys, leftThumb, rightThumb, defaultDefsrc, rows } = layout;
  const total = getTotalKeys(layout);

  // Build a flat list of rendering data.
  // Order: left main rows, right main rows, left thumb, right thumb.
  // This must match the defsrc ordering.

  const leftBounds = computeHalfBounds(leftKeys, leftThumb, rows);
  const rightBounds = computeHalfBounds(rightKeys, rightThumb, rows);

  // Render helpers: computes absolute left offset for right half
  const rightHalfX = leftBounds.width + HALF_GAP;
  const totalWidth = rightHalfX + rightBounds.width;
  const totalHeight = Math.max(leftBounds.height, rightBounds.height);

  // We need to render in defsrc order. The default ordering is:
  // For each row: left cols, right cols (interleaved by row)
  // Then left thumbs, right thumbs.
  //
  // We'll reconstruct groups per row for correct indexing.

  const elements: React.ReactNode[] = [];
  let keyIdx = 0;

  // Group main keys by row
  const leftByRow: KeyPosition[][] = Array.from({ length: rows }, () => []);
  for (const k of leftKeys) {
    leftByRow[k.row].push(k);
  }
  const rightByRow: KeyPosition[][] = Array.from({ length: rows }, () => []);
  for (const k of rightKeys) {
    rightByRow[k.row].push(k);
  }

  // Sort each row by column
  for (let r = 0; r < rows; r++) {
    leftByRow[r].sort((a, b) => a.col - b.col);
    rightByRow[r].sort((a, b) => a.col - b.col);
  }

  // Render row by row: left then right
  for (let r = 0; r < rows; r++) {
    for (const pos of leftByRow[r]) {
      const idx = keyIdx++;
      elements.push(
        <div key={`l-${idx}`} style={{ position: 'absolute', left: 0 }}>
          <ErgoKey
            keyIndex={idx}
            action={layerKeys[idx]}
            defsrcName={defaultDefsrc[idx] ?? `k${idx}`}
            row={pos.row}
            col={pos.col}
            offsetY={pos.offsetY}
            width={pos.width}
            height={pos.height}
            selected={selectedKeyIndex === idx}
            aliases={aliases}
            onClick={() => onKeyClick?.(idx)}
          />
        </div>,
      );
    }
    for (const pos of rightByRow[r]) {
      const idx = keyIdx++;
      elements.push(
        <div key={`r-${idx}`} style={{ position: 'absolute', left: rightHalfX }}>
          <ErgoKey
            keyIndex={idx}
            action={layerKeys[idx]}
            defsrcName={defaultDefsrc[idx] ?? `k${idx}`}
            row={pos.row}
            col={pos.col}
            offsetY={pos.offsetY}
            width={pos.width}
            height={pos.height}
            selected={selectedKeyIndex === idx}
            aliases={aliases}
            onClick={() => onKeyClick?.(idx)}
          />
        </div>,
      );
    }
  }

  // Left thumbs
  const sortedLeftThumb = [...leftThumb].sort((a, b) => a.col - b.col);
  for (const pos of sortedLeftThumb) {
    const idx = keyIdx++;
    elements.push(
      <div key={`lt-${idx}`} style={{ position: 'absolute', left: 0 }}>
        <ErgoKey
          keyIndex={idx}
          action={layerKeys[idx]}
          defsrcName={defaultDefsrc[idx] ?? `k${idx}`}
          row={pos.row}
          col={pos.col}
          offsetY={THUMB_OFFSET_Y / (KEY_SIZE + KEY_GAP)}
          rotation={pos.rotation}
          width={pos.width}
          height={pos.height}
          selected={selectedKeyIndex === idx}
          aliases={aliases}
          onClick={() => onKeyClick?.(idx)}
        />
      </div>,
    );
  }

  // Right thumbs
  const sortedRightThumb = [...rightThumb].sort((a, b) => a.col - b.col);
  for (const pos of sortedRightThumb) {
    const idx = keyIdx++;
    elements.push(
      <div key={`rt-${idx}`} style={{ position: 'absolute', left: rightHalfX }}>
        <ErgoKey
          keyIndex={idx}
          action={layerKeys[idx]}
          defsrcName={defaultDefsrc[idx] ?? `k${idx}`}
          row={pos.row}
          col={pos.col}
          offsetY={THUMB_OFFSET_Y / (KEY_SIZE + KEY_GAP)}
          rotation={pos.rotation}
          width={pos.width}
          height={pos.height}
          selected={selectedKeyIndex === idx}
          aliases={aliases}
          onClick={() => onKeyClick?.(idx)}
        />
      </div>,
    );
  }

  // Safety: if defsrc is longer than rendered keys, ignore extras
  void total;

  return (
    <div className="flex justify-center overflow-auto py-4">
      <div
        className="relative"
        style={{ width: totalWidth, height: totalHeight + KEY_SIZE }}
      >
        {elements}
      </div>
    </div>
  );
}
