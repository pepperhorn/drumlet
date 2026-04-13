import { audioFollowCorePlugin } from './audioFollowCore.js';
import { factoryLibraryPlugin } from './factoryLibraryPlugin.js';
import { lessonLibraryPlugin } from './lessonLibraryPlugin.js';
import { modePlugins } from './modePlugins.js';
import type { LibraryCollection } from './librarySchema.js';

/**
 * Discriminated union of plugin manifests by `kind`.
 * The eventual @pepperhorn/app-sdk surface lives here.
 */

export type PluginKind = 'library' | 'mode' | 'capability';
export type LicenseTier = 'core' | 'pro';

export interface PluginManifestBase {
  id: string;
  name: string;
  version: string;
  kind: PluginKind;
  capabilities: string[];
  commercial: boolean;
  licenseTier: LicenseTier;
}

export interface LibraryPluginManifest extends PluginManifestBase {
  kind: 'library';
}

export interface ModePluginManifest extends PluginManifestBase {
  kind: 'mode';
}

export interface CapabilityPluginManifest extends PluginManifestBase {
  kind: 'capability';
}

export type PluginManifest = LibraryPluginManifest | ModePluginManifest | CapabilityPluginManifest;

export interface LibraryPlugin {
  manifest: LibraryPluginManifest;
  getCollections(): LibraryCollection[];
}

export interface ModePlugin {
  manifest: ModePluginManifest;
  defaults?: {
    inputMode?: string;
    loops?: number;
    countInBars?: number;
    targetScore?: number;
    performerName?: string;
    turnLengthSteps?: number;
    scoreLabel?: string;
  };
  description: string;
}

export interface CapabilityPlugin {
  manifest: CapabilityPluginManifest;
  // The session shape is defined by the specific capability — kept loose at
  // the runtime level. The audio-follow-core capability is typed at its boundary.
  createSession(opts: unknown): unknown;
}

export type Plugin = LibraryPlugin | ModePlugin | CapabilityPlugin;

const STATIC_PLUGINS: Plugin[] = [
  audioFollowCorePlugin as unknown as CapabilityPlugin,
  factoryLibraryPlugin as unknown as LibraryPlugin,
  lessonLibraryPlugin as unknown as LibraryPlugin,
  ...(modePlugins as unknown as ModePlugin[]),
];

export interface PluginRuntime {
  plugins: Plugin[];
  getPlugin(pluginId: string): Plugin | null;
  getModePlugins(): ModePlugin[];
  getCapability(pluginId: string): CapabilityPlugin | null;
  getLibraryCollections(): LibraryCollection[];
}

export function createPluginRuntime(): PluginRuntime {
  const plugins = STATIC_PLUGINS;

  return {
    plugins,
    getPlugin(pluginId: string): Plugin | null {
      return plugins.find((plugin) => plugin.manifest?.id === pluginId) ?? null;
    },
    getModePlugins(): ModePlugin[] {
      return plugins.filter((plugin): plugin is ModePlugin => plugin.manifest?.kind === 'mode');
    },
    getCapability(pluginId: string): CapabilityPlugin | null {
      return plugins.find((plugin): plugin is CapabilityPlugin =>
        plugin.manifest?.id === pluginId && plugin.manifest.kind === 'capability'
      ) ?? null;
    },
    getLibraryCollections(): LibraryCollection[] {
      return plugins
        .filter((plugin): plugin is LibraryPlugin =>
          plugin.manifest?.kind === 'library' && typeof (plugin as LibraryPlugin).getCollections === 'function'
        )
        .flatMap((plugin) => plugin.getCollections());
    },
  };
}
