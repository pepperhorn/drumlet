import { Component, useEffect, useState, type ReactNode } from 'react';

type Phase = 'engine' | 'render' | 'slow' | 'error';

const MESSAGES: Record<Phase, string> = {
  engine: 'Loading notation engine…',
  render: 'Rendering score…',
  slow: 'Still loading — slow connection?',
  error: 'Could not load notation.',
};

export function NotationLoading({ phase, message, onRetry }: {
  phase: Phase;
  message?: string;
  onRetry?: () => void;
}) {
  return (
    <div className="notation-loading min-h-40 rounded-2xl border border-border bg-card px-4 py-6 flex flex-col items-center justify-center gap-3 text-center">
      <div className="notation-loading-status flex items-center gap-3 text-sm" role={phase === 'error' ? 'alert' : 'status'}>
        {phase !== 'error' && (
          <span className="notation-loading-spinner size-5 shrink-0 rounded-full border-2 border-sky/30 border-t-sky motion-safe:animate-spin" aria-hidden="true" />
        )}
        <span className="notation-loading-text [overflow-wrap:anywhere]">{message ?? MESSAGES[phase]}</span>
      </div>
      {(phase === 'error' || phase === 'slow') && onRetry && (
        <button type="button" className="notation-loading-retry hw-btn rounded-lg px-3 py-2 text-sm font-semibold cursor-pointer" onClick={onRetry}>
          Retry
        </button>
      )}
    </div>
  );
}

export function NotationPending({ phase, startedAt, onRetry }: {
  phase: 'engine' | 'render';
  startedAt?: number;
  onRetry: () => void;
}) {
  const [slow, setSlow] = useState(false);
  useEffect(() => {
    const timer = window.setTimeout(() => setSlow(true), 15000 - (startedAt === undefined ? 0 : Date.now() - startedAt));
    return () => window.clearTimeout(timer);
  }, [startedAt]);
  return <NotationLoading phase={slow ? 'slow' : phase} onRetry={onRetry} />;
}

export class NotationEngineBoundary extends Component<{ children: ReactNode; onRetry: () => void }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  render() {
    return this.state.failed
      ? <NotationLoading phase="error" message="Could not load the notation engine." onRetry={this.props.onRetry} />
      : this.props.children;
  }
}
