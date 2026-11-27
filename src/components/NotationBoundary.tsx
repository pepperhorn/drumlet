import { lazy, Suspense, useState, type ComponentProps } from 'react';
import { NotationEngineBoundary, NotationPending } from './NotationLoading.js';
import { loadNotation } from './notationPrefetch.js';

type NotationProps = ComponentProps<Awaited<ReturnType<typeof loadNotation>>['default']>;

let sharedView = lazy(loadNotation);

export default function NotationBoundary(props: NotationProps) {
  const [{ key, View, startedAt }, setAttempt] = useState(() => ({
    key: 0,
    View: sharedView,
    startedAt: props.startedAt,
  }));

  function restart(View: typeof sharedView) {
    const startedAt = Date.now();
    setAttempt((previous) => ({ key: previous.key + 1, View, startedAt }));
  }

  function retry() {
    sharedView = lazy(loadNotation);
    restart(sharedView);
  }

  return (
    <NotationEngineBoundary key={key} onRetry={retry}>
      <Suspense fallback={<NotationPending phase="engine" startedAt={startedAt} onRetry={() => restart(View)} />}>
        <View {...props} startedAt={startedAt} />
      </Suspense>
    </NotationEngineBoundary>
  );
}
