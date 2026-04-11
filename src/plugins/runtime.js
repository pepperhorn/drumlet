import { audioFollowCorePlugin } from './audioFollowCore.js';
import { factoryLibraryPlugin } from './factoryLibraryPlugin.js';
import { lessonLibraryPlugin } from './lessonLibraryPlugin.js';
import { modePlugins } from './modePlugins.js';

const STATIC_PLUGINS = [
  audioFollowCorePlugin,
  factoryLibraryPlugin,
  lessonLibraryPlugin,
  ...modePlugins,
];

export function createPluginRuntime() {
  const plugins = STATIC_PLUGINS;

  return {
    plugins,
    getPlugin(pluginId) {
      return plugins.find((plugin) => plugin.manifest?.id === pluginId) || null;
    },
    getModePlugins() {
      return plugins.filter((plugin) => plugin.manifest?.kind === 'mode');
    },
    getCapability(pluginId) {
      return plugins.find((plugin) => plugin.manifest?.id === pluginId && plugin.manifest.kind === 'capability') || null;
    },
    getLibraryCollections() {
      return plugins
        .filter((plugin) => plugin.manifest?.kind === 'library' && typeof plugin.getCollections === 'function')
        .flatMap((plugin) => plugin.getCollections());
    },
  };
}
