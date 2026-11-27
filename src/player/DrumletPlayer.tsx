// SPDX-License-Identifier: MIT
import {
  forwardRef, useCallback, useEffect, useEffectEvent, useImperativeHandle, useMemo,
  useReducer, useRef, useState, type CSSProperties, type Ref,
} from 'react';
import EndlessGrid from '../components/EndlessGrid.js';
import Knob from '../components/Knob.js';
import NotationBoundary from '../components/NotationBoundary.js';
import { sequencerReducer, type SequencerState } from '../state/sequencerReducer.js';
import { resolveChrome, type PlayerChrome } from './chrome.js';
import { resolveGrooveAsync, type GrooveError, type GrooveInput } from './resolveGroove.js';
import { usePlayerPlayback } from './usePlayerPlayback.js';

type PlayerView = 'endless' | 'paged';
type PlayerDisplay = 'grid' | 'notation';

export interface DrumletPlayerProps {
  groove: GrooveInput;
  chrome?: PlayerChrome;
  view?: PlayerView;
  display?: PlayerDisplay;
  theme?: 'light' | 'dark';
  bpm?: number;
  assetBaseUrl?: string;
  className?: string;
  onReady?(): void;
  onPlay?(): void;
  onStop?(): void;
  onError?(error: GrooveError | Error): void;
  onStep?(globalStep: number): void;
}

export interface DrumletPlayerHandle {
  play(): Promise<void>;
  stop(): void;
  seek(globalStep: number): void;
}

type Playback = ReturnType<typeof usePlayerPlayback>;
type ResolvedGroove = { state: SequencerState } | { error: Error };

export const DrumletPlayer = forwardRef<DrumletPlayerHandle, DrumletPlayerProps>(function DrumletPlayer(
  { groove, chrome = 'full', theme = 'light', className, ...options }, ref,
) {
  const [resolution, setResolution] = useState<{ input: GrooveInput; result?: ResolvedGroove }>({ input: groove });
  const playbackRef = useRef<DrumletPlayerHandle>(null);
  const reportError = useEffectEvent((error: Error) => options.onError?.(error));
  const reportReady = useEffectEvent(() => options.onReady?.());
  if (resolution.input !== groove) setResolution({ input: groove });

  useImperativeHandle(ref, () => ({
    async play() { await playbackRef.current?.play(); },
    stop() { playbackRef.current?.stop(); },
    seek(step) { playbackRef.current?.seek(step); },
  }), []);

  useEffect(() => {
    let active = true;
    void resolveGrooveAsync(groove).then(
      state => { if (active) setResolution({ input: groove, result: { state } }); },
      cause => {
        if (!active) return;
        const error = cause instanceof Error ? cause : new Error(String(cause));
        setResolution({ input: groove, result: { error } });
        reportError(error);
      },
    );
    return () => { active = false; };
  }, [groove]);

  const current = resolution.input === groove ? resolution.result : undefined;
  useEffect(() => {
    if (current && 'state' in current) reportReady();
  }, [current]);

  return (
    <div className={`drumlet-player grid min-w-0 gap-2 text-text${className ? ` ${className}` : ''}`} data-theme={theme}>
      {current && 'state' in current ? (
        <ResolvedPlayer {...options} chrome={chrome} initialState={current.state} playbackRef={playbackRef} />
      ) : current ? (
        <p className="drumlet-player-empty rounded-2xl border border-border bg-card p-4 text-sm" role="alert">
          {current.error.message}
        </p>
      ) : (
        <p className="drumlet-player-loading rounded-2xl border border-border bg-card p-4 text-sm" role="status">
          Loading groove…
        </p>
      )}
    </div>
  );
});

type ResolvedPlayerProps = Omit<DrumletPlayerProps, 'groove' | 'theme' | 'className' | 'onReady'> & {
  initialState: SequencerState;
  playbackRef: Ref<DrumletPlayerHandle>;
};

