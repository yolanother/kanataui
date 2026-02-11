import { useState, useEffect, useCallback, useMemo } from 'react';
import { invoke } from '@tauri-apps/api/core';
import { listen } from '@tauri-apps/api/event';
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
import { parseKanataConfig } from './lib/kanata/parser';
import { applyTheme, getStoredTheme } from './lib/theme';
import { PreviewTab } from './components/preview/PreviewTab';
import { LogViewer } from './components/log/LogViewer';
import { SettingsDialog } from './components/settings/SettingsDialog';
import { AssistantFab } from './components/assistant/AssistantFab';
import { AssistantDialog } from './components/assistant/AssistantDialog';
import { useToast } from './lib/use-toast';
import { ToastContainer } from './components/ui/Toast';

type KanataStatus = 'stopped' | 'running';
type TabId = 'wizard' | 'editor' | 'preview' | 'logs' | 'export';

function App() {
  const [status, setStatus] = useState<KanataStatus>('stopped');
  const [activeTab, setActiveTab] = useState<TabId>('wizard');
  const [config, setConfig] = useState<KanataConfig>(() => basicHomeRowMods());
  const [selectedLayout, setSelectedLayout] = useState<LayoutType>('qwerty');
  const [selectedLayer, setSelectedLayer] = useState<string>('base');
  const [configFilePath, setConfigFilePath] = useState<string>('');
  const [isDirty, setDirty] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [assistantOpen, setAssistantOpen] = useState(false);
  const { toasts, addToast, dismissToast } = useToast();

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
        if (settingsOpen) {
          setSettingsOpen(false);
        } else if (assistantOpen) {
          setAssistantOpen(false);
        } else {
          getCurrentWebviewWindow().close();
        }
      }
    };
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      clearInterval(interval);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [settingsOpen, assistantOpen]);

  // Resolve config dir path on mount, then try to auto-load saved config
  useEffect(() => {
    (async () => {
      try {
        const dir = await invoke<string>('ensure_config_dir');
        const sep = dir.includes('\\') ? '\\' : '/';
        const path = `${dir}${sep}kanata.kbd`;
        setConfigFilePath(path);

        // Try to load existing config from disk
        try {
          const text = await invoke<string>('load_config', { path });
          const parsed = parseKanataConfig(text);
          setConfig(parsed);
          setDirty(false);
          // Restore layout from localStorage
          const savedLayout = localStorage.getItem('kanataui-selected-layout');
          if (savedLayout) {
            setSelectedLayout(savedLayout as LayoutType);
          }
          setActiveTab('editor');
        } catch {
          // No saved config or parse failed — stay on wizard
        }
      } catch {
        // Fallback handled by empty string
      }
    })();
  }, []);

  // Apply theme on mount and listen for system theme changes
  useEffect(() => {
    applyTheme(getStoredTheme());
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = () => {
      const stored = getStoredTheme();
      if (stored === 'system') {
        applyTheme('system');
      }
    };
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  // Listen for backend events (kanata start/stop/error)
  useEffect(() => {
    const unlisten: Array<() => void> = [];
    listen('kanata-started', () => {
      setStatus('running');
      addToast('Kanata started successfully', 'success');
    }).then((u) => unlisten.push(u));
    listen('kanata-stopped', () => {
      setStatus('stopped');
      addToast('Kanata stopped', 'info');
    }).then((u) => unlisten.push(u));
    listen<string>('kanata-error', (event) => {
      addToast(`Kanata error: ${event.payload}`, 'error');
    }).then((u) => unlisten.push(u));
    return () => unlisten.forEach((u) => u());
  }, [addToast]);

  // Start kanata handler — auto-save if dirty, then start
  const handleStartKanata = useCallback(async () => {
    // Auto-save if there are unsaved changes
    if (isDirty && configFilePath) {
      try {
        const text = generateConfig(config);
        await invoke('save_config', { path: configFilePath, content: text });
        setDirty(false);
      } catch (e) {
        addToast(`Failed to save before starting: ${e}`, 'error');
        return;
      }
    }
    try {
      await invoke('start_kanata', { configPath: configFilePath });
      setActiveTab('logs');
    } catch (e) {
      addToast(`Failed to start kanata: ${e}`, 'error');
      setActiveTab('logs');
    }
  }, [isDirty, configFilePath, config, addToast]);

  // Stop kanata handler
  const handleStopKanata = useCallback(async () => {
    try {
      await invoke('stop_kanata');
    } catch (e) {
      addToast(`Failed to stop kanata: ${e}`, 'error');
    }
  }, [addToast]);

  // Wizard completion handler — auto-saves to disk
  const handleWizardComplete = useCallback(async (result: WizardResult) => {
    setConfig(result.config);
    setSelectedLayout(result.layout);
    localStorage.setItem('kanataui-selected-layout', result.layout);
    setActiveTab('editor');

    // Auto-save to disk
    if (configFilePath) {
      try {
        const text = generateConfig(result.config);
        await invoke('save_config', { path: configFilePath, content: text });
        setDirty(false);
        setSaveMessage('Saved');
        setTimeout(() => setSaveMessage(null), 2000);
      } catch (e) {
        setDirty(true);
        setSaveMessage(`Error: ${e}`);
        setTimeout(() => setSaveMessage(null), 4000);
      }
    } else {
      setDirty(true);
    }
  }, [configFilePath]);

  // Save config to disk
  const handleSave = useCallback(async () => {
    if (!configFilePath) return;
    try {
      const text = generateConfig(config);
      await invoke('save_config', { path: configFilePath, content: text });
      localStorage.setItem('kanataui-selected-layout', selectedLayout);
      setDirty(false);
      setSaveMessage('Saved');
      setTimeout(() => setSaveMessage(null), 2000);
    } catch (e) {
      setSaveMessage(`Error: ${e}`);
      setTimeout(() => setSaveMessage(null), 4000);
    }
  }, [config, configFilePath, selectedLayout]);

  // Handle tab change — warn if switching to preview while kanata is running
  const handleTabChange = useCallback(async (tabId: TabId) => {
    if (tabId === 'preview' && status === 'running') {
      const stop = window.confirm(
        'Kanata is currently running. Stop it before entering Preview mode?'
      );
      if (stop) {
        try {
          await invoke('stop_kanata');
          setStatus('stopped');
        } catch {
          // Failed to stop, continue anyway
        }
      }
    }
    setActiveTab(tabId);
  }, [status]);

  const configText = useMemo(() => generateConfig(config), [config]);
  const isErgo = selectedLayout !== 'qwerty';

  const tabs: { id: TabId; label: string }[] = [
    { id: 'wizard', label: 'Quick Setup' },
    { id: 'editor', label: isErgo ? 'Ergo Editor' : 'QWERTY Editor' },
    { id: 'preview', label: 'Preview' },
    { id: 'logs', label: 'Logs' },
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
            {status === 'stopped' ? (
              <button
                type="button"
                onClick={handleStartKanata}
                className="rounded-md bg-green-600 px-3 py-1 text-xs font-medium text-white hover:bg-green-700 transition-colors"
              >
                Start
              </button>
            ) : (
              <button
                type="button"
                onClick={handleStopKanata}
                className="rounded-md bg-red-600 px-3 py-1 text-xs font-medium text-white hover:bg-red-700 transition-colors"
              >
                Stop
              </button>
            )}
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
              onClick={() => setSettingsOpen(true)}
              title="Settings"
              className="rounded-md border border-border p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="rounded-md border border-border px-3 py-1.5 text-xs font-medium hover:bg-muted transition-colors"
            >
              Save
            </button>
          </div>
        </header>

        {/* Tab navigation */}
        <nav className="flex border-b border-border px-6">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
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

        {/* Tab content - all tabs always rendered, hidden via CSS to preserve state */}
        <main className="flex-1 overflow-auto p-6">
          <div className={activeTab === 'wizard' ? '' : 'hidden'}>
            <SetupWizard
              onComplete={handleWizardComplete}
              onCancel={() => setActiveTab('editor')}
            />
          </div>

          <div className={activeTab === 'editor' ? '' : 'hidden'}>
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
          </div>

          <div className={activeTab === 'preview' ? '' : 'hidden'}>
            <PreviewTab />
          </div>

          <div className={activeTab === 'logs' ? 'h-full' : 'hidden'}>
            <LogViewer />
          </div>

          <div className={activeTab === 'export' ? '' : 'hidden'}>
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
          </div>
        </main>

        {/* AI Assistant FAB - only on editor tab */}
        {activeTab === 'editor' && (
          <AssistantFab onClick={() => setAssistantOpen(true)} />
        )}

        {/* Modals */}
        <SettingsDialog open={settingsOpen} onClose={() => setSettingsOpen(false)} />
        <AssistantDialog open={assistantOpen} onClose={() => setAssistantOpen(false)} />

        {/* Toast notifications */}
        <ToastContainer toasts={toasts} onDismiss={dismissToast} />
      </div>
    </ConfigContext.Provider>
  );
}

export default App;
