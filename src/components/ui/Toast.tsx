import { cn } from '../../lib/utils';
import type { Toast as ToastType } from '../../lib/use-toast';

interface ToastContainerProps {
  toasts: ToastType[];
  onDismiss: (id: number) => void;
}

const variantStyles: Record<ToastType['variant'], string> = {
  success: 'bg-green-900/90 border-green-500/50 text-green-100',
  error: 'bg-red-900/90 border-red-500/50 text-red-100',
  info: 'bg-zinc-800/90 border-zinc-600/50 text-zinc-100',
};

export function ToastContainer({ toasts, onDismiss }: ToastContainerProps) {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={cn(
            'flex items-center gap-2 rounded-lg border px-4 py-3 text-sm shadow-lg backdrop-blur-sm animate-in slide-in-from-right-5',
            variantStyles[toast.variant],
          )}
        >
          <span className="flex-1">{toast.message}</span>
          <button
            type="button"
            onClick={() => onDismiss(toast.id)}
            className="ml-2 rounded p-0.5 opacity-60 hover:opacity-100"
          >
            <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      ))}
    </div>
  );
}
