// ============================================================================
// SimulationTimeline - Renders kanata simulation output with color coding
// ============================================================================

interface SimulationTimelineProps {
  output: string;
}

function classifyLine(line: string): 'input' | 'output' | 'timing' | 'other' {
  const trimmed = line.trim();
  if (trimmed.startsWith('in:') || trimmed.startsWith('input:') || trimmed.startsWith('press:') || trimmed.startsWith('release:')) {
    return 'input';
  }
  if (trimmed.startsWith('out:') || trimmed.startsWith('output:')) {
    return 'output';
  }
  if (trimmed.startsWith('t:') || trimmed.startsWith('tick:') || /^\d+ms/.test(trimmed)) {
    return 'timing';
  }
  return 'other';
}

const lineColors: Record<string, string> = {
  input: 'text-blue-400',
  output: 'text-green-400',
  timing: 'text-zinc-500',
  other: 'text-zinc-300',
};

export function SimulationTimeline({ output }: SimulationTimelineProps) {
  if (!output) {
    return (
      <div className="rounded-lg border border-border bg-card p-4">
        <p className="text-sm text-muted-foreground">
          Run a simulation to see results here.
        </p>
      </div>
    );
  }

  const lines = output.split('\n');

  return (
    <div className="space-y-2">
      <h3 className="text-sm font-medium">Simulation Output</h3>
      <pre className="max-h-64 overflow-auto rounded-lg border border-border bg-zinc-950 dark:bg-zinc-900 p-4 text-xs font-mono leading-relaxed">
        {lines.map((line, i) => {
          const type = classifyLine(line);
          return (
            <span key={i} className={lineColors[type]}>
              {line}
              {i < lines.length - 1 ? '\n' : ''}
            </span>
          );
        })}
      </pre>
    </div>
  );
}
