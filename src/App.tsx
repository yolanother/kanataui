import { useState, useEffect, useCallback, useMemo } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { getCurrentWebviewWindow } from '@tauri-apps/api/webviewWindow';
import { QwertyEditor } from './components/keyboard/QwertyEditor';
import { ErgoEditor } from './components/keyboard/ErgoEditor';
import { SetupWizard } from './components/wizard';
import type { WizardResult } from './components/wizard';
import type { KanataConfig } from './lib/kanata/types';
import type { LayoutType } from './lib/config-state';
import { ConfigContext, type ConfigStore } from './lib/config-state';
import { basicHomeRowMods } from './lib/kanata/presets';
import { generateConfig } from './lib/kanata/generator';

type KanataStatus = 'stopped' | 'running';
type TabId = 'wizard' | 'editor' | 'export';

function App() {
  const [status, setStatus] = useState<KanataStatus>('stopped');
  const [activeTab, setActiveTab] = useState<TabId>('wizard');
  const [config, setConfig] = useState<KanataConfig>(() => basicHomeRowMods());
  const [selectedLayout, setSelectedLayout] = useState<LayoutType>('qwerty');
  const [selectedLayer, setSelectedLayer] = useState<string>('base');
  const [configFilePath, setConfigFilePath] = useState<string>('');
  const [isDirty, setDirty] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  // Config context value
  const configStore = useMemo<ConfigStore>(
    () => ({
      currentConfig: config,
      selectedLayout,
      configFilePath,
      isDirty,
      setConfig: (c: KanataConfig) => {
        setConfig(c);
        setDirty(true);
      },
      setLayout: setSelectedLayout,
      setConfigFilePath,
      setDirty,
    }),
    [config, selectedLayout, configFilePath, isDirty],
  );

  // Poll kanata status
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const s = await invoke<KanataStatus>('get_kanata_status');
        setStatus(s);
      } catch {
        // Backend not ready yet
      }
    }, 1000);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        getCurrentWebviewWindow().close();
      }
    };
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      clearInterval(interval);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // Resolve config dir path on mount
  useEffect(() => {
    (async () => {
      try {
        const dir = await invoke<string>('ensure_config_dir');
        const sep = dir.includes('\\') ? '\\' : '/';
        setConfigFilePath(`${dir}${sep}kanata.kbd`);
      } catch {
        // Fallback handled by empty string
      }
    })();
  }, []);

  // Wizard completion handler
  const handleWizardComplete = useCallback((result: WizardResult) => {
    setConfig(result.config);
    setSelectedLayout(result.layout);
    setDirty(true);
    setActiveTab('editor');
  }, []);

  // Save config to disk
  const handleSave = useCallback(async () => {
    if (!configFilePath) return;
    try {
      const text = generateConfig(config);
      await invoke('save_config', { path: configFilePath, content: text });
      setDirty(false);
      setSaveMessage('Saved');
      setTimeout(() => setSaveMessage(null), 2000);
    } catch (e) {
      setSaveMessage(`Error: ${e}`);
      setTimeout(() => setSaveMessage(null), 4000);
    }
  }, [config, configFilePath]);

  // Load config from disk
  const handleLoad = useCallback(async () => {
    if (!configFilePath) return;
    try {
      const text = await invoke<string>('load_config', { path: configFilePath });
      // For now, show the raw text. Full round-trip parsing can be added later.
      setSaveMessage(`Loaded ${text.length} bytes`);
      setTimeout(() => setSaveMessage(null), 2000);
    } catch (e) {
      setSaveMessage(`Error: ${e}`);
      setTimeout(() => setSaveMessage(null), 4000);
    }
  }, [configFilePath]);

  const configText = useMemo(() => generateConfig(config), [config]);
  const isErgo = selectedLayout !== 'qwerty';

  const tabs: { id: TabId; label: string }[] = [
    { id: 'wizard', label: 'Quick Setup' },
    { id: 'editor', label: isErgo ? 'Ergo Editor' : 'QWERTY Editor' },
    { id: 'export', label: 'Export' },
  ];

  return (
    <ConfigContext.Provider value={configStore}>
      <div className="flex h-screen flex-col bg-background text-foreground">
        {/* Header */}
        <header className="flex items-center justify-between border-b border-border px-6 py-3">
          <div className="flex items-center gap-3">
            <h1 className="text-lg font-semibold">KanataUI</h1>
            <span
              className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                status === 'running'
                  ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                  : 'bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400'
              }`}
            >
              {status === 'running' ? 'Running' : 'Stopped'}
            </span>
            {isDirty && (
              <span className="text-xs text-amber-500 font-medium">Unsaved changes</span>
            )}
            {saveMessage && (
              <span className="text-xs text-muted-foreground">{saveMessage}</span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleSave}
              className="rounded-md border border-border px-3 py-1.5 text-xs font-medium hover:bg-muted transition-colors"
            >
              Save
            </button>
            <button
              type="button"
              onClick={handleLoad}
              className="rounded-md border border-border px-3 py-1.5 text-xs font-medium hover:bg-muted transition-colors"
            >
              Load
            </button>
          </div>
        </header>

        {/* Tab navigation */}
        <nav className="flex border-b border-border px-6">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2.5 text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? 'border-b-2 border-primary text-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>

        {/* Tab content */}
        <main className="flex-1 overflow-auto p-6">
          {activeTab === 'wizard' && (
            <SetupWizard
              onComplete={handleWizardComplete}
              onCancel={() => setActiveTab('editor')}
            />
          )}

          {activeTab === 'editor' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base font-semibold">
                    {isErgo ? 'Ergonomic Layout Editor' : 'QWERTY Layout Editor'}
                  </h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Click a key to edit its action. Color indicates modifier assignments.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveTab('wizard')}
                  className="rounded-md border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                >
                  Re-run Quick Setup
                </button>
              </div>

              {isErgo ? (
                <ErgoEditor
                  config={config}
                  onChange={(c) => {
                    setConfig(c);
                    setDirty(true);
                  }}
                  selectedLayout={selectedLayout}
                  onLayoutChange={(id) => setSelectedLayout(id as LayoutType)}
                  selectedLayer={selectedLayer}
                  onLayerChange={setSelectedLayer}
                />
              ) : (
                <QwertyEditor
                  config={config}
                  onChange={(c) => {
                    setConfig(c);
                    setDirty(true);
                  }}
                  selectedLayer={selectedLayer}
                  onLayerChange={setSelectedLayer}
                />
              )}
            </div>
          )}

          {activeTab === 'export' && (
            <div className="space-y-4">
              <div>
                <h2 className="text-base font-semibold">Export Configuration</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  Generated kanata .kbd configuration file. Save to disk or copy to clipboard.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(configText);
                    setSaveMessage('Copied to clipboard');
                    setTimeout(() => setSaveMessage(null), 2000);
                  }}
                  className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
                >
                  Copy to Clipboard
                </button>
                <button
                  type="button"
                  onClick={handleSave}
                  className="rounded-md border border-border px-4 py-2 text-sm font-medium hover:bg-muted transition-colors"
                >
                  Save to {configFilePath || 'disk'}
                </button>
              </div>

              <pre className="max-h-[60vh] overflow-auto rounded-lg border border-border bg-zinc-950 p-4 text-xs font-mono text-zinc-300 whitespace-pre leading-relaxed">
                {configText}
              </pre>

              {configFilePath && (
                <p className="text-xs text-muted-foreground">
                  Config path: <code className="rounded bg-muted px-1 py-0.5">{configFilePath}</code>
                </p>
              )}
            </div>
          )}
        </main>
      </div>
    </ConfigContext.Provider>
  );
}

export default App;
