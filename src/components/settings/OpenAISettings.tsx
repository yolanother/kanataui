// ============================================================================
// OpenAI Settings Panel
// ============================================================================

import { useState } from 'react';
import { cn } from '../../lib/utils';
import { getOpenAIConfig, setOpenAIConfig, testConnection } from '../../lib/openai';

type ConnectionStatus = 'idle' | 'testing' | 'success' | 'error';

const MODEL_OPTIONS = ['gpt-4o', 'gpt-4o-mini', 'gpt-4.1', 'gpt-4.1-mini', 'gpt-4.1-nano'];

export function OpenAISettings() {
  const initial = getOpenAIConfig();
  const [apiKey, setApiKey] = useState(initial.apiKey);
  const [baseUrl, setBaseUrl] = useState(initial.baseUrl);
  const [model, setModel] = useState(initial.model);
  const [customModel, setCustomModel] = useState('');
  const [useCustomModel, setUseCustomModel] = useState(
    !MODEL_OPTIONS.includes(initial.model) && initial.model !== '',
  );
  const [status, setStatus] = useState<ConnectionStatus>('idle');

  function handleApiKeyChange(value: string) {
    setApiKey(value);
    setOpenAIConfig({ apiKey: value });
    setStatus('idle');
  }

  function handleBaseUrlChange(value: string) {
    setBaseUrl(value);
    setOpenAIConfig({ baseUrl: value });
    setStatus('idle');
  }

  function handleModelChange(value: string) {
    if (value === '__custom__') {
      setUseCustomModel(true);
      if (customModel) {
        setOpenAIConfig({ model: customModel });
      }
    } else {
      setUseCustomModel(false);
      setModel(value);
      setOpenAIConfig({ model: value });
    }
    setStatus('idle');
  }

  function handleCustomModelChange(value: string) {
    setCustomModel(value);
    setModel(value);
    setOpenAIConfig({ model: value });
    setStatus('idle');
  }

  async function handleTestConnection() {
    const activeModel = useCustomModel ? customModel : model;
    if (!apiKey || !activeModel) return;
    setStatus('testing');
    try {
      const ok = await testConnection(apiKey, baseUrl, activeModel);
      setStatus(ok ? 'success' : 'error');
    } catch {
      setStatus('error');
    }
  }

  const activeModel = useCustomModel ? customModel : model;

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold text-foreground">AI Assistant</h3>

      {/* API Key */}
      <div className="space-y-1.5">
        <label htmlFor="openai-key" className="block text-xs font-medium text-muted-foreground">
          API Key
        </label>
        <input
          id="openai-key"
          type="password"
          value={apiKey}
          onChange={(e) => handleApiKeyChange(e.target.value)}
          placeholder="sk-..."
          className={cn(
            'w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm text-foreground',
            'placeholder:text-muted-foreground/50',
            'focus:outline-none focus:ring-1 focus:ring-primary',
          )}
        />
      </div>

      {/* Base URL */}
      <div className="space-y-1.5">
        <label htmlFor="openai-url" className="block text-xs font-medium text-muted-foreground">
          API Base URL
        </label>
        <input
          id="openai-url"
          type="text"
          value={baseUrl}
          onChange={(e) => handleBaseUrlChange(e.target.value)}
          placeholder="https://api.openai.com/v1"
          className={cn(
            'w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm text-foreground',
            'placeholder:text-muted-foreground/50',
            'focus:outline-none focus:ring-1 focus:ring-primary',
          )}
        />
      </div>

      {/* Model */}
      <div className="space-y-1.5">
        <label htmlFor="openai-model" className="block text-xs font-medium text-muted-foreground">
          Model
        </label>
        <select
          id="openai-model"
          value={useCustomModel ? '__custom__' : model}
          onChange={(e) => handleModelChange(e.target.value)}
          className={cn(
            'w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm text-foreground',
            'focus:outline-none focus:ring-1 focus:ring-primary',
          )}
        >
          {MODEL_OPTIONS.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
          <option value="__custom__">Custom...</option>
        </select>
        {useCustomModel && (
          <input
            type="text"
            value={customModel}
            onChange={(e) => handleCustomModelChange(e.target.value)}
            placeholder="Enter model name..."
            className={cn(
              'mt-1.5 w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm text-foreground',
              'placeholder:text-muted-foreground/50',
              'focus:outline-none focus:ring-1 focus:ring-primary',
            )}
          />
        )}
      </div>

      {/* Test Connection */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={handleTestConnection}
          disabled={!apiKey || !activeModel || status === 'testing'}
          className={cn(
            'rounded-md px-3 py-1.5 text-xs font-medium transition-colors',
            'bg-primary text-primary-foreground hover:bg-primary/90',
            'disabled:opacity-50 disabled:cursor-not-allowed',
          )}
        >
          {status === 'testing' ? 'Testing...' : 'Test Connection'}
        </button>
        {status === 'success' && (
          <span className="text-xs font-medium text-green-600 dark:text-green-400">
            Connected
          </span>
        )}
        {status === 'error' && (
          <span className="text-xs font-medium text-red-600 dark:text-red-400">
            Connection failed
          </span>
        )}
      </div>
    </div>
  );
}