function ResolvedPlayer({
  initialState, view: initialView = 'endless', display: initialDisplay = 'grid', chrome = 'full',
  bpm, playbackRef, ...playbackOptions
}: ResolvedPlayerProps) {
  const [state, dispatch] = useReducer(sequencerReducer, initialState);
  const [viewSetting, setView] = useState({ prop: initialView, value: initialView });
  const [display, setDisplay] = useState(initialDisplay);
  const [tempoEdit, setBpm] = useState<{ prop?: number; value?: number }>({ prop: bpm });

  if (viewSetting.prop !== initialView) setView({ prop: initialView, value: initialView });
  if (!Object.is(tempoEdit.prop, bpm)) setBpm({ prop: bpm });
  const view = viewSetting.prop === initialView ? viewSetting.value : initialView;
  const tempo = bpm !== undefined && Number.isFinite(bpm)
    ? Math.max(20, Math.min(300, bpm))
    : state.bpm;
  const playerState: SequencerState = {
    ...state,
    bpm: Object.is(tempoEdit.prop, bpm) ? tempoEdit.value ?? tempo : tempo,
    playMode: 'groove',
  };
  const controls = resolveChrome(chrome);
  const surface: PlayerSurfaceProps = {
    state: playerState,
    controls,
    display: controls.audio ? display : 'grid',
    view,
    setDisplay,
    setView: value => setView({ prop: initialView, value }),
    setBpm: value => setBpm({ prop: bpm, value }),
    setLoop: loopGroove => dispatch({ type: 'SET_LOOP_GROOVE', loopGroove }),
    setPage: pageIndex => dispatch({ type: 'SET_CURRENT_PAGE', pageIndex }),
  };

  return controls.audio ? (
    <AudiblePlayer key={playbackOptions.assetBaseUrl} {...surface} options={playbackOptions} playbackRef={playbackRef} />
  ) : (
    <PlayerSurface {...surface} />
  );
}

function AudiblePlayer({ options, playbackRef, ...surface }: PlayerSurfaceProps & {
  options: Parameters<typeof usePlayerPlayback>[1];
  playbackRef: Ref<DrumletPlayerHandle>;
}) {
  const playback = usePlayerPlayback(surface.state, options);
  const { play, stop, seek: seekTransport } = playback;
  const { setPage, state: { pages, stepsPerPage } } = surface;
  const seek = useCallback((step: number) => {
    if (!Number.isFinite(step)) return;
    const page = Math.floor(step / stepsPerPage);
    setPage(Math.max(0, Math.min(page, pages.length - 1)));
    seekTransport(step);
  }, [pages.length, seekTransport, setPage, stepsPerPage]);
  useImperativeHandle(playbackRef, () => ({ play, stop, seek }), [play, stop, seek]);

  return <PlayerSurface {...surface} playback={{ ...playback, seek }} />;
}

interface PlayerSurfaceProps {
  state: SequencerState;
  controls: ReturnType<typeof resolveChrome>;
  display: PlayerDisplay;
  view: PlayerView;
  setDisplay(display: PlayerDisplay): void;
  setView(view: PlayerView): void;
  setBpm(bpm: number): void;
  setLoop(loop: boolean): void;
  setPage(pageIndex: number): void;
  playback?: Playback;
}

