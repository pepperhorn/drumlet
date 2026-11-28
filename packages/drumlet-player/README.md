# @pepperhorn/drumlet-player

A read-only React drum groove player with a pad grid, playback and notation. It
uses the same grid, audio engine and notation renderer as the Drumlet app.

## Install and use

```sh
npm install @pepperhorn/drumlet-player
```

React and React DOM 19 or later are peer dependencies.

```tsx
import { DrumletPlayer } from '@pepperhorn/drumlet-player'
import '@pepperhorn/drumlet-player/style.css'

export function Lesson() {
  return <DrumletPlayer groove="rock-basic-8ths" />
}
```

## Props

| Prop | Type | Default | Behavior |
| --- | --- | --- | --- |
| `groove` | `GrooveInput` | Required | Stock rhythm ID, share string, parsed `.dottl` project, `{ stock: string }` or `{ share: string }`. A share string is a bare code or a URL with a `#s=…` fragment. |
| `chrome` | `'full' \| 'minimal' \| 'none'` (`PlayerChrome`) | `'full'` | Selects the controls and whether playback is enabled. |
| `view` | `'endless' \| 'paged'` | `'endless'` | Endless shows all pages in one horizontal strip. Paged shows one page at a time. Full chrome can switch views. |
| `display` | `'grid' \| 'notation'` | `'grid'` | Initial display with full or minimal chrome. With no chrome, the prop controls the display. |
| `theme` | `'light' \| 'dark'` | `'light'` | Sets `data-theme` on the player root only. |
| `bpm` | `number` | Groove tempo | A finite override is clamped to 20–300 BPM. Full chrome can adjust the tempo locally. |
| `assetBaseUrl` | `string` | Versioned jsDelivr asset base | Base URL for kit assets. The player appends `/kits/`. |
| `className` | `string` | Unset | Extra class on the player root. |
| `onReady` | `() => void` | Unset | The groove has resolved and the player is mounted. Audio is still loaded on demand. |
| `onPlay` | `() => void` | Unset | Playback has started. |
| `onStop` | `() => void` | Unset | Reports an explicit stop, the groove ending, or another player taking over. |
| `onError` | `(error: GrooveError \| Error) => void` | Unset | Groove resolution or playback startup failed. |
| `onStep` | `(globalStep: number) => void` | Unset | Reports the current zero-based step across all pages during playback. |

Pass a React ref typed as `DrumletPlayerHandle` to call `play(): Promise<void>`,
`stop(): void` or `seek(globalStep: number): void`. Call `play()` from a user
gesture so the browser can resume audio. `play()` rejects if startup fails. The
methods do nothing before the groove is ready or with `chrome="none"`.

## Chrome presets

- `full` shows play/stop, tempo, loop, grid/notation and endless/paged controls.
- `minimal` shows a single play/stop keycap. Set `view` and `display` in props.
- `none` shows the groove without transport controls and does not load audio.
  Set `display="notation"` to show notation without playback.

Players share one `AudioContext` per page. Starting a second player stops the
first.

## Themes and host styles

Load `style.css` after the host stylesheet. The unlayered CSS is scoped to
`.drumlet-player`. The reset and controls take precedence over host-wide
element rules like `button { all: unset }` without changing elements outside
the player. Use `className` with unlayered host CSS to set outer layout such as
width, margin or outline. The added class does not replace the internal
palette or control styles. Use `theme` to switch the built-in palette.

Pads size from the player width. The player uses Fredoka, Inter, JetBrains Mono
and Chakra Petch if the host provides them, and system fallbacks otherwise.

## Kits and notation

The package ships the acoustic1 kit in Ogg and AAC. The player loads a
supported format from the matching package version on jsDelivr at
`https://cdn.jsdelivr.net/npm/@pepperhorn/drumlet-player@<version>/dist/kits/`.
To self-host, copy the package's `dist/kits/` directory into your public
asset base. For example, `assetBaseUrl="/drumlet"` looks for the manifest at
`/drumlet/kits/acoustic1/kit.json`. Grooves that use smplr drum machines may
still fetch sounds from smplr's CDN.

The grid does not load Verovio or Petaluma. Notation loads Verovio on demand
and fetches the packaged Petaluma archive through a module-relative URL. Use
a bundler that preserves or rewrites that URL. `assetBaseUrl` does not change
where notation assets load from.

## SSR and Astro

The ESM entry is safe to import in Node. The server renders a loading state.
Groove resolution and playback run on the client.

With Astro's React integration, use `client:only="react"` to skip server
rendering, or `client:visible` to hydrate the loading state when the player
enters the viewport.

```astro
---
import { DrumletPlayer } from '@pepperhorn/drumlet-player'
import '@pepperhorn/drumlet-player/style.css'
---

<DrumletPlayer client:only="react" groove="rock-basic-8ths" />
```

To use callbacks or a ref in Astro, put the player and its handlers in a React
component and hydrate that component.

## License

Drumlet Player and the shared modules marked MIT use the [MIT license](LICENSE).
The standalone Drumlet app remains AGPL-3.0. Verovio is a separate dependency
under LGPL-3.0-or-later. Petaluma is distributed under the SIL Open Font License
in `dist/licenses/Petaluma-OFL.txt`.
