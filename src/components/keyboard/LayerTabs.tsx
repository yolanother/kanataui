import { cn } from "../../lib/utils";
import type { Layer } from "../../lib/kanata/types";

interface LayerTabsProps {
  layers: Layer[];
  selectedLayer: string;
  onLayerChange: (layerName: string) => void;
  onAddLayer: () => void;
}

export function LayerTabs({
  layers,
  selectedLayer,
  onLayerChange,
  onAddLayer,
}: LayerTabsProps) {
  return (
    <div className="flex items-center gap-1 border-b border-border px-1 pb-1">
      <span className="mr-2 text-xs font-medium text-muted-foreground">Layer:</span>
      {layers.map((layer) => (
        <button
          key={layer.name}
          type="button"
          onClick={() => onLayerChange(layer.name)}
          className={cn(
            "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
            selectedLayer === layer.name
              ? "bg-zinc-700 text-white"
              : "text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800"
          )}
        >
          {layer.name}
        </button>
      ))}
      <button
        type="button"
        onClick={onAddLayer}
        className="rounded-md px-2 py-1.5 text-sm text-zinc-500 hover:text-zinc-300 hover:bg-zinc-800 transition-colors"
        title="Add new layer"
      >
        + Layer
      </button>
    </div>
  );
}
