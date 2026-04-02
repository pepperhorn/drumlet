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
import NotationView from './components/NotationView.jsx';
import MpcPads from './components/MpcPads.jsx';
import { presetToState } from './state/presets.js';
import { loadFromUrl, isEmbedMode } from './state/shareCodec.js';

function Drumlet() {
  const { state, dispatch } = useSequencer();
  const audioEngine = useAudioEngine();
  const [loadingTracks, setLoadingTracks] = useState(new Set());
  const [previewMode, setPreviewMode] = useState(true);
  const audioStartedRef = useRef(false);
  const [audioStarted, setAudioStarted] = useState(false);
  const [libraryOpen, setLibraryOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [notationView, setNotationView] = useState(false);
  const [playMode, setPlayMode] = useState(false); // false=edit, true=MPC pads
  const [showFullTransport, setShowFullTransport] = useState(false);
  const [activePreset, setActivePreset] = useState(null); // { name, credit, creditUrl, cover, links }
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

  // Load instruments — only after user has started audio
  const loadTrackInstrument = audioEngine.loadTrackInstrument;
  useEffect(() => {
    if (!trackSoundKey || !audioStarted) return;
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
  }, [trackSoundKey, loadTrackInstrument, audioStarted]);

  // Called on first user interaction to init audio
  const startAudio = useCallback(async () => {
    if (!audioStarted) {
      await audioEngine.ensureRunning();
      setAudioStarted(true);
    }
  }, [audioStarted, audioEngine]);

  const handleToggleCell = useCallback((trackIndex, stepIndex, isRightClick) => {
    startAudio();
    if (isRightClick) {
      dispatch({ type: 'SET_CELL', trackIndex, stepIndex, velocity: 0 });
    } else {
      dispatch({ type: 'TOGGLE_CELL', trackIndex, stepIndex });

      // Preview: play the sound at the new velocity (only if instrument is loaded)
      if (previewMode && audioEngine.instrumentsRef.current.has(stateRef.current.pages[stateRef.current.currentPageIndex]?.tracks[trackIndex]?.id)) {
        const page = stateRef.current.pages[stateRef.current.currentPageIndex];
        const track = page?.tracks[trackIndex];
        if (track) {
          const max = maxLevel(track.velMode || 3);
          const newVel = (track.steps[stepIndex] + 1) % (max + 1);
          if (newVel > 0) {
            audioEngine.triggerNote(track, newVel, audioEngine.getContext().currentTime + 0.01, track.velMode || 3);
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
    // Only stop playback if audio context hasn't been started yet —
    // if it's running, the new instrument will load in the background
    // and the track will be silent until ready (no crash)
    if (isPlaying && !audioStartedRef.current) stop();
    dispatch({ type: 'SET_TRACK_SOURCE', trackIndex, ...sourceConfig });
  }, [dispatch, isPlaying, stop]);

  const handleChangeVelMode = useCallback((trackIndex, mode) => {
    dispatch({ type: 'SET_TRACK_VEL_MODE', trackIndex, mode });
  }, [dispatch]);

  // Play handler — always ensures audio + instruments are ready before toggling
  const handlePlay = useCallback(async () => {
    try {
      // Ensure audio context is running (idempotent after first call)
      await audioEngine.ensureRunning();
      if (!audioStartedRef.current) {
        audioStartedRef.current = true;
        setAudioStarted(true);
      }

      // Always verify instruments are loaded for current tracks —
      // loadTrackInstrument returns immediately if already cached
      if (!isPlaying) {
        const tracks = stateRef.current.pages[stateRef.current.currentPageIndex]?.tracks || [];
        console.log('[app] Verifying', tracks.length, 'instruments before play...');
        await Promise.all(tracks.map((t) => {
          const tw = customBuffersRef.current.has(t.id)
            ? { ...t, _audioBuffer: customBuffersRef.current.get(t.id) }
            : t;
          return audioEngine.loadTrackInstrument(tw);
        }));
        console.log('[app] All instruments ready');
      }

      toggle();
    } catch (err) {
      console.error('[app] handlePlay failed:', err);
    }
  }, [isPlaying, audioEngine, toggle]);

  // MPC pad trigger — play a track's sound immediately
  const handleMpcTrigger = useCallback((track) => {
    if (!audioStartedRef.current) {
      audioEngine.ensureRunning().then(() => {
        audioStartedRef.current = true;
        setAudioStarted(true);
      });
    }
    audioEngine.previewSound(track);
  }, [audioEngine]);

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
    setActivePreset({
      name: preset.name,
      credit: preset.credit,
      creditUrl: preset.creditUrl,
      cover: preset.cover,
      links: preset.links,
      bpm: preset.bpm,
      body: preset.body || null,
      notes: preset.notes || null,
    });
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
    <div className={`drumlet-app min-h-screen bg-bg ${embed ? 'p-2 md:p-3' : 'p-4 md:p-6 lg:p-8'}`}>
      {/* Header — on mobile landscape, includes mini transport */}
      <div className="drumlet-header flex items-center justify-between mb-3 md:mb-6 gap-2" style={embed ? { display: 'none' } : undefined}>
        <div className="flex items-center gap-2 md:gap-3 shrink-0">
          <h1 className="drumlet-title text-xl md:text-3xl lg:text-4xl font-display font-bold text-text tracking-tight">
            drumlet
          </h1>
          <span className="drumlet-version text-[9px] md:text-xs lg:text-sm font-mono text-muted bg-gray-100 px-1.5 py-0.5 rounded-full hidden md:inline">
            v0.1
          </span>
        </div>

        {/* Mobile mini transport — visible on small screens */}
        <div className="mobile-mini-transport flex items-center gap-1.5 md:hidden">
          {/* Play */}
          <button
            className={`w-9 h-9 rounded-xl flex items-center justify-center text-white cursor-pointer transition-all active:scale-95
              ${isPlaying ? 'bg-stop' : 'bg-play'}`}
            onClick={handlePlay}
          >
            {isPlaying ? (
              <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor"><rect x="2" y="2" width="12" height="12" rx="1" /></svg>
            ) : (
              <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor"><path d="M4 2 L14 8 L4 14 Z" /></svg>
            )}
          </button>
          {/* BPM compact */}
          <input
            type="number"
            className="w-12 h-8 px-1 rounded-lg bg-bg border border-border text-center font-mono font-semibold text-xs outline-none"
            value={state.bpm}
            min={20} max={300}
            onChange={(e) => dispatch({ type: 'SET_BPM', bpm: Number(e.target.value) })}
          />
          {/* Edit/Play mode toggle */}
          <button
            className={`w-8 h-8 rounded-lg flex items-center justify-center cursor-pointer transition-colors
              ${playMode ? 'bg-coral/15 text-coral' : 'bg-gray-100 text-muted'}`}
            onClick={() => setPlayMode((p) => !p)}
            title={playMode ? 'Switch to edit mode' : 'Switch to pad mode'}
          >
            {playMode ? (
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                <rect x="1" y="1" width="6" height="6" rx="1" /><rect x="9" y="1" width="6" height="6" rx="1" />
                <rect x="1" y="9" width="6" height="6" rx="1" /><rect x="9" y="9" width="6" height="6" rx="1" />
              </svg>
            ) : (
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                <rect x="2" y="2" width="12" height="3" rx="0.5" /><rect x="2" y="7" width="12" height="3" rx="0.5" />
                <rect x="2" y="12" width="12" height="2" rx="0.5" />
              </svg>
            )}
          </button>
          {/* More controls */}
          <button
            className="w-8 h-8 rounded-lg bg-gray-100 text-muted hover:text-text flex items-center justify-center cursor-pointer"
            onClick={() => setShowFullTransport((v) => !v)}
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="currentColor">
              <circle cx="3" cy="8" r="1.5" /><circle cx="8" cy="8" r="1.5" /><circle cx="13" cy="8" r="1.5" />
            </svg>
          </button>
        </div>

        {/* Desktop actions */}
        <div className="drumlet-actions hidden md:flex items-center gap-2">
          <button
            className="action-btn px-3 py-1.5 rounded-lg bg-sky/10 text-xs lg:text-sm font-medium text-sky hover:bg-sky/20 transition-colors cursor-pointer flex items-center gap-1.5"
            onClick={() => setLibraryOpen(true)}
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
              <rect x="2" y="2" width="4" height="5" rx="0.5" /><rect x="2" y="9" width="4" height="5" rx="0.5" />
              <rect x="8" y="2" width="6" height="12" rx="0.5" /><line x1="10" y1="5" x2="12" y2="5" />
              <line x1="10" y1="7" x2="12" y2="7" /><line x1="10" y1="9" x2="12" y2="9" />
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
          <button className="action-btn px-3 py-1.5 rounded-lg bg-gray-50 text-xs lg:text-sm font-medium text-muted hover:bg-gray-100 hover:text-text transition-colors cursor-pointer" onClick={handleImport}>Import</button>
          <button className="action-btn px-3 py-1.5 rounded-lg bg-gray-50 text-xs lg:text-sm font-medium text-muted hover:bg-gray-100 hover:text-text transition-colors cursor-pointer" onClick={handleExport}>Export</button>
          <button className="action-btn px-3 py-1.5 rounded-lg bg-gray-50 text-xs lg:text-sm font-medium text-muted hover:bg-gray-100 hover:text-text transition-colors cursor-pointer" onClick={handleMidiExport}>MIDI</button>
          {/* Edit/Play mode toggle — desktop */}
          <button
            className={`action-btn px-3 py-1.5 rounded-lg text-xs lg:text-sm font-medium cursor-pointer transition-colors flex items-center gap-1.5
              ${playMode ? 'bg-coral/15 text-coral' : 'bg-gray-50 text-muted hover:bg-gray-100 hover:text-text'}`}
            onClick={() => setPlayMode((p) => !p)}
          >
            {playMode ? 'Edit' : 'Pads'}
          </button>
        </div>
      </div>

      {/* Mobile expanded transport overlay */}
      {showFullTransport && (
        <div className="md:hidden mb-3">
          <Transport
            bpm={state.bpm}
            noteValue={state.noteValue}
            swing={state.swing}
            humanize={state.humanize}
            isPlaying={isPlaying}
            previewMode={previewMode}
            onTogglePlay={handlePlay}
            onSetBpm={(bpm) => dispatch({ type: 'SET_BPM', bpm })}
            onSetNoteValue={(noteValue) => dispatch({ type: 'SET_NOTE_VALUE', noteValue })}
            onSetSwing={(swing) => dispatch({ type: 'SET_SWING', swing })}
            onSetHumanize={(humanize) => dispatch({ type: 'SET_HUMANIZE', humanize })}
            onTogglePreview={() => setPreviewMode((p) => !p)}
          />
          {/* Mobile action buttons */}
          <div className="flex items-center gap-1.5 mt-2 flex-wrap">
            <button className="action-btn px-2.5 py-1 rounded-lg bg-sky/10 text-[10px] font-medium text-sky cursor-pointer" onClick={() => { setLibraryOpen(true); setShowFullTransport(false); }}>Library</button>
            <button className="action-btn px-2.5 py-1 rounded-lg bg-gray-50 text-[10px] font-medium text-muted cursor-pointer" onClick={() => { setShareOpen(true); setShowFullTransport(false); }}>Share</button>
            <button className="action-btn px-2.5 py-1 rounded-lg bg-gray-50 text-[10px] font-medium text-muted cursor-pointer" onClick={handleImport}>Import</button>
            <button className="action-btn px-2.5 py-1 rounded-lg bg-gray-50 text-[10px] font-medium text-muted cursor-pointer" onClick={handleExport}>Export</button>
            <button className="action-btn px-2.5 py-1 rounded-lg bg-gray-50 text-[10px] font-medium text-muted cursor-pointer" onClick={handleMidiExport}>MIDI</button>
          </div>
        </div>
      )}

      {/* Desktop transport — hidden on mobile */}
      <div className="mb-4 hidden md:block">
        <Transport
          bpm={state.bpm}
          noteValue={state.noteValue}
          swing={state.swing}
          humanize={state.humanize}
          isPlaying={isPlaying}
          previewMode={previewMode}
          onTogglePlay={handlePlay}
          onSetBpm={(bpm) => dispatch({ type: 'SET_BPM', bpm })}
          onSetNoteValue={(noteValue) => dispatch({ type: 'SET_NOTE_VALUE', noteValue })}
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
          actions={
            <button
              className={`notation-toggle-btn px-3 py-1 rounded-lg text-xs lg:text-sm font-semibold cursor-pointer transition-all flex items-center gap-1.5 shrink-0
                ${notationView
                  ? 'bg-text text-white'
                  : 'bg-gray-50 text-muted hover:bg-gray-100 hover:text-text'
                }`}
              onClick={() => setNotationView((v) => !v)}
              title={notationView ? 'Switch to grid view' : 'Switch to notation view'}
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.2">
                <line x1="2" y1="4" x2="14" y2="4" /><line x1="2" y1="6.5" x2="14" y2="6.5" />
                <line x1="2" y1="9" x2="14" y2="9" /><line x1="2" y1="11.5" x2="14" y2="11.5" />
                <line x1="2" y1="14" x2="14" y2="14" />
                <circle cx="6" cy="6.5" r="1.8" fill="currentColor" stroke="none" />
                <line x1="7.8" y1="6.5" x2="7.8" y2="2" strokeWidth="1.5" />
                <circle cx="10" cy="11.5" r="1.8" fill="currentColor" stroke="none" />
                <line x1="11.8" y1="11.5" x2="11.8" y2="7" strokeWidth="1.5" />
              </svg>
              {notationView ? 'Grid' : 'Notation'}
            </button>
          }
        />
      </div>

      {/* Preset header */}
      {activePreset && (
        <div className="preset-header flex items-center gap-3 mb-4">
          {activePreset.cover && (
            <img
              src={activePreset.cover}
              alt={activePreset.name}
              className="preset-info-cover w-12 h-12 rounded-xl object-cover shrink-0"
              onError={(e) => { e.target.style.display = 'none'; }}
            />
          )}
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-base lg:text-lg font-display font-bold text-text truncate">{activePreset.name}</span>
              {activePreset.links?.wikipedia && (
                <a href={activePreset.links.wikipedia} target="_blank" rel="noopener noreferrer" className="opacity-40 hover:opacity-100 transition-opacity" title="Wikipedia">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" className="text-muted"><path d="M8 1a7 7 0 100 14A7 7 0 008 1zM4.6 5h1.2l1.5 3.8L8.8 5H10l-2.5 6H6.3L4.6 5z"/></svg>
                </a>
              )}
              {activePreset.links?.spotify && (
                <a href={activePreset.links.spotify} target="_blank" rel="noopener noreferrer" className="opacity-40 hover:opacity-100 transition-opacity" title="Spotify">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="#1DB954"><path d="M8 0a8 8 0 100 16A8 8 0 008 0zm3.67 11.56a.5.5 0 01-.68.16c-1.87-1.14-4.22-1.4-6.99-.77a.5.5 0 01-.22-.97c3.03-.69 5.63-.39 7.73.9a.5.5 0 01.16.68zm.98-2.18a.62.62 0 01-.85.2c-2.14-1.31-5.4-1.69-7.93-.93a.62.62 0 01-.36-1.18c2.9-.88 6.5-.45 8.94 1.06a.62.62 0 01.2.85zm.08-2.27C10.5 5.6 6.1 5.46 3.56 6.25a.74.74 0 11-.43-1.42C6.02 3.9 10.9 4.06 13.4 5.82a.74.74 0 01-.77 1.29z"/></svg>
                </a>
              )}
              {activePreset.links?.youtube && (
                <a href={activePreset.links.youtube} target="_blank" rel="noopener noreferrer" className="opacity-40 hover:opacity-100 transition-opacity" title="YouTube">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="#FF0000"><path d="M14.6 4.3a1.9 1.9 0 00-1.3-1.3C12.2 2.7 8 2.7 8 2.7s-4.2 0-5.3.3A1.9 1.9 0 001.4 4.3 19.6 19.6 0 001 8c0 1.3.1 2.5.4 3.7a1.9 1.9 0 001.3 1.3c1.1.3 5.3.3 5.3.3s4.2 0 5.3-.3a1.9 1.9 0 001.3-1.3c.3-1.2.4-2.4.4-3.7s-.1-2.5-.4-3.7zM6.5 10.2V5.8L10.4 8l-3.9 2.2z"/></svg>
                </a>
              )}
            </div>
            {activePreset.credit && (
              <span className="text-xs lg:text-sm text-muted">
                {activePreset.creditUrl ? (
                  <a href={activePreset.creditUrl} target="_blank" rel="noopener noreferrer" className="hover:text-sky transition-colors">{activePreset.credit}</a>
                ) : activePreset.credit}
              </span>
            )}
          </div>
        </div>
      )}

      {/* Notation view */}
      {notationView && currentPage && (
        <div className="mb-4">
          <NotationView
            tracks={currentPage.tracks}
            stepsPerPage={state.stepsPerPage}
            currentStep={currentStep}
            noteValue={state.noteValue}
          />
        </div>
      )}

      {/* Grid */}
      {!notationView && currentPage && (
        <div className={playMode ? 'pb-28' : ''}>
          <Grid
            tracks={currentPage.tracks}
            currentStep={currentStep}
            stepsPerPage={state.stepsPerPage}
            noteValue={state.noteValue}
            onToggleCell={playMode ? () => {} : handleToggleCell}
            onChangeProp={playMode ? () => {} : handleChangeProp}
            onChangeSource={playMode ? () => {} : handleChangeSource}
            onChangeVelMode={playMode ? () => {} : handleChangeVelMode}
            onRemoveTrack={playMode ? () => {} : (i) => dispatch({ type: 'REMOVE_TRACK', trackIndex: i })}
            onAddTrack={playMode ? undefined : () => dispatch({ type: 'ADD_TRACK' })}
            onPreview={playMode ? () => {} : (track) => audioEngine.previewSound(track)}
            onDrop={playMode ? () => {} : handleDrop}
          />
        </div>
      )}

      {/* Preset description */}
      {activePreset?.body && (
        <div className="preset-body mt-4 bg-card rounded-2xl shadow-sm border border-border px-5 py-4">
          <p className="text-sm lg:text-base text-text/80 leading-relaxed">{activePreset.body}</p>
          {activePreset?.notes && (
            <p className="text-xs lg:text-sm text-muted mt-2 pt-2 border-t border-border italic">{activePreset.notes}</p>
          )}
        </div>
      )}

      {/* Loading overlay */}
      {loadingTracks.size > 0 && (
        <div className="loading-indicator fixed bottom-4 right-4 bg-card rounded-xl shadow-lg border border-border px-4 py-2 flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-sky animate-pulse" />
          <span className="text-xs font-medium text-muted">Loading sounds...</span>
        </div>
      )}

      {/* MPC Pads — play mode on mobile or desktop */}
      {playMode && currentPage && (
        <div className={`${playMode ? 'pb-24' : ''}`}>
          <MpcPads
            tracks={currentPage.tracks}
            onTrigger={handleMpcTrigger}
          />
        </div>
      )}

      {/* Keyboard shortcuts hint */}
      <div className="drumlet-shortcuts mt-6 text-center text-[10px] text-muted/50 hidden md:block" style={embed ? { display: 'none' } : undefined}>
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
