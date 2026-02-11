// ============================================================================
// OpenAI Settings Panel
// ============================================================================

import { useState, useEffect, useCallback } from 'react';
import { cn } from '../../lib/utils';
import { getOpenAIConfig, setOpenAIConfig, testConnection, fetchModels } from '../../lib/openai';

type ConnectionStatus = 'idle' | 'testing' | 'success' | 'error';

const FALLBACK_MODELS = ['gpt-4o', 'gpt-4o-mini', 'gpt-4.1', 'gpt-4.1-mini', 'gpt-4.1-nano'];

export function OpenAISettings() {
  const initial = getOpenAIConfig();
  const [apiKey, setApiKey] = useState(initial.apiKey);
  const [baseUrl, setBaseUrl] = useState(initial.baseUrl);
  const [model, setModel] = useState(initial.model);
  const [customModel, setCustomModel] = useState('');
  const [useCustomModel, setUseCustomModel] = useState(false);
  const [status, setStatus] = useState<ConnectionStatus>('idle');
  const [availableModels, setAvailableModels] = useState<string[]>(FALLBACK_MODELS);
  const [modelsLoading, setModelsLoading] = useState(false);
  const [modelsFetched, setModelsFetched] = useState(false);

  const loadModels = useCallback(async (key: string, url: string) => {
    if (!key) return;
    setModelsLoading(true);
    try {
      const models = await fetchModels(key, url);
      if (models.length > 0) {
        setAvailableModels(models);
        setModelsFetched(true);
        // If current model isn't in list and isn't custom, keep it
        if (!models.includes(model) && model) {
          setUseCustomModel(true);
          setCustomModel(model);
        }
      }
    } catch {
      // Keep fallback models if fetch fails
    } finally {
      setModelsLoading(false);
    }
  }, [model]);

  // Fetch models when API key or base URL changes
  useEffect(() => {
    if (apiKey) {
      loadModels(apiKey, baseUrl);
    }
  }, []); // Only on mount; manual refresh available

  function handleApiKeyChange(value: string) {
    setApiKey(value);
    setOpenAIConfig({ apiKey: value });
    setStatus('idle');
    setModelsFetched(false);
  }

  function handleBaseUrlChange(value: string) {
    setBaseUrl(value);
    setOpenAIConfig({ baseUrl: value });
    setStatus('idle');
    setModelsFetched(false);
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

  async function handleRefreshModels() {
    await loadModels(apiKey, baseUrl);
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
        <div className="flex items-center justify-between">
          <label htmlFor="openai-model" className="block text-xs font-medium text-muted-foreground">
            Model
          </label>
          <button
            type="button"
            onClick={handleRefreshModels}
            disabled={!apiKey || modelsLoading}
            className="text-xs text-muted-foreground hover:text-foreground disabled:opacity-50 disabled:cursor-not-allowed"
            title="Refresh model list from API"
          >
            {modelsLoading ? 'Loading...' : modelsFetched ? 'Refresh models' : 'Fetch models'}
          </button>
        </div>
        <select
          id="openai-model"
          value={useCustomModel ? '__custom__' : model}
          onChange={(e) => handleModelChange(e.target.value)}
          className={cn(
            'w-full rounded-md border border-border bg-background px-3 py-1.5 text-sm text-foreground',
            'focus:outline-none focus:ring-1 focus:ring-primary',
          )}
        >
          {availableModels.map((m) => (
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
