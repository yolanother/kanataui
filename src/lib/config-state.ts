// ============================================================================
// Config State Management
// ============================================================================

import { createContext, useContext } from 'react';
import type { KanataConfig } from './kanata/types';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type LayoutType = 'qwerty' | 'corne' | 'lily58' | 'moonlander' | 'custom';

export interface ConfigState {
  currentConfig: KanataConfig;
  selectedLayout: LayoutType;
  configFilePath: string;
  isDirty: boolean;
}

export interface ConfigActions {
  setConfig: (config: KanataConfig) => void;
  setLayout: (layout: LayoutType) => void;
  setConfigFilePath: (path: string) => void;
  setDirty: (dirty: boolean) => void;
}

export type ConfigStore = ConfigState & ConfigActions;

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

export const ConfigContext = createContext<ConfigStore | null>(null);

export function useConfigStore(): ConfigStore {
  const ctx = useContext(ConfigContext);
  if (!ctx) {
    throw new Error('useConfigStore must be used within a ConfigContext.Provider');
  }
  return ctx;
}
