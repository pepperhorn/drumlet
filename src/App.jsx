import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { SequencerProvider, useSequencer } from './state/SequencerContext.jsx';
import { useAudioEngine } from './audio/useAudioEngine.js';
import { useTransport } from './audio/useTransport.js';
import { exportToFile, importFromFile } from './state/projectSerializer.js';
import { exportMidi } from './state/midiExport.js';
import { maxLevel } from './audio/velocityConfig.js';
import { isSplit } from './util/stepHelpers.js';
import Grid from './components/Grid.jsx';
import Transport, { BpmInput } from './components/Transport.jsx';
import PageTabs from './components/PageTabs.jsx';
import Library from './components/Library.jsx';
import ShareModal from './components/ShareModal.jsx';
import NotationView from './components/NotationView.jsx';
import MpcPads from './components/MpcPads.jsx';
import PluginModal from './components/PluginModal.jsx';
import { buildShareUrl, isEmbedMode, loadSharedPayload } from './state/shareCodec.js';
import { TIME_SIGNATURES, getStepConfigs } from './state/sequencerReducer.js';
import { normalizeSequencerState } from './state/normalizeSequencerState.js';
import { useUserLibrary } from './state/userLibrary.js';
import { ACTION_KINDS, getFieldValue } from './plugins/librarySchema.js';
import { createPluginRuntime } from './plugins/runtime.js';
import { DEFAULT_SCORE_POLICY } from './plugins/timeline.js';
import { getModePlugin, PRACTICE_PLUGIN_ID, TELEPHONE_PLUGIN_ID } from './plugins/modePlugins.js';

function snapshotState(state) {
  const normalized = normalizeSequencerState(state);
  return normalized ? JSON.stringify(normalized) : null;
}

const PAD_KEYS = ['A', 'S', 'D', 'F', 'J', 'K', 'L', ';'];

