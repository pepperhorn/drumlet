import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { normalizeSequencerState } from './normalizeSequencerState.js';
import { buildShareUrl } from './shareCodec.js';
import { getModePlugin, PRACTICE_PLUGIN_ID } from '../plugins/modePlugins.js';
import { DEFAULT_SCORE_POLICY } from '../plugins/timeline.js';

export function usePluginSession({
  audioEngine,
  audioFollowCore,
  state,
  currentPage,
  isPlaying,
  stop,
  handlePlay,
  activePreset,
  setPlayMode,
}) {
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

  const pluginSessionRef = useRef(null);
  const pluginCaptureRef = useRef(null);
  const pluginTimerRefs = useRef([]);
  const pluginReferenceTimeRef = useRef(0);

  const selectedModePlugin = useMemo(
    () => getModePlugin(selectedModeId) || null,
    [selectedModeId]
  );

  // Reset defaults when mode changes during setup
  useEffect(() => {
    if (!pluginOpen || pluginStatus !== 'setup' || !selectedModePlugin) return;
    setPluginInputMode(selectedModePlugin.defaults?.inputMode || 'pads');
    setPluginLoops(selectedModePlugin.defaults?.loops || 1);
    setPluginTargetScore(selectedModePlugin.defaults?.targetScore || 85);
    setPluginPerformerName(selectedModePlugin.defaults?.performerName || '');
    setPluginTurnLengthSteps(selectedModePlugin.defaults?.turnLengthSteps || 32);
  }, [pluginOpen, pluginStatus, selectedModePlugin]);

  const clearPluginTimers = useCallback(() => {
    pluginTimerRefs.current.forEach((timerId) => window.clearTimeout(timerId));
    pluginTimerRefs.current = [];
  }, []);

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
    if (isPlaying) stop();
  }, [clearPluginTimers, isPlaying, stop]);

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
    setPlayMode,
    state,
    stop,
  ]);

  const handleRetryPlugin = useCallback(() => {
    setPluginStatus('setup');
    setPluginResult(null);
    setPluginShareUrl('');
    handleStartPlugin();
  }, [handleStartPlugin]);

  // Record a pad event during a running plugin session
  const recordPadEvent = useCallback((trackId) => {
    if (pluginStatus !== 'running' || pluginInputMode !== 'pads' || !pluginSessionRef.current) return;
    const ctx = audioEngine.getContext();
    pluginSessionRef.current.recordEvent({
      source: 'pad',
      trackId,
      timeSec: Math.max(0, ctx.currentTime - pluginReferenceTimeRef.current),
      confidence: 1,
    });
  }, [audioEngine, pluginInputMode, pluginStatus]);

  // Initialize plugin state from a shared URL payload
  const initFromSharedPayload = useCallback((pluginMeta) => {
    const sharedMode = getModePlugin(pluginMeta.modeId);
    if (!sharedMode) return;
    setSelectedModeId(sharedMode.manifest.id);
    setPluginInputMode(pluginMeta.inputMode || sharedMode.defaults?.inputMode || 'pads');
    setPluginLoops(pluginMeta.loops || sharedMode.defaults?.loops || 1);
    setPluginTargetScore(pluginMeta.targetScore || sharedMode.defaults?.targetScore || 85);
    setPluginPerformerName(pluginMeta.performerName || '');
    setPluginTurnLengthSteps(pluginMeta.turnLengthSteps || sharedMode.defaults?.turnLengthSteps || 32);
    setPluginResult(pluginMeta.result || null);
    setPluginStatus(pluginMeta.result ? 'results' : 'setup');
    setPluginSourceItem(null);
    setPluginOpen(true);
  }, []);

  // Cleanup on unmount
  useEffect(() => () => {
    clearPluginTimers();
    pluginCaptureRef.current?.stop?.();
  }, [clearPluginTimers]);

  return {
    // State
    pluginOpen,
    selectedModeId,
    pluginSourceItem,
    pluginStatus,
    pluginCountdown,
    pluginResult,
    pluginShareUrl,
    pluginInputMode,
    pluginLoops,
    pluginTargetScore,
    pluginPerformerName,
    pluginTurnLengthSteps,
    selectedModePlugin,

    // Setters (for PluginModal props)
    setSelectedModeId,
    setPluginInputMode,
    setPluginLoops,
    setPluginTargetScore,
    setPluginPerformerName,
    setPluginTurnLengthSteps,

    // Actions
    openPluginModal,
    closePluginModal,
    handleStartPlugin,
    handleRetryPlugin,
    recordPadEvent,
    initFromSharedPayload,
  };
}
