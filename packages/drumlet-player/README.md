# @pepperhorn/drumlet-player

A React drum groove player with pads, playback and notation. It uses the same
grid, audio engine and notation renderer as the Drumlet app.

```sh
npm install @pepperhorn/drumlet-player
```

```tsx
import { DrumletPlayer } from '@pepperhorn/drumlet-player'
import '@pepperhorn/drumlet-player/style.css'

export function Lesson() {
  return <DrumletPlayer groove="rock-basic-8ths" />
}
```

React and React DOM 19 or later are peers. The ESM entry is safe to import in
Node. Mount the interactive player on the client (for example,
`client:only="react"` in Astro). The groove can be a stock ID, a share code, or
a parsed `.dottl` project. Set `chrome` to `minimal` for one Play button or
`none` for a static view. The default theme is light.

## Styles

Load `style.css` after the host stylesheet. It comes precompiled and scoped
under `.drumlet-player`, with no global reset. Keep host element styles in a
cascade layer or scope them outside the player. Unlayered host rules targeting
player elements can still override the player's layered CSS. Apply host layout
styles to a wrapper around the player. Pads size from the player width rather
than the viewport. The player uses Fredoka, Inter, JetBrains Mono and Chakra
Petch when the host provides them, and system fallbacks otherwise.

## Audio and notation

By default the player loads acoustic1 from the matching npm package version on
jsDelivr. To self-host, copy package `dist/kits/` to your public asset base
and pass that base as `assetBaseUrl`. For example, `assetBaseUrl="/drumlet"`
looks for `/drumlet/kits/acoustic1/kit.json`. Groove-specific smplr instruments
may use their own CDN.

The grid does not load Verovio or Petaluma. The notation view loads Verovio as
an external dependency and fetches the packaged Petaluma archive through a
module-relative URL. Use a bundler that preserves or rewrites this asset URL.

## License

Drumlet Player and the shared modules marked MIT use the [MIT license](LICENSE).
The standalone Drumlet app remains AGPL-3.0. Verovio is a separate dependency
under LGPL-3.0-or-later. Petaluma is distributed under the SIL Open Font License
in `dist/licenses/Petaluma-OFL.txt`.