function Drumlet() {
  const { state, dispatch } = useSequencer();
  const { entries, bookmarks, addEntry, updateEntry, removeEntry, toggleBookmark } = useUserLibrary();
  const audioEngine = useAudioEngine();
  const pluginRuntime = useMemo(() => createPluginRuntime(), []);
  const libraryCollections = useMemo(() => pluginRuntime.getLibraryCollections(), [pluginRuntime]);
  const modePlugins = useMemo(() => pluginRuntime.getModePlugins(), [pluginRuntime]);
  const audioFollowCore = useMemo(() => pluginRuntime.getCapability('audio-follow-core'), [pluginRuntime]);
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
  const [currentSaveId, setCurrentSaveId] = useState(null);
  const [isDirty, setIsDirty] = useState(false);
  const [libraryEditMode, setLibraryEditMode] = useState(null);
  const [splitMode, setSplitMode] = useState(null); // null, 2, 3, or 4
  const [pluginOpen, setPluginOpen] = useState(false);
  const [selectedModeId, setSelectedModeId] = useState(PRACTICE_PLUGIN_ID);
  const [pluginSourceItem, setPluginSourceItem] = useState(null);
  const [pluginStatus, setPluginStatus] = useState('setup');
  const [pluginCountdown, setPluginCountdown] = useState(0);
  const [pluginResult, setPluginResult] = useState(null);
  const [pluginShareUrl, setPluginShareUrl] = useState('');
  const [pluginInputMode, setPluginInputMode] = useState('pads');
  const [pluginLoops, setPluginLoops] = useState(1);
  const [pluginTargetScore, setPluginTargetScore] = useState(85);
  const [pluginPerformerName, setPluginPerformerName] = useState('');
  const [pluginTurnLengthSteps, setPluginTurnLengthSteps] = useState(32);
  const [activePadTrackIds, setActivePadTrackIds] = useState(new Set());
  const [embed] = useState(() => isEmbedMode());
  const customBuffersRef = useRef(new Map()); // trackId → AudioBuffer
  const savedSnapshotRef = useRef(snapshotState(state));
  const pluginSessionRef = useRef(null);
  const pluginCaptureRef = useRef(null);
  const pluginTimerRefs = useRef([]);
  const pluginReferenceTimeRef = useRef(0);
  const activePadTimeoutsRef = useRef(new Map());

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
  const selectedModePlugin = useMemo(
    () => getModePlugin(selectedModeId) || modePlugins[0] || null,
    [modePlugins, selectedModeId]
  );
  const padKeyMap = useMemo(() => {
    const map = {};
    (currentPage?.tracks || []).forEach((track, index) => {
      map[track.id] = PAD_KEYS[index] || String(index + 1);
    });
    return map;
  }, [currentPage]);
  const reversePadKeyMap = useMemo(
    () => Object.fromEntries(Object.entries(padKeyMap).map(([trackId, key]) => [key.toLowerCase(), trackId])),
    [padKeyMap]
  );

  const buildActivePreset = useCallback((metadata = {}) => ({
    sourceEntryId: metadata.sourceEntryId || null,
    sourcePreset: metadata.sourcePreset || null,
    name: metadata.name || 'Untitled',
    inTheStyleOf: metadata.inTheStyleOf ?? false,
    credit: metadata.credit || '',
    creditUrl: metadata.creditUrl || '',
    cover: metadata.cover || '',
    links: metadata.links || {},
    bpm: metadata.bpm ?? null,
    body: metadata.body || null,
    notes: metadata.notes || null,
  }), []);

  const buildActivePresetFromLibraryItem = useCallback((item) => buildActivePreset({
    name: item.title,
    inTheStyleOf: item.card?.subtitle === 'In the style of' || getFieldValue(item, 'in_the_style_of', false),
    credit: getFieldValue(item, 'credit', ''),
    creditUrl: getFieldValue(item, 'credit_url', ''),
    cover: item.card?.cover || getFieldValue(item, 'cover', ''),
    links: getFieldValue(item, 'links', {}),
    bpm: getFieldValue(item, 'bpm', null),
    body: getFieldValue(item, 'description', null),
    notes: getFieldValue(item, 'notes', null),
    sourcePreset: getFieldValue(item, 'source_preset', item.title),
  }), [buildActivePreset]);

  const markClean = useCallback((nextState) => {
    savedSnapshotRef.current = snapshotState(nextState);
    setIsDirty(false);
  }, []);

  const clearPluginTimers = useCallback(() => {
    pluginTimerRefs.current.forEach((timerId) => window.clearTimeout(timerId));
    pluginTimerRefs.current = [];
  }, []);

  const pulsePadTrack = useCallback((trackId) => {
    setActivePadTrackIds((prev) => {
      const next = new Set(prev);
      next.add(trackId);
      return next;
    });

    const existingTimer = activePadTimeoutsRef.current.get(trackId);
    if (existingTimer) {
      window.clearTimeout(existingTimer);
    }

    const timerId = window.setTimeout(() => {
      setActivePadTrackIds((prev) => {
        const next = new Set(prev);
        next.delete(trackId);
        return next;
      });
      activePadTimeoutsRef.current.delete(trackId);
    }, 140);

    activePadTimeoutsRef.current.set(trackId, timerId);
  }, []);

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
    const page = stateRef.current.pages[stateRef.current.currentPageIndex];
    const track = page?.tracks[trackIndex];
    const stepData = track?.steps[stepIndex];

    if (isRightClick) {
      // Right-click always clears (removes split too)
      dispatch({ type: 'SET_CELL', trackIndex, stepIndex, velocity: 0 });
    } else if (splitMode && !isSplit(stepData)) {
      // Split mode active + clicking a non-split cell → apply split
      dispatch({ type: 'SPLIT_CELL', trackIndex, stepIndex, splitCount: splitMode });
    } else if (splitMode && isSplit(stepData) && stepData.length !== splitMode) {
      // Split mode active + different split count → re-split
      dispatch({ type: 'SPLIT_CELL', trackIndex, stepIndex, splitCount: splitMode });
    } else if (!isSplit(stepData)) {
      // Normal toggle
      dispatch({ type: 'TOGGLE_CELL', trackIndex, stepIndex });

      // Preview: play the sound at the new velocity
      if (previewMode && audioEngine.instrumentsRef.current.has(track?.id)) {
        if (track) {
          const max = maxLevel(track.velMode || 3);
          const newVel = (stepData + 1) % (max + 1);
          if (newVel > 0) {
            audioEngine.triggerNote(track, newVel, audioEngine.getContext().currentTime + 0.01, track.velMode || 3);
          }
        }
      }
    }
    // If split cell clicked without splitMode → handled by Cell's onExpandToggle
  }, [dispatch, previewMode, audioEngine, splitMode, startAudio]);

  const handleToggleSubStep = useCallback((trackIndex, stepIndex, subIndex) => {
    startAudio();
    dispatch({ type: 'TOGGLE_SUBSTEP', trackIndex, stepIndex, subIndex });

    // Preview the sub-step sound
    if (previewMode) {
      const page = stateRef.current.pages[stateRef.current.currentPageIndex];
      const track = page?.tracks[trackIndex];
      if (track && audioEngine.instrumentsRef.current.has(track.id)) {
        const stepData = track.steps[stepIndex];
        if (isSplit(stepData)) {
          const max = maxLevel(track.velMode || 3);
          const newVel = (stepData[subIndex] + 1) % (max + 1);
          if (newVel > 0) {
            audioEngine.triggerNote(track, newVel, audioEngine.getContext().currentTime + 0.01, track.velMode || 3);
          }
        }
      }
    }
  }, [dispatch, previewMode, audioEngine, startAudio]);

  const handleClearSubStep = useCallback((trackIndex, stepIndex, subIndex) => {
    dispatch({ type: 'SET_SUBSTEP', trackIndex, stepIndex, subIndex, velocity: 0 });
  }, [dispatch]);

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
    pulsePadTrack(track.id);

    if (pluginStatus === 'running' && pluginInputMode === 'pads' && pluginSessionRef.current) {
      const ctx = audioEngine.getContext();
      pluginSessionRef.current.recordEvent({
        source: 'pad',
        trackId: track.id,
        timeSec: Math.max(0, ctx.currentTime - pluginReferenceTimeRef.current),
        confidence: 1,
      });
    }
  }, [audioEngine, pluginInputMode, pluginStatus, pulsePadTrack]);

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

  const loadStateIntoSequencer = useCallback((nextState, nextActivePreset = null, nextSaveId = null, closeLibrary = true) => {
    const normalizedState = normalizeSequencerState(nextState);
    if (!normalizedState) return false;

    stop();
    dispatch({ type: 'LOAD_STATE', state: normalizedState });
    setActivePreset(nextActivePreset);
    setCurrentSaveId(nextSaveId);
    setLibraryEditMode(null);
    markClean(normalizedState);
    if (closeLibrary) setLibraryOpen(false);
    return true;
  }, [dispatch, markClean, stop]);

  const handleLoadLibraryState = useCallback((item) => {
    const nextState = getFieldValue(item, 'pattern_state');
    if (!nextState) return;

    loadStateIntoSequencer(nextState, buildActivePresetFromLibraryItem(item), null, true);
  }, [buildActivePresetFromLibraryItem, loadStateIntoSequencer]);

  const handleLoadUserEntry = useCallback((entry) => {
    const nextState = normalizeSequencerState(entry.state);
    if (!nextState) return;

    loadStateIntoSequencer(nextState, buildActivePreset({
      ...entry,
      sourceEntryId: entry.id,
    }), entry.id, true);
  }, [buildActivePreset, loadStateIntoSequencer]);

  // Load shared state from URL on mount
  useEffect(() => {
    const sharedPayload = loadSharedPayload();
    if (sharedPayload?.state) {
      const nextState = normalizeSequencerState(sharedPayload.state);
      if (!nextState) return;
      dispatch({ type: 'LOAD_STATE', state: nextState });
      setCurrentSaveId(null);
      setActivePreset(null);
      markClean(nextState);
      if (sharedPayload.pluginMeta?.modeId) {
        const sharedMode = getModePlugin(sharedPayload.pluginMeta.modeId);
        if (sharedMode) {
          setSelectedModeId(sharedMode.manifest.id);
          setPluginInputMode(sharedPayload.pluginMeta.inputMode || sharedMode.defaults?.inputMode || 'pads');
          setPluginLoops(sharedPayload.pluginMeta.loops || sharedMode.defaults?.loops || 1);
          setPluginTargetScore(sharedPayload.pluginMeta.targetScore || sharedMode.defaults?.targetScore || 85);
          setPluginPerformerName(sharedPayload.pluginMeta.performerName || '');
          setPluginTurnLengthSteps(sharedPayload.pluginMeta.turnLengthSteps || sharedMode.defaults?.turnLengthSteps || 32);
          setPluginResult(sharedPayload.pluginMeta.result || null);
          setPluginStatus(sharedPayload.pluginMeta.result ? 'results' : 'setup');
          setPluginSourceItem(null);
          setPluginOpen(true);
        }
      }
      // Clean hash to avoid reloading on refresh
      window.history.replaceState(null, '', window.location.pathname + window.location.search);
    }
  }, [dispatch, markClean]);

  const handleImport = useCallback(async () => {
    const imported = await importFromFile();
    if (imported) {
      const nextState = normalizeSequencerState(imported);
      if (!nextState) return;
      stop();
      dispatch({ type: 'LOAD_STATE', state: nextState });
      setCurrentSaveId(null);
      setActivePreset(null);
      markClean(nextState);
    }
  }, [dispatch, markClean, stop]);

  useEffect(() => {
    const currentSnapshot = snapshotState(state);
    setIsDirty(currentSnapshot !== savedSnapshotRef.current);
  }, [state]);

  useEffect(() => {
    if (!pluginOpen || pluginStatus !== 'setup' || !selectedModePlugin) return;
    setPluginInputMode(selectedModePlugin.defaults?.inputMode || 'pads');
    setPluginLoops(selectedModePlugin.defaults?.loops || 1);
    setPluginTargetScore(selectedModePlugin.defaults?.targetScore || 85);
    setPluginPerformerName(selectedModePlugin.defaults?.performerName || '');
    setPluginTurnLengthSteps(selectedModePlugin.defaults?.turnLengthSteps || 32);
  }, [pluginOpen, pluginStatus, selectedModePlugin]);

  const openLibrary = useCallback(() => {
    setLibraryEditMode(null);
    setLibraryOpen(true);
  }, []);

  const handleEditEntry = useCallback((id) => {
    setLibraryEditMode({ id, isNew: false });
    setLibraryOpen(true);
  }, []);

  const handleDeleteEntry = useCallback((id) => {
    removeEntry(id);
    if (currentSaveId === id) {
      setCurrentSaveId(null);
      setIsDirty(true);
    }
    if (activePreset?.sourceEntryId === id) {
      setActivePreset(null);
    }
    if (libraryEditMode?.id === id) {
      setLibraryEditMode(null);
    }
  }, [activePreset, currentSaveId, libraryEditMode, removeEntry]);

  const handleSaveEdit = useCallback((metadata) => {
    if (libraryEditMode?.id) {
      updateEntry(libraryEditMode.id, {
        ...metadata,
        bpm: state.bpm,
        swing: state.swing || 0,
        state,
      });

      if (currentSaveId === libraryEditMode.id) {
        setActivePreset((prev) => buildActivePreset({
          ...prev,
          ...metadata,
          bpm: state.bpm,
          sourceEntryId: libraryEditMode.id,
        }));
      }
    } else {
      const entryId = addEntry(metadata, state);
      if (entryId) {
        setCurrentSaveId(entryId);
        setActivePreset(buildActivePreset({
          ...metadata,
          bpm: state.bpm,
          swing: state.swing || 0,
          sourceEntryId: entryId,
        }));
      }
    }

    markClean(state);
    setLibraryEditMode(null);
  }, [addEntry, buildActivePreset, currentSaveId, libraryEditMode, markClean, state, updateEntry]);

  const handleSave = useCallback(() => {
    if (!currentSaveId) {
      setLibraryEditMode({ id: null, isNew: true });
      setLibraryOpen(true);
      return;
    }

    if (!isDirty) return;

    updateEntry(currentSaveId, {
      bpm: state.bpm,
      swing: state.swing || 0,
      state,
    });
    markClean(state);
  }, [currentSaveId, isDirty, markClean, state, updateEntry]);

  const openPluginModal = useCallback((modeId = PRACTICE_PLUGIN_ID, sourceItem = null) => {
    const modePlugin = getModePlugin(modeId) || getModePlugin(PRACTICE_PLUGIN_ID);
    if (!modePlugin) return;

    setSelectedModeId(modePlugin.manifest.id);
    setPluginInputMode(modePlugin.defaults?.inputMode || 'pads');
    setPluginLoops(modePlugin.defaults?.loops || 1);
    setPluginTargetScore(modePlugin.defaults?.targetScore || 85);
    setPluginPerformerName(modePlugin.defaults?.performerName || '');
    setPluginTurnLengthSteps(modePlugin.defaults?.turnLengthSteps || 32);
    setPluginResult(null);
    setPluginShareUrl('');
    setPluginCountdown(0);
    setPluginStatus('setup');
    setPluginSourceItem(sourceItem);
    setPluginOpen(true);
  }, []);

  const closePluginModal = useCallback(() => {
    clearPluginTimers();
    pluginCaptureRef.current?.stop?.();
    pluginCaptureRef.current = null;
    pluginSessionRef.current = null;
    pluginReferenceTimeRef.current = 0;
    setPluginStatus('setup');
    setPluginCountdown(0);
    setPluginOpen(false);
    setActivePadTrackIds(new Set());
    if (isPlaying) stop();
  }, [clearPluginTimers, isPlaying, stop]);

  const handleActivateLibraryItem = useCallback((item, action = null) => {
    const primaryAction = action || item.actions?.[0] || null;
    const nextState = getFieldValue(item, 'pattern_state');

    if (primaryAction?.kind === ACTION_KINDS.LOAD_STATE) {
      handleLoadLibraryState(item);
      return;
    }

    if (primaryAction?.kind === ACTION_KINDS.OPEN_MODE) {
      if (nextState) {
        loadStateIntoSequencer(nextState, buildActivePresetFromLibraryItem(item), null, false);
      }
      setLibraryOpen(false);
      openPluginModal(primaryAction.targetPluginId || PRACTICE_PLUGIN_ID, item);
      return;
    }

    if (nextState) {
      handleLoadLibraryState(item);
      return;
    }

    if (item.actions?.[0]?.targetPluginId) {
      setLibraryOpen(false);
      openPluginModal(item.actions[0].targetPluginId, item);
    }
  }, [buildActivePresetFromLibraryItem, handleLoadLibraryState, loadStateIntoSequencer, openPluginModal]);

  const finalizePluginRun = useCallback((modeId) => {
    const session = pluginSessionRef.current;
    if (!session) return;

    pluginCaptureRef.current?.stop?.();
    pluginCaptureRef.current = null;

    if (isPlaying) {
      stop();
    }

    const result = session.score();
    const pluginMeta = {
      modeId,
      inputMode: pluginInputMode,
      loops: pluginLoops,
      targetScore: pluginTargetScore,
      performerName: pluginPerformerName,
      turnLengthSteps: pluginTurnLengthSteps,
      sourceTitle: pluginSourceItem?.title || activePreset?.name || 'Current pattern',
      result,
    };

    setPluginResult(result);
    setPluginStatus('results');
    setPluginCountdown(0);
    setPluginShareUrl(
      buildShareUrl(state, window.location.origin, pluginMeta)
    );
    pluginSessionRef.current = null;
    pluginReferenceTimeRef.current = 0;
  }, [
    activePreset?.name,
    isPlaying,
    pluginInputMode,
    pluginLoops,
    pluginPerformerName,
    pluginSourceItem?.title,
    pluginTargetScore,
    pluginTurnLengthSteps,
    state,
    stop,
  ]);

  const handleStartPlugin = useCallback(async () => {
    if (!audioFollowCore || !selectedModePlugin) return;

    clearPluginTimers();
    pluginCaptureRef.current?.stop?.();
    pluginCaptureRef.current = null;
    pluginSessionRef.current = null;
    setPluginShareUrl('');
    setPluginResult(null);

    const sessionState = normalizeSequencerState(state);
    if (!sessionState) return;

    if (isPlaying) {
      stop();
    }

    const session = audioFollowCore.createSession({
      state: sessionState,
      mode: pluginInputMode,
      trackIds: currentPage?.tracks?.filter((track) => !track.mute).map((track) => track.id) || null,
      loops: pluginLoops,
      scorePolicy: DEFAULT_SCORE_POLICY,
      audioEngine,
    });
    pluginSessionRef.current = session;

    const countInBeats = (selectedModePlugin.defaults?.countInBars || 1) * (state.beatsPerBar || 4);
    setPluginCountdown(countInBeats);
    setPluginStatus('countdown');
    if (pluginInputMode === 'pads') {
      setPlayMode(true);
    }

    for (let beat = countInBeats - 1; beat >= 1; beat -= 1) {
      const timerId = window.setTimeout(() => {
        setPluginCountdown(beat);
      }, (countInBeats - beat) * (60 / state.bpm) * 1000);
      pluginTimerRefs.current.push(timerId);
    }

    const countInDuration = await session.startCountIn(selectedModePlugin.defaults?.countInBars || 1);
    const startTimerId = window.setTimeout(async () => {
      setPluginStatus('running');
      const ctx = await audioEngine.ensureRunning();
      pluginReferenceTimeRef.current = ctx.currentTime;
      session.setReferenceTime?.(pluginReferenceTimeRef.current);

      if (pluginInputMode === 'audio') {
        pluginCaptureRef.current = await session.startAudioCapture();
      }

      if (!isPlaying) {
        await handlePlay();
      }

      const finishTimerId = window.setTimeout(() => {
        finalizePluginRun(selectedModePlugin.manifest.id);
      }, (session.getDurationSeconds() * 1000) + 120);
      pluginTimerRefs.current.push(finishTimerId);
    }, countInDuration * 1000);

    pluginTimerRefs.current.push(startTimerId);
  }, [
    audioEngine,
    audioFollowCore,
    clearPluginTimers,
    currentPage?.tracks,
    finalizePluginRun,
    handlePlay,
    isPlaying,
    pluginInputMode,
    pluginLoops,
    selectedModePlugin,
    state,
    stop,
  ]);

  const handleRetryPlugin = useCallback(() => {
    setPluginStatus('setup');
    setPluginResult(null);
    setPluginShareUrl('');
    handleStartPlugin();
  }, [handleStartPlugin]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKey = (e) => {
      const tagName = e.target.tagName;
      if (tagName === 'INPUT' || tagName === 'TEXTAREA' || tagName === 'SELECT') return;

      const mappedTrackId = reversePadKeyMap[e.key.toLowerCase()];
      if ((playMode || (pluginStatus === 'running' && pluginInputMode === 'pads')) && mappedTrackId && !e.repeat) {
        e.preventDefault();
        const track = currentPage?.tracks?.find((candidate) => candidate.id === mappedTrackId);
        if (track) {
          handleMpcTrigger(track);
        }
        return;
      }

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
    const handleKeyUp = (e) => {
      const mappedTrackId = reversePadKeyMap[e.key.toLowerCase()];
      if (!mappedTrackId) return;
      setActivePadTrackIds((prev) => {
        if (!prev.has(mappedTrackId)) return prev;
        const next = new Set(prev);
        next.delete(mappedTrackId);
        return next;
      });
    };
    window.addEventListener('keydown', handleKey);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKey);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [
    currentPage?.tracks,
    dispatch,
    handleMpcTrigger,
    playMode,
    pluginInputMode,
    pluginStatus,
    reversePadKeyMap,
    state.bpm,
    state.pages.length,
    toggle,
  ]);

  useEffect(() => () => {
    clearPluginTimers();
    pluginCaptureRef.current?.stop?.();
    activePadTimeoutsRef.current.forEach((timerId) => window.clearTimeout(timerId));
  }, [clearPluginTimers]);

  return (
    <div className={`drumlet-app min-h-screen bg-bg ${embed ? 'p-2 md:p-3' : 'p-4 md:p-6 lg:p-8'}`}>
      {/* Header — on mobile landscape, includes mini transport */}
      <div className="drumlet-header flex items-center justify-between mb-3 md:mb-6 gap-2" style={embed ? { display: 'none' } : undefined}>
        <div className="drumlet-header-left flex items-center gap-2 md:gap-3 shrink-0">
          <h1 className="drumlet-title text-xl md:text-3xl lg:text-4xl font-display font-bold text-text tracking-tight">
            drumlet
          </h1>
          <span className="drumlet-version text-[9px] md:text-xs lg:text-sm font-mono text-muted bg-gray-100 px-1.5 py-0.5 rounded-full hidden md:inline">
            v0.1
          </span>
          {/* Library — mobile: next to title */}
          <button
            className="action-btn md:hidden px-2 py-1 rounded-lg bg-sky/10 text-[10px] font-medium text-sky cursor-pointer flex items-center gap-1"
            onClick={openLibrary}
          >
            <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
              <rect x="2" y="2" width="4" height="5" rx="0.5" /><rect x="2" y="9" width="4" height="5" rx="0.5" />
              <rect x="8" y="2" width="6" height="12" rx="0.5" /><line x1="10" y1="5" x2="12" y2="5" />
              <line x1="10" y1="7" x2="12" y2="7" /><line x1="10" y1="9" x2="12" y2="9" />
            </svg>
            Library
          </button>
          <button
            className="action-btn md:hidden px-2 py-1 rounded-lg bg-coral/10 text-[10px] font-medium text-coral cursor-pointer flex items-center gap-1"
            onClick={() => openPluginModal(PRACTICE_PLUGIN_ID)}
          >
            <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
              <path d="M8 1.5v13" />
              <path d="M1.5 8h13" />
              <path d="M3 3l10 10" />
              <path d="M13 3L3 13" />
            </svg>
            Plugins
          </button>
        </div>

        {/* Mobile mini transport — visible on small screens */}
        <div className="mobile-mini-transport flex items-center gap-1 md:hidden flex-wrap justify-end">
          <button
            className={`mobile-save-btn relative w-9 h-9 rounded-xl flex items-center justify-center cursor-pointer transition-all active:scale-95 border
              ${isDirty
                ? 'bg-sky/10 text-sky border-sky/30'
                : 'bg-gray-50 text-muted border-border'}`}
            onClick={handleSave}
            title={currentSaveId ? (isDirty ? 'Save changes' : 'Saved') : 'Save to your library'}
          >
            <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 2.5h8l2.5 2.5v8A1.5 1.5 0 0 1 12 14.5H4A1.5 1.5 0 0 1 2.5 13V4A1.5 1.5 0 0 1 4 2.5z" />
              <path d="M5 2.5v4h5v-4" />
              <path d="M5 11h6" />
            </svg>
            {isDirty && <span className="mobile-save-dot absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-coral" />}
          </button>

          {/* Play */}
          <button
            className={`mobile-play-btn w-9 h-9 rounded-xl flex items-center justify-center text-white cursor-pointer transition-all active:scale-95
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
          <BpmInput bpm={state.bpm} onSetBpm={(v) => dispatch({ type: 'SET_BPM', bpm: v })} compact />
          {/* Time signature */}
          <select
            className="mobile-time-sig h-8 px-1 rounded-lg bg-gray-100 text-[10px] font-mono font-semibold text-muted cursor-pointer border-none outline-none"
            value={`${state.beatsPerBar}/${TIME_SIGNATURES.find(ts => ts.num === state.beatsPerBar && ts.noteValue === state.noteValue)?.denom || 4}`}
            onChange={(e) => {
              const ts = TIME_SIGNATURES.find(t => t.label === e.target.value);
              if (ts) dispatch({ type: 'SET_TIME_SIG', beatsPerBar: ts.num, noteValue: ts.noteValue });
            }}
          >
            {TIME_SIGNATURES.map((ts) => (
              <option key={ts.label} value={ts.label}>{ts.label}</option>
            ))}
          </select>
          {/* Step divisor — compact note glyphs */}
          <div className="mobile-step-div flex items-center h-8 rounded-lg bg-gray-100 px-0.5">
            {[
              { key: '1/16', glyph: '\uE1D9' },
              { key: '1/8',  glyph: '\uE1D7' },
              { key: '1/4',  glyph: '\uE1D5' },
            ].map((opt) => (
              <button
                key={opt.key}
                className={`mobile-step-btn w-6 h-full flex items-center justify-center cursor-pointer rounded transition-colors
                  ${state.stepValue === opt.key ? 'bg-sky/15 text-sky' : 'text-muted hover:text-text'}`}
                onClick={() => dispatch({ type: 'SET_STEP_VALUE', stepValue: opt.key })}
              >
                <span className="mobile-step-glyph block" style={{ fontFamily: 'Petaluma', fontSize: '18px', lineHeight: 0 }}>{opt.glyph}</span>
              </button>
            ))}
          </div>
          {/* Preview toggle */}
          <button
            className={`mobile-preview-btn w-8 h-8 rounded-lg flex items-center justify-center cursor-pointer transition-all active:scale-95
              ${previewMode
                ? 'bg-sky/15 text-sky'
                : 'bg-gray-100 text-muted'
              }`}
            onClick={() => setPreviewMode((p) => !p)}
            title={previewMode ? 'Preview on' : 'Preview off'}
          >
            <svg width="14" height="14" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 8 A6 6 0 0 1 16 8" />
              <rect x="3" y="8" width="3.5" height="5.5" rx="1" />
              <rect x="13.5" y="8" width="3.5" height="5.5" rx="1" />
              <line x1="10" y1="2" x2="10" y2="5" />
            </svg>
          </button>
          {/* Edit/Play mode toggle */}
          <button
            className={`mobile-mode-btn w-8 h-8 rounded-lg flex items-center justify-center cursor-pointer transition-colors
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
          {/* More controls (swing, humanize, actions) */}
          <button
            className="mobile-more-btn w-8 h-8 rounded-lg bg-gray-100 text-muted hover:text-text flex items-center justify-center cursor-pointer"
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
            onClick={openLibrary}
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
              <rect x="2" y="2" width="4" height="5" rx="0.5" /><rect x="2" y="9" width="4" height="5" rx="0.5" />
              <rect x="8" y="2" width="6" height="12" rx="0.5" /><line x1="10" y1="5" x2="12" y2="5" />
              <line x1="10" y1="7" x2="12" y2="7" /><line x1="10" y1="9" x2="12" y2="9" />
            </svg>
            Library
          </button>
          <button
            className="action-btn px-3 py-1.5 rounded-lg bg-coral/10 text-xs lg:text-sm font-medium text-coral hover:bg-coral/20 transition-colors cursor-pointer flex items-center gap-1.5"
            onClick={() => openPluginModal(PRACTICE_PLUGIN_ID)}
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
              <path d="M8 1.5v13" />
              <path d="M1.5 8h13" />
              <path d="M3 3l10 10" />
              <path d="M13 3L3 13" />
            </svg>
            Plugins
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

      {/* Mobile expanded controls — swing, humanize, actions (no duplicate transport) */}
      {showFullTransport && (
        <div className="mobile-expanded-controls md:hidden mb-3 bg-card rounded-2xl shadow-sm border border-border px-3 py-2.5">
          <div className="mobile-expanded-row flex items-center gap-3 flex-wrap">
            {/* Swing + target */}
            <div className="mobile-swing flex items-center gap-2">
              <div className="mobile-swing-dial flex flex-col items-center gap-0.5">
                <span className="mobile-swing-label text-[9px] text-muted font-semibold uppercase tracking-wide">Swing</span>
                <input
                  type="range"
                  className="mobile-swing-slider w-20 h-1 accent-amber cursor-pointer"
                  min={0} max={100}
                  value={state.swing}
                  onChange={(e) => dispatch({ type: 'SET_SWING', swing: Number(e.target.value) })}
                />
                <span className="mobile-swing-value text-[9px] font-mono text-muted">{state.swing}</span>
              </div>
              <div className="swing-target-toggle flex flex-col gap-0.5">
                {['8th', '16th'].map((t) => (
                  <button
                    key={t}
                    className={`mobile-swing-target-btn px-1.5 py-0.5 rounded text-[9px] font-mono font-semibold cursor-pointer transition-colors leading-tight
                      ${(state.swingTarget || '8th') === t ? 'bg-amber/15 text-amber' : 'text-muted/50 hover:text-muted'}`}
                    onClick={() => dispatch({ type: 'SET_SWING_TARGET', swingTarget: t })}
                  >
                    {t}
                  </button>
                ))}
              </div>
            </div>
            {/* Humanize */}
            <div className="mobile-humanize flex flex-col items-center gap-0.5">
              <span className="mobile-humanize-label text-[9px] text-muted font-semibold uppercase tracking-wide">Human</span>
              <input
                type="range"
                className="mobile-humanize-slider w-20 h-1 accent-lavender cursor-pointer"
                min={0} max={100}
                value={state.humanize}
                onChange={(e) => dispatch({ type: 'SET_HUMANIZE', humanize: Number(e.target.value) })}
              />
              <span className="mobile-humanize-value text-[9px] font-mono text-muted">{state.humanize}</span>
            </div>
            {/* Tap tempo */}
            <button
              className="mobile-tap-btn px-2 py-1 rounded-lg bg-gray-100 text-[10px] font-semibold text-muted cursor-pointer active:scale-95"
              onClick={() => {
                // Inline tap tempo for mobile
                const now = performance.now();
                if (!window._tapTimes) window._tapTimes = [];
                window._tapTimes.push(now);
                if (window._tapTimes.length > 5) window._tapTimes.shift();
                if (window._tapTimes.length >= 2) {
                  const intervals = [];
                  for (let i = 1; i < window._tapTimes.length; i++) intervals.push(window._tapTimes[i] - window._tapTimes[i - 1]);
                  const avg = intervals.reduce((a, b) => a + b, 0) / intervals.length;
                  const tapBpm = Math.round(60000 / avg);
                  if (tapBpm >= 20 && tapBpm <= 300) dispatch({ type: 'SET_BPM', bpm: tapBpm });
                }
                setTimeout(() => { if (window._tapTimes?.length && performance.now() - window._tapTimes[window._tapTimes.length - 1] > 2000) window._tapTimes = []; }, 2100);
              }}
            >
              TAP
            </button>
          </div>
          {/* Action buttons */}
          <div className="mobile-action-btns flex items-center gap-1.5 mt-2 flex-wrap">
            <button className="action-btn px-2.5 py-1 rounded-lg bg-gray-50 text-[10px] font-medium text-muted cursor-pointer" onClick={() => { setShareOpen(true); setShowFullTransport(false); }}>Share</button>
            <button className="action-btn px-2.5 py-1 rounded-lg bg-gray-50 text-[10px] font-medium text-muted cursor-pointer" onClick={handleImport}>Import</button>
            <button className="action-btn px-2.5 py-1 rounded-lg bg-gray-50 text-[10px] font-medium text-muted cursor-pointer" onClick={handleExport}>Export</button>
            <button className="action-btn px-2.5 py-1 rounded-lg bg-gray-50 text-[10px] font-medium text-muted cursor-pointer" onClick={handleMidiExport}>MIDI</button>
          </div>
        </div>
      )}

      {/* Desktop transport — hidden on mobile */}
      <div className="desktop-transport mb-4 hidden md:block">
        <Transport
          bpm={state.bpm}
          noteValue={state.noteValue}
          beatsPerBar={state.beatsPerBar}
          stepValue={state.stepValue}
          swing={state.swing}
          swingTarget={state.swingTarget}
          humanize={state.humanize}
          isPlaying={isPlaying}
          previewMode={previewMode}
          isDirty={isDirty}
          hasSaveId={Boolean(currentSaveId)}
          onSave={handleSave}
          onTogglePlay={handlePlay}
          onSetBpm={(bpm) => dispatch({ type: 'SET_BPM', bpm })}
          onSetTimeSig={(beatsPerBar, noteValue) => dispatch({ type: 'SET_TIME_SIG', beatsPerBar, noteValue })}
          onSetStepValue={(stepValue) => dispatch({ type: 'SET_STEP_VALUE', stepValue })}
          onSetSwing={(swing) => dispatch({ type: 'SET_SWING', swing })}
          onSetSwingTarget={(swingTarget) => dispatch({ type: 'SET_SWING_TARGET', swingTarget })}
          onSetHumanize={(humanize) => dispatch({ type: 'SET_HUMANIZE', humanize })}
          onTogglePreview={() => setPreviewMode((p) => !p)}
        />
      </div>

      {/* Page tabs */}
      <div className="page-tabs-wrap mb-4" style={embed ? { display: 'none' } : undefined}>
        <PageTabs
          pages={state.pages}
          currentPageIndex={state.currentPageIndex}
          stepsPerPage={state.stepsPerPage}
          stepOptions={getStepConfigs(TIME_SIGNATURES.find(t => t.num === state.beatsPerBar && t.noteValue === state.noteValue)?.label || '4/4')}
          chainMode={state.chainMode}
          splitMode={splitMode}
          onSetPage={(i) => dispatch({ type: 'SET_CURRENT_PAGE', pageIndex: i })}
          onAddPage={() => dispatch({ type: 'ADD_PAGE' })}
          onRemovePage={(i) => dispatch({ type: 'REMOVE_PAGE', pageIndex: i })}
          onSetStepsPerPage={(n) => dispatch({ type: 'SET_STEPS_PER_PAGE', stepsPerPage: n })}
          onToggleChainMode={() => dispatch({ type: 'TOGGLE_CHAIN_MODE' })}
          onSetSplitMode={setSplitMode}
          onClearPage={() => dispatch({ type: 'CLEAR_PAGE' })}
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
          <div className="preset-info min-w-0">
            <div className="preset-info-title flex items-center gap-2">
              <span className="preset-info-name text-base lg:text-lg font-display font-bold text-text truncate">{activePreset.name}</span>
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
              <span className="preset-info-credit text-xs lg:text-sm text-muted">
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
        <div className="notation-view-wrap mb-4">
          <NotationView
            pages={state.pages}
            stepsPerPage={state.stepsPerPage}
            currentStep={currentStep}
            currentPageIndex={state.currentPageIndex}
            noteValue={state.noteValue}
            beatsPerBar={state.beatsPerBar}
            stepValue={state.stepValue}
          />
        </div>
      )}

      {/* Grid */}
      {!notationView && currentPage && (
        <div className={`grid-wrap ${playMode ? 'pb-28' : ''}`}>
          <Grid
            tracks={currentPage.tracks}
            currentStep={currentStep}
            stepsPerPage={state.stepsPerPage}
            noteValue={state.noteValue}
            sectionHeadings={currentPage.sectionHeadings}
            splitMode={splitMode}
            notationView={notationView}
            onToggleNotation={() => setNotationView((v) => !v)}
            onAddSectionHeading={(step, label) => dispatch({ type: 'ADD_SECTION_HEADING', step, label })}
            onUpdateSectionHeading={(id, label) => dispatch({ type: 'UPDATE_SECTION_HEADING', id, label })}
            onMoveSectionHeading={(id, step) => dispatch({ type: 'MOVE_SECTION_HEADING', id, step })}
            onRemoveSectionHeading={(id) => dispatch({ type: 'REMOVE_SECTION_HEADING', id })}
            onToggleCell={playMode ? () => {} : handleToggleCell}
            onToggleSubStep={playMode ? () => {} : handleToggleSubStep}
            onClearSubStep={playMode ? () => {} : handleClearSubStep}
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
          <p className="preset-body-text text-sm lg:text-base text-text/80 leading-relaxed">{activePreset.body}</p>
          {activePreset?.notes && (
            <p className="preset-body-notes text-xs lg:text-sm text-muted mt-2 pt-2 border-t border-border italic">{activePreset.notes}</p>
          )}
        </div>
      )}

      {/* Loading overlay */}
      {loadingTracks.size > 0 && (
        <div className="loading-indicator fixed bottom-4 right-4 bg-card rounded-xl shadow-lg border border-border px-4 py-2 flex items-center gap-2">
          <div className="loading-indicator-dot w-3 h-3 rounded-full bg-sky animate-pulse" />
          <span className="loading-indicator-text text-xs font-medium text-muted">Loading sounds...</span>
        </div>
      )}

      {/* MPC Pads — play mode on mobile or desktop */}
      {playMode && currentPage && (
        <div className={`mpc-pads-wrap ${playMode ? 'pb-24' : ''}`}>
          <MpcPads
            tracks={currentPage.tracks}
            onTrigger={handleMpcTrigger}
            keyMap={padKeyMap}
            activeTrackIds={activePadTrackIds}
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
        onClose={() => {
          setLibraryOpen(false);
          setLibraryEditMode(null);
        }}
        libraryCollections={libraryCollections}
        userEntries={entries}
        bookmarks={bookmarks}
        onToggleBookmark={toggleBookmark}
        onEditEntry={handleEditEntry}
        onDeleteEntry={handleDeleteEntry}
        onLoadUserEntry={handleLoadUserEntry}
        onActivateLibraryItem={handleActivateLibraryItem}
        editMode={libraryEditMode}
        onSaveEdit={handleSaveEdit}
        onCancelEdit={() => setLibraryEditMode(null)}
        activePreset={activePreset}
        state={state}
      />

      {/* Share modal */}
      <ShareModal
        isOpen={shareOpen}
        onClose={() => setShareOpen(false)}
        state={state}
      />

      <PluginModal
        isOpen={pluginOpen}
        onClose={closePluginModal}
        modePlugins={modePlugins}
        selectedModeId={selectedModeId}
        onSelectMode={setSelectedModeId}
        inputMode={pluginInputMode}
        onSetInputMode={setPluginInputMode}
        loops={pluginLoops}
        onSetLoops={setPluginLoops}
        targetScore={pluginTargetScore}
        onSetTargetScore={setPluginTargetScore}
        performerName={pluginPerformerName}
        onSetPerformerName={setPluginPerformerName}
        turnLengthSteps={pluginTurnLengthSteps}
        onSetTurnLengthSteps={setPluginTurnLengthSteps}
        status={pluginStatus}
        countdown={pluginCountdown}
        result={pluginResult}
        sourceLabel={pluginSourceItem?.title || activePreset?.name || 'Current pattern'}
        onStart={handleStartPlugin}
        onRetry={handleRetryPlugin}
        shareUrl={pluginShareUrl}
        audioDisclaimer="Audio mode currently uses basic onset detection and loose alignment scoring. Pads and keyboard are the more reliable input path."
      />

      {/* Audio start overlay — browsers require user gesture to init AudioContext */}
      {!audioStarted && (
        <div className="audio-start-overlay fixed inset-0 z-50 flex items-center justify-center bg-bg/80 backdrop-blur-sm">
          <button
            className="audio-start-btn flex flex-col items-center gap-3 px-10 py-8 rounded-2xl bg-card shadow-lg border border-border cursor-pointer transition-all hover:shadow-xl hover:scale-105 active:scale-95"
            onClick={async () => {
              await audioEngine.ensureRunning();
              audioStartedRef.current = true;
              setAudioStarted(true);
            }}
          >
            <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
              <circle cx="24" cy="24" r="23" stroke="var(--color-sky)" strokeWidth="2" />
              <path d="M19 14L36 24L19 34Z" fill="var(--color-sky)" />
            </svg>
            <span className="audio-start-title text-lg font-display font-bold text-text">Tap to Start</span>
            <span className="audio-start-hint text-xs text-muted">Audio requires a user gesture to begin</span>
          </button>
        </div>
      )}
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
