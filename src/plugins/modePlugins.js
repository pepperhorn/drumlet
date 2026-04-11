export const PRACTICE_PLUGIN_ID = 'practice-follow';
export const CHALLENGE_PLUGIN_ID = 'rhythm-challenge';
export const TELEPHONE_PLUGIN_ID = 'telephone';

export const modePlugins = [
  {
    manifest: {
      id: PRACTICE_PLUGIN_ID,
      name: 'Practice Follow',
      version: '0.1.0',
      kind: 'mode',
      capabilities: ['input.pads', 'input.audio', 'results.scoring'],
      commercial: false,
      licenseTier: 'core',
    },
    defaults: {
      inputMode: 'pads',
      loops: 1,
      countInBars: 1,
      scoreLabel: 'Practice score',
    },
    description: 'Run a focused follow-along session against the current rhythm.',
  },
  {
    manifest: {
      id: CHALLENGE_PLUGIN_ID,
      name: 'Rhythm Challenge',
      version: '0.1.0',
      kind: 'mode',
      capabilities: ['input.pads', 'input.audio', 'results.scoring', 'share.metadata'],
      commercial: false,
      licenseTier: 'core',
    },
    defaults: {
      inputMode: 'pads',
      loops: 2,
      countInBars: 1,
      targetScore: 85,
      scoreLabel: 'Challenge accuracy',
    },
    description: 'Play back against the groove with a target score and retry loop.',
  },
  {
    manifest: {
      id: TELEPHONE_PLUGIN_ID,
      name: 'Telephone',
      version: '0.1.0',
      kind: 'mode',
      capabilities: ['input.pads', 'input.audio', 'results.scoring', 'share.metadata'],
      commercial: false,
      licenseTier: 'core',
    },
    defaults: {
      inputMode: 'pads',
      loops: 1,
      countInBars: 1,
      turnLengthSteps: 32,
      performerName: '',
      scoreLabel: 'Turn accuracy',
    },
    description: 'Pass a rhythm chain to the next player with appended steps and shared scores.',
  },
];

export function getModePlugin(modePluginId) {
  return modePlugins.find((plugin) => plugin.manifest.id === modePluginId) || null;
}
