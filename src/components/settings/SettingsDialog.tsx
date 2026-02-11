// ============================================================================
// Settings Dialog - Modal container for all settings
// ============================================================================

import { cn } from '../../lib/utils';
import { ThemeToggle } from './ThemeToggle';
import { AutostartToggle } from './AutostartToggle';
import { OpenAISettings } from './OpenAISettings';

interface SettingsDialogProps {
  open: boolean;
  onClose: () => void;
}

export function SettingsDialog({ open, onClose }: SettingsDialogProps) {
  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className={cn(
          'relative mx-4 flex max-h-[80vh] w-full max-w-lg flex-col rounded-lg border border-border bg-background shadow-xl',
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h2 className="text-sm font-semibold text-foreground">Settings</h2>
          <button
            type="button"
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {/* Appearance */}
          <div className="space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Appearance</h3>
            <div className="flex items-center justify-between">
              <span className="text-sm text-foreground">Theme</span>
              <ThemeToggle />
            </div>
          </div>

          <div className="border-t border-border" />

          {/* System */}
          <div className="space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">System</h3>
            <AutostartToggle />
          </div>

          <div className="border-t border-border" />

          {/* AI Assistant */}
          <OpenAISettings />
        </div>
      </div>
    </div>
  );
}
