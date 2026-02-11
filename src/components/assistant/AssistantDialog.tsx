// ============================================================================
// AI Assistant Dialog
// ============================================================================

import { useState, useRef, useEffect } from 'react';
import { cn } from '../../lib/utils';
import { useConfigStore } from '../../lib/config-state';
import { generateConfig } from '../../lib/kanata/generator';
import { parseKanataConfig } from '../../lib/kanata/parser';
import {
  getOpenAIConfig,
  sendAssistantRequest,
  extractConfigFromResponse,
} from '../../lib/openai';

interface AssistantDialogProps {
  open: boolean;
  onClose: () => void;
}

type DialogState =
  | { step: 'input' }
  | { step: 'loading' }
  | { step: 'preview'; configText: string; explanation: string }
  | { step: 'error'; message: string };

export function AssistantDialog({ open, onClose }: AssistantDialogProps) {
  const configStore = useConfigStore();
  const [prompt, setPrompt] = useState('');
  const [state, setState] = useState<DialogState>({ step: 'input' });
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (open && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [open]);

  if (!open) return null;

  async function handleSend() {
    const trimmed = prompt.trim();
    if (!trimmed) return;

    const { apiKey, baseUrl, model } = getOpenAIConfig();
    if (!apiKey) {
      setState({ step: 'error', message: 'API key not configured. Set it in Settings.' });
      return;
    }

    setState({ step: 'loading' });

    try {
      const currentConfigText = generateConfig(configStore.currentConfig);
      const response = await sendAssistantRequest(trimmed, currentConfigText, apiKey, baseUrl, model);
      const configText = extractConfigFromResponse(response);

      // Validate that the extracted config parses
      try {
        parseKanataConfig(configText);
      } catch (parseErr) {
        setState({
          step: 'error',
          message: `AI returned invalid config: ${parseErr instanceof Error ? parseErr.message : String(parseErr)}`,
        });
        return;
      }

      // Extract explanation (text outside code fences)
      const explanation = response
        .replace(/```(?:kbd|kanata)?\s*\n[\s\S]*?```/, '')
        .trim();

      setState({ step: 'preview', configText, explanation });
    } catch (err) {
      setState({
        step: 'error',
        message: err instanceof Error ? err.message : String(err),
      });
    }
  }

  function handleAccept() {
    if (state.step !== 'preview') return;
    try {
      const parsed = parseKanataConfig(state.configText);
      configStore.setConfig(parsed);
      configStore.setDirty(true);
      setPrompt('');
      setState({ step: 'input' });
      onClose();
    } catch (err) {
      setState({
        step: 'error',
        message: `Failed to apply config: ${err instanceof Error ? err.message : String(err)}`,
      });
    }
  }

  function handleReject() {
    setState({ step: 'input' });
  }

  function handleBack() {
    setState({ step: 'input' });
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleSend();
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
      onClick={(e) => {
        if (e.target === e.currentTarget && state.step !== 'loading') onClose();
      }}
    >
      <div
        className={cn(
          'relative mx-4 flex max-h-[80vh] w-full max-w-xl flex-col rounded-lg border border-border bg-background shadow-xl',
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <h2 className="text-sm font-semibold text-foreground">AI Assistant</h2>
          <button
            type="button"
            onClick={onClose}
            disabled={state.step === 'loading'}
            className="text-muted-foreground hover:text-foreground disabled:opacity-50"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4">
          {/* Input step */}
          {state.step === 'input' && (
            <div className="space-y-3">
              <p className="text-xs text-muted-foreground">
                Describe what you want to change in your kanata config. The AI will generate an
                updated configuration for you to review.
              </p>
              <textarea
                ref={textareaRef}
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                onKeyDown={handleKeyDown}
                rows={4}
                placeholder="e.g. Add home row mods with GACS order and 200ms tap/hold timeouts..."
                className={cn(
                  'w-full resize-none rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground',
                  'placeholder:text-muted-foreground/50',
                  'focus:outline-none focus:ring-1 focus:ring-primary',
                )}
              />
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-muted-foreground/60">Ctrl+Enter to send</span>
                <button
                  type="button"
                  onClick={handleSend}
                  disabled={!prompt.trim()}
                  className={cn(
                    'rounded-md px-4 py-1.5 text-xs font-medium transition-colors',
                    'bg-primary text-primary-foreground hover:bg-primary/90',
                    'disabled:opacity-50 disabled:cursor-not-allowed',
                  )}
                >
                  Send
                </button>
              </div>
            </div>
          )}

          {/* Loading step */}
          {state.step === 'loading' && (
            <div className="flex flex-col items-center justify-center gap-3 py-8">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-muted-foreground border-t-primary" />
              <p className="text-xs text-muted-foreground">Generating config...</p>
            </div>
          )}

          {/* Preview step */}
          {state.step === 'preview' && (
            <div className="space-y-3">
              {state.explanation && (
                <p className="text-xs text-muted-foreground">{state.explanation}</p>
              )}
              <div className="space-y-1.5">
                <span className="text-xs font-medium text-foreground">Generated config:</span>
                <pre
                  className={cn(
                    'max-h-64 overflow-auto rounded-md border border-border bg-muted/50 p-3 text-xs text-foreground',
                    'font-mono leading-relaxed',
                  )}
                >
                  {state.configText}
                </pre>
              </div>
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  onClick={handleReject}
                  className={cn(
                    'rounded-md px-4 py-1.5 text-xs font-medium transition-colors',
                    'border border-border bg-background text-foreground hover:bg-muted',
                  )}
                >
                  Reject
                </button>
                <button
                  type="button"
                  onClick={handleAccept}
                  className={cn(
                    'rounded-md px-4 py-1.5 text-xs font-medium transition-colors',
                    'bg-primary text-primary-foreground hover:bg-primary/90',
                  )}
                >
                  Accept
                </button>
              </div>
            </div>
          )}

          {/* Error step */}
          {state.step === 'error' && (
            <div className="space-y-3">
              <div className="rounded-md border border-red-300 bg-red-50 p-3 dark:border-red-800 dark:bg-red-950/30">
                <p className="text-xs text-red-700 dark:text-red-400">{state.message}</p>
              </div>
              <button
                type="button"
                onClick={handleBack}
                className={cn(
                  'rounded-md px-4 py-1.5 text-xs font-medium transition-colors',
                  'border border-border bg-background text-foreground hover:bg-muted',
                )}
              >
                Back
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
