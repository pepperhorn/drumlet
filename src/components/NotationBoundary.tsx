import { lazy, Suspense, useState, type ComponentProps } from 'react';
import { NotationEngineBoundary, NotationPending } from './NotationLoading.js';
import { loadNotation } from './notationPrefetch.js';

type NotationProps = ComponentProps<Awaited<ReturnType<typeof loadNotation>>['default']>;

export default function NotationBoundary(props: NotationProps) {
  const [{ key, View, startedAt }, setAttempt] = useState(() => ({
    key: 0,
    View: lazy(loadNotation),
    startedAt: props.startedAt,
  }));

  function retry() {
    const View = lazy(loadNotation);
    const startedAt = Date.now();
    setAttempt((previous) => ({ key: previous.key + 1, View, startedAt }));
  }

  return (
    <NotationEngineBoundary key={key} onRetry={retry}>
      <Suspense fallback={<NotationPending phase="engine" startedAt={startedAt} onRetry={retry} />}>
        <View {...props} startedAt={startedAt} />
      </Suspense>
    </NotationEngineBoundary>
  );
}