function PlayerSurface({
  state, controls, display, view, setDisplay, setView, setBpm, setLoop, setPage, playback,
}: PlayerSurfaceProps) {
  const { pages, stepsPerPage, beatsPerBar, noteValue, stepValue } = state;
  const endless = view === 'endless';
  const pageIndex = playback && playback.page >= 0 ? playback.page : state.currentPageIndex;
  const page = pages[pageIndex] ?? pages[0]!;
  const visiblePages = useMemo(() => endless ? pages : [page], [endless, pages, page]);
  const step = playback?.step ?? -1;
  const pageStep = step < 0 ? -1 : step % stepsPerPage;
  const gridStep = endless ? step : pageStep;
  const loop = state.loopGroove ?? true;
  const active = !!(playback?.isPlaying || playback?.isStarting);

  function changePage(index: number) {
    if (playback) playback.seek(index * stepsPerPage);
    else setPage(index);
  }

  const playButton = controls.playButton && playback && (
    <button
      type="button"
      className="drumlet-player-play-btn hw-btn hw-btn-accent relative flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-xl"
      style={{ '--hw-accent': active ? 'var(--color-stop)' : 'var(--color-play)' } as CSSProperties}
      onClick={() => { if (active) playback.stop(); else void playback.play().catch(() => {}); }}
      aria-label={active ? 'Stop' : 'Play'}
      title={active ? 'Stop' : 'Play'}
    >
      <span className={`drumlet-player-play-led hw-led absolute right-1.5 top-1.5${active ? ' hw-led-on text-play' : ''}`} aria-hidden="true" />
      <svg className="drumlet-player-play-icon text-text" width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true">
        {active
          ? <rect className="drumlet-player-stop-glyph" x="2" y="2" width="12" height="12" rx="1" />
          : <path className="drumlet-player-play-glyph" d="M4 2 L14 8 L4 14 Z" />}
      </svg>
    </button>
  );

  return (
    <>
      {controls.transport ? (
        <div className="drumlet-player-transport transport-bar flex flex-wrap items-center gap-x-3 gap-y-2 rounded-2xl border border-border bg-card p-3" role="group" aria-label="Playback controls">
          {playButton}
          {controls.bpm && (
            <Knob
              className="drumlet-player-tempo [&_.knob-label]:text-text!"
              label="Tempo (BPM)"
              value={state.bpm}
              min={20}
              max={300}
              unit=" BPM"
              size={40}
              alwaysShowValue
              onChange={setBpm}
            />
          )}
          <Keycap className="drumlet-player-loop-btn" pressed={loop} onClick={() => setLoop(!loop)}>Loop</Keycap>
          {controls.displayToggle && (
            <div className="drumlet-player-display-toggle flex gap-1" role="group" aria-label="Display">
              <Keycap className="drumlet-player-grid-btn" pressed={display === 'grid'} onClick={() => setDisplay('grid')}>Grid</Keycap>
              <Keycap className="drumlet-player-notation-btn" pressed={display === 'notation'} onClick={() => setDisplay('notation')}>Notation</Keycap>
            </div>
          )}
          {controls.viewToggle && (
            <div className="drumlet-player-view-toggle flex gap-1" role="group" aria-label="View">
              <Keycap className="drumlet-player-endless-btn" pressed={endless} onClick={() => setView('endless')}>Endless</Keycap>
              <Keycap className="drumlet-player-paged-btn" pressed={!endless} onClick={() => setView('paged')}>Paged</Keycap>
            </div>
          )}
        </div>
      ) : playButton}
      {!endless && pages.length > 1 && (
        <div className="drumlet-player-pages flex flex-wrap gap-1" role="group" aria-label="Groove pages">
          {pages.map((entry, index) => (
            <Keycap key={entry.id} className="drumlet-player-page-btn" pressed={index === pageIndex} onClick={() => changePage(index)}>
              {entry.name || `Page ${index + 1}`}
            </Keycap>
          ))}
        </div>
      )}
      {display === 'notation' ? (
        <NotationBoundary
          pages={visiblePages}
          stepsPerPage={stepsPerPage}
          beatsPerBar={beatsPerBar}
          noteValue={noteValue}
          stepValue={stepValue}
          currentStep={pageStep}
          currentPageIndex={0}
          currentGlobalStep={gridStep}
          layout={endless ? 'endless' : 'wrapped'}
        />
      ) : (
        <EndlessGrid
          pages={visiblePages}
          stepsPerPage={stepsPerPage}
          beatsPerBar={beatsPerBar}
          noteValue={noteValue}
          stepValue={stepValue}
          currentGlobalStep={gridStep}
          isPlaying={playback?.isPlaying ?? false}
          editable={false}
          onSeek={playback && (target => playback.seek(endless ? target : pageIndex * stepsPerPage + target))}
        />
      )}
    </>
  );
}

function Keycap({ className, pressed, onClick, children }: {
  className: string;
  pressed: boolean;
  onClick(): void;
  children: string;
}) {
  return (
    <button
      type="button"
      className={`${className} hw-btn min-h-10 cursor-pointer rounded-lg px-2.5 text-sm text-text ${pressed ? 'font-bold' : 'font-medium'}`}
      aria-pressed={pressed}
      onClick={onClick}
    >
      {children}
    </button>
  );
}
