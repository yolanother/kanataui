import type { LucideIcon } from 'lucide-react';
import {
  ArrowUp, ArrowDown, ArrowLeft, ArrowRight,
  CornerDownLeft, Delete, Trash2,
  ChevronUp, Command, Option,
  Space, VolumeX, Volume2, Volume1,
  Play, SkipForward, SkipBack,
  Home, ChevronsUp, ChevronsDown,
  ArrowRightToLine, X,
} from 'lucide-react';

/** Map from kanata key name to a Lucide icon component. */
export const KEY_ICON_MAP: Record<string, LucideIcon> = {
  // Arrows
  up: ArrowUp,
  down: ArrowDown,
  left: ArrowLeft,
  rght: ArrowRight,
  // Enter
  ret: CornerDownLeft,
  // Backspace & Delete
  bspc: Delete,
  del: Trash2,
  // Modifiers
  lsft: ChevronUp,
  rsft: ChevronUp,
  lmet: Command,
  rmet: Command,
  lalt: Option,
  ralt: Option,
  // Space
  spc: Space,
  // Media
  mute: VolumeX,
  volu: Volume2,
  vold: Volume1,
  pp: Play,
  next: SkipForward,
  prev: SkipBack,
  // Navigation
  home: Home,
  pgup: ChevronsUp,
  pgdn: ChevronsDown,
  // Tab
  tab: ArrowRightToLine,
  // Esc
  esc: X,
};

/** Get the icon component for a kanata key name, or undefined. */
export function getKeyIcon(keyName: string): LucideIcon | undefined {
  return KEY_ICON_MAP[keyName];
}
