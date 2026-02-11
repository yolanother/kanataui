import { useState, useEffect, useRef, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";

export function LogViewer() {
  const [logs, setLogs] = useState<string[]>([]);
  const [filter, setFilter] = useState("");
  const [autoScroll, setAutoScroll] = useState(true);
  const [copied, setCopied] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const fetchLogs = useCallback(async () => {
    try {
      const lines = await invoke<string[]>("get_kanata_logs");
      setLogs(lines);
    } catch {
      // silently ignore fetch errors
    }
  }, []);

  useEffect(() => {
    fetchLogs();
    const interval = setInterval(fetchLogs, 1000);
    return () => clearInterval(interval);
  }, [fetchLogs]);

  useEffect(() => {
    if (autoScroll && bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [logs, autoScroll]);

  const handleScroll = () => {
    const el = scrollRef.current;
    if (!el) return;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 40;
    setAutoScroll(atBottom);
  };

  const handleClear = async () => {
    try {
      await invoke("clear_kanata_logs");
      setLogs([]);
    } catch {
      // silently ignore clear errors
    }
  };

  const handleCopy = () => {
    const text = filteredLogs.join("\n");
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const filteredLogs = filter
    ? logs.filter((line) => line.toLowerCase().includes(filter.toLowerCase()))
    : logs;

  return (
    <div className="flex h-full flex-col gap-3 p-4">
      <div className="flex items-center gap-3">
        <input
          type="text"
          placeholder="Filter logs..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="h-9 flex-1 rounded-md border border-border bg-background px-3 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary"
        />
        <button
          onClick={handleCopy}
          disabled={filteredLogs.length === 0}
          className="h-9 rounded-md border border-border bg-background px-4 text-sm font-medium text-foreground transition-colors hover:bg-accent hover:text-accent-foreground disabled:opacity-50"
        >
          {copied ? "Copied!" : "Copy Logs"}
        </button>
        <button
          onClick={handleClear}
          className="h-9 rounded-md border border-border bg-background px-4 text-sm font-medium text-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
        >
          Clear Logs
        </button>
      </div>

      <div
        ref={scrollRef}
        onScroll={handleScroll}
        className="flex-1 overflow-auto rounded-md border border-border bg-neutral-950 p-3 dark:bg-neutral-950"
      >
        {filteredLogs.length === 0 ? (
          <div className="flex h-full items-center justify-center text-sm text-neutral-500">
            {logs.length === 0
              ? "No logs yet. Start Kanata to see output here."
              : "No logs match the current filter."}
          </div>
        ) : (
          <pre className="font-mono text-xs leading-5">
            {filteredLogs.map((line, i) => (
              <div
                key={i}
                className={
                  line.includes("[ERR]")
                    ? "text-red-400"
                    : line.includes("[SYS]")
                      ? "text-sky-400"
                      : "text-neutral-300"
                }
              >
                {line}
              </div>
            ))}
            <div ref={bottomRef} />
          </pre>
        )}
      </div>

      {!autoScroll && filteredLogs.length > 0 && (
        <button
          onClick={() => {
            setAutoScroll(true);
            bottomRef.current?.scrollIntoView({ behavior: "smooth" });
          }}
          className="absolute bottom-8 right-8 rounded-full border border-border bg-background px-3 py-1.5 text-xs font-medium text-foreground shadow-md transition-colors hover:bg-accent"
        >
          Scroll to bottom
        </button>
      )}
    </div>
  );
}
