import { useCallback, useEffect, useRef, useState } from 'react';
import { SequencerProvider, useSequencer } from './state/SequencerContext.jsx';
import { useAudioEngine } from './audio/useAudioEngine.js';
import { useTransport } from './audio/useTransport.js';
import { exportToFile, importFromFile } from './state/projectSerializer.js';
import { exportMidi } from './state/midiExport.js';
import { maxLevel } from './audio/velocityConfig.js';
import Grid from './components/Grid.jsx';
import Transport from './components/Transport.jsx';
import PageTabs from './components/PageTabs.jsx';
import Library from './components/Library.jsx';
import ShareModal from './components/ShareModal.jsx';
import { presetToState } from './state/presets.js';
import { loadFromUrl, isEmbedMode } from './state/shareCodec.js';

function Drumlet() {
  const { state, dispatch } = useSequencer();
  const audioEngine = useAudioEngine();
  const [loadingTracks, setLoadingTracks] = useState(new Set());
  const [previewMode, setPreviewMode] = useState(true);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [embed] = useState(() => isEmbedMode());
  const customBuffersRef = useRef(new Map()); // trackId → AudioBuffer

  // Keep a ref to state for the scheduler (avoids stale closures)
  const stateRef = useRef(state);
  stateRef.current = {
    ...state,
    _onPageAdvance: (nextPage) => {
      dispatch({ type: 'SET_CURRENT_PAGE', pageIndex: nextPage });
    },
  };

  const { isPlaying, currentStep, toggle, stop } = useTransport(stateRef, audioEngine);

  const currentPage = state.pages[state.currentPageIndex];

  // Stable key for track sound config changes — derived from primitive values only
  const trackSoundKey = currentPage
    ? currentPage.tracks
        .map((t) => `${t.id}:${t.sourceType}:${t.instrument}:${t.group}:${t.soundfontName}:${t.customSampleName}:${t.kitId}:${t.kitSample}`)
        .join(',')
    : '';

  // Load instruments for all tracks on current page
  const loadTrackInstrument = audioEngine.loadTrackInstrument;
  useEffect(() => {
    if (!trackSoundKey) return;
    let cancelled = false;

    // Snapshot tracks at effect time
    const tracks = stateRef.current.pages[stateRef.current.currentPageIndex]?.tracks;
    if (!tracks) return;

    const loadAll = async () => {
      for (const track of tracks) {
        if (cancelled) break;
        setLoadingTracks((prev) => {
          if (prev.has(track.id)) return prev;
          return new Set([...prev, track.id]);
        });
        // Attach custom buffer if available
        const trackWithBuffer = customBuffersRef.current.has(track.id)
          ? { ...track, _audioBuffer: customBuffersRef.current.get(track.id) }
          : track;
        await loadTrackInstrument(trackWithBuffer);
        if (!cancelled) {
          setLoadingTracks((prev) => {
            if (!prev.has(track.id)) return prev;
            const next = new Set(prev);
            next.delete(track.id);
            return next;
          });
        }
      }
    };

    loadAll();
    return () => { cancelled = true; };
  }, [trackSoundKey, loadTrackInstrument]);

  const handleToggleCell = useCallback((trackIndex, stepIndex, isRightClick) => {
    if (isRightClick) {
      dispatch({ type: 'SET_CELL', trackIndex, stepIndex, velocity: 0 });
    } else {
      dispatch({ type: 'TOGGLE_CELL', trackIndex, stepIndex });

      // Preview: play the sound at the new velocity
      if (previewMode) {
        const page = stateRef.current.pages[stateRef.current.currentPageIndex];
        const track = page?.tracks[trackIndex];
        if (track) {
          // Calculate what the new velocity will be after toggle
          const max = maxLevel(track.velMode || 3);
          const newVel = (track.steps[stepIndex] + 1) % (max + 1);
          if (newVel > 0) {
            audioEngine.triggerNote(track, newVel, audioEngine.getContext().currentTime, track.velMode || 3);
          }
        }
      }
    }
  }, [dispatch, previewMode, audioEngine]);

  const handleChangeProp = useCallback((trackIndex, prop, value) => {
    dispatch({ type: 'SET_TRACK_PROP', trackIndex, prop, value });

    // Live-update audio
    const track = stateRef.current.pages[stateRef.current.currentPageIndex]?.tracks[trackIndex];
    if (!track) return;
    if (prop === 'volume') audioEngine.updateTrackVolume(track.id, value);
    if (prop === 'reverb') audioEngine.updateTrackReverb(track.id, value);
  }, [dispatch, audioEngine]);

  const handleChangeSource = useCallback((trackIndex, sourceConfig) => {
    dispatch({ type: 'SET_TRACK_SOURCE', trackIndex, ...sourceConfig });
  }, [dispatch]);

  const handleChangeVelMode = useCallback((trackIndex, mode) => {
    dispatch({ type: 'SET_TRACK_VEL_MODE', trackIndex, mode });
  }, [dispatch]);

  const handleDrop = useCallback(async (file, trackIndex) => {
    try {
      setLoadingTracks((prev) => new Set([...prev, `drop-${trackIndex}`]));
      const audioBuffer = await audioEngine.loadCustomSample(file);
      const track = stateRef.current.pages[stateRef.current.currentPageIndex]?.tracks[trackIndex];
      if (!track) return;

      // Store buffer in ref map for the audio engine to pick up
      customBuffersRef.current.set(track.id, audioBuffer);

      const name = file.name.replace(/\.[^.]+$/, '');
      dispatch({
        type: 'SET_TRACK_SOURCE',
        trackIndex,
        sourceType: 'custom',
        customSampleName: file.name,
        name,
      });

      // Force-load immediately (the useEffect will also fire from state change)
      await audioEngine.loadTrackInstrument({
        ...track,
        sourceType: 'custom',
        customSampleName: file.name,
        name,
        _audioBuffer: audioBuffer,
      });
    } catch (err) {
      console.error('Failed to load sample:', err);
    } finally {
      setLoadingTracks((prev) => {
        const next = new Set(prev);
        next.delete(`drop-${trackIndex}`);
        return next;
      });
    }
  }, [audioEngine, dispatch]);

  const handleExport = useCallback(() => exportToFile(state), [state]);
  const handleMidiExport = useCallback(() => exportMidi(state), [state]);

  const handleLoadPreset = useCallback((preset) => {
    stop();
    dispatch({ type: 'LOAD_STATE', state: presetToState(preset) });
    setLibraryOpen(false);
  }, [dispatch, stop]);

  // Load shared state from URL on mount
  useEffect(() => {
    const shared = loadFromUrl();
    if (shared) {
      dispatch({ type: 'LOAD_STATE', state: shared });
      // Clean hash to avoid reloading on refresh
      window.history.replaceState(null, '', window.location.pathname + window.location.search);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleImport = useCallback(async () => {
    const imported = await importFromFile();
    if (imported) {
      stop();
      dispatch({ type: 'LOAD_STATE', state: imported });
    }
  }, [dispatch, stop]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKey = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

      if (e.code === 'Space') {
        e.preventDefault();
        toggle();
      }
      if (e.code === 'ArrowLeft' && e.shiftKey) {
        dispatch({ type: 'SET_BPM', bpm: state.bpm - 1 });
      }
      if (e.code === 'ArrowRight' && e.shiftKey) {
        dispatch({ type: 'SET_BPM', bpm: state.bpm + 1 });
      }
      // Number keys 1-9 for page switching
      const num = parseInt(e.key);
      if (num >= 1 && num <= state.pages.length) {
        dispatch({ type: 'SET_CURRENT_PAGE', pageIndex: num - 1 });
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [toggle, dispatch, state.bpm, state.pages.length]);

  return (
    <div className={`drumlet-app min-h-screen bg-bg ${embed ? 'p-2 sm:p-3' : 'p-4 sm:p-6 lg:p-8'}`}>
      {/* Header */}
      <div className="drumlet-header flex items-center justify-between mb-6" style={embed ? { display: 'none' } : undefined}>
        <div className="flex items-center gap-3">
          <h1 className="drumlet-title text-2xl sm:text-3xl lg:text-4xl font-display font-bold text-text tracking-tight">
            drumlet
          </h1>
          <span className="drumlet-version text-xs lg:text-sm font-mono text-muted bg-gray-100 px-2 py-0.5 rounded-full">
            v0.1
          </span>
        </div>

        <div className="drumlet-actions flex items-center gap-2">
          <button
            className="action-btn px-3 py-1.5 rounded-lg bg-sky/10 text-xs lg:text-sm font-medium text-sky hover:bg-sky/20 transition-colors cursor-pointer flex items-center gap-1.5"
            onClick={() => setLibraryOpen(true)}
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
              <rect x="2" y="2" width="4" height="5" rx="0.5" />
              <rect x="2" y="9" width="4" height="5" rx="0.5" />
              <rect x="8" y="2" width="6" height="12" rx="0.5" />
              <line x1="10" y1="5" x2="12" y2="5" />
              <line x1="10" y1="7" x2="12" y2="7" />
              <line x1="10" y1="9" x2="12" y2="9" />
            </svg>
            Library
          </button>
          <button
            className="action-btn px-3 py-1.5 rounded-lg bg-gray-50 text-xs lg:text-sm font-medium text-muted hover:bg-gray-100 hover:text-text transition-colors cursor-pointer flex items-center gap-1.5"
            onClick={() => setShareOpen(true)}
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="4" r="2.5" /><circle cx="12" cy="12" r="2.5" /><circle cx="4" cy="8" r="2.5" />
              <line x1="6.2" y1="6.8" x2="9.8" y2="5.2" /><line x1="6.2" y1="9.2" x2="9.8" y2="10.8" />
            </svg>
            Share
          </button>
          <button
            className="action-btn px-3 py-1.5 rounded-lg bg-gray-50 text-xs lg:text-sm font-medium text-muted hover:bg-gray-100 hover:text-text transition-colors cursor-pointer"
            onClick={handleImport}
          >
            Import
          </button>
          <button
            className="action-btn px-3 py-1.5 rounded-lg bg-gray-50 text-xs lg:text-sm font-medium text-muted hover:bg-gray-100 hover:text-text transition-colors cursor-pointer"
            onClick={handleExport}
          >
            Export
          </button>
          <button
            className="action-btn px-3 py-1.5 rounded-lg bg-gray-50 text-xs lg:text-sm font-medium text-muted hover:bg-gray-100 hover:text-text transition-colors cursor-pointer"
            onClick={handleMidiExport}
          >
            MIDI
          </button>
        </div>
      </div>

      {/* Transport */}
      <div className="mb-4">
        <Transport
          bpm={state.bpm}
          swing={state.swing}
          humanize={state.humanize}
          isPlaying={isPlaying}
          previewMode={previewMode}
          onTogglePlay={toggle}
          onSetBpm={(bpm) => dispatch({ type: 'SET_BPM', bpm })}
          onSetSwing={(swing) => dispatch({ type: 'SET_SWING', swing })}
          onSetHumanize={(humanize) => dispatch({ type: 'SET_HUMANIZE', humanize })}
          onTogglePreview={() => setPreviewMode((p) => !p)}
        />
      </div>

      {/* Page tabs */}
      <div className="mb-4" style={embed ? { display: 'none' } : undefined}>
        <PageTabs
          pages={state.pages}
          currentPageIndex={state.currentPageIndex}
          stepsPerPage={state.stepsPerPage}
          chainMode={state.chainMode}
          onSetPage={(i) => dispatch({ type: 'SET_CURRENT_PAGE', pageIndex: i })}
          onAddPage={() => dispatch({ type: 'ADD_PAGE' })}
          onRemovePage={(i) => dispatch({ type: 'REMOVE_PAGE', pageIndex: i })}
          onSetStepsPerPage={(n) => dispatch({ type: 'SET_STEPS_PER_PAGE', stepsPerPage: n })}
          onToggleChainMode={() => dispatch({ type: 'TOGGLE_CHAIN_MODE' })}
          onClearPage={() => dispatch({ type: 'CLEAR_PAGE' })}
        />
      </div>

      {/* Grid */}
      {currentPage && (
        <Grid
          tracks={currentPage.tracks}
          currentStep={currentStep}
          stepsPerPage={state.stepsPerPage}
          onToggleCell={handleToggleCell}
          onChangeProp={handleChangeProp}
          onChangeSource={handleChangeSource}
          onChangeVelMode={handleChangeVelMode}
          onRemoveTrack={(i) => dispatch({ type: 'REMOVE_TRACK', trackIndex: i })}
          onAddTrack={() => dispatch({ type: 'ADD_TRACK' })}
          onPreview={(track) => audioEngine.previewSound(track)}
          onDrop={handleDrop}
        />
      )}

      {/* Loading overlay */}
      {loadingTracks.size > 0 && (
        <div className="loading-indicator fixed bottom-4 right-4 bg-card rounded-xl shadow-lg border border-border px-4 py-2 flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-sky animate-pulse" />
          <span className="text-xs font-medium text-muted">Loading sounds...</span>
        </div>
      )}

      {/* Keyboard shortcuts hint */}
      <div className="drumlet-shortcuts mt-6 text-center text-[10px] text-muted/50" style={embed ? { display: 'none' } : undefined}>
        Space: play/stop &middot; Shift+←→: BPM &middot; 1-9: switch pages &middot; Right-click cell: clear
      </div>

      {/* Library sidebar */}
      <Library
        isOpen={libraryOpen}
        onClose={() => setLibraryOpen(false)}
        onLoadPreset={handleLoadPreset}
      />

      {/* Share modal */}
      <ShareModal
        isOpen={shareOpen}
        onClose={() => setShareOpen(false)}
        state={state}
      />
    </div>
  );
}

export default function App() {
  return (
    <SequencerProvider>
      <Drumlet />
    </SequencerProvider>
  );
}
