// ============================================================================
// AI Assistant Floating Action Button
// ============================================================================

import { cn } from '../../lib/utils';

interface AssistantFabProps {
  onClick: () => void;
}

export function AssistantFab({ onClick }: AssistantFabProps) {
  const hasKey = !!localStorage.getItem('kanataui-openai-key');
  if (!hasKey) return null;

  return (
    <button
      type="button"
      onClick={onClick}
      title="AI Assistant"
      className={cn(
        'fixed bottom-5 right-5 z-50',
        'flex h-12 w-12 items-center justify-center rounded-full',
        'bg-primary text-primary-foreground shadow-lg',
        'transition-transform hover:scale-110 active:scale-95',
        'focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background',
      )}
    >
      <svg
        className="h-5 w-5"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        strokeWidth={2}
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
        />
      </svg>
    </button>
  );
}
