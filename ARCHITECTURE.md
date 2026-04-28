# drumlet architecture

This document describes the three pieces of drumlet that are intended to become a shared backbone across `apps.pepperhorn.com` apps:

1. **Plugin runtime** — how features, libraries, and modes are registered and discovered
2. **OTP user accounts** — passwordless email auth backed by `apps.pepperhorn.com`
3. **Gated plugins** — the planned model for shipping proprietary content alongside an open-source core

The shared-backbone question (one repo? one package? per-app copies?) is addressed at the end.

---

## 1. Plugin runtime

### Goals

- Decouple features (libraries, modes, capabilities) from the host app shell
- Let one feature register patterns/lessons/items that another feature consumes (the "library" surface)
- Make it possible to ship proprietary plugins without forking the host
- Keep everything statically importable today and dynamically loadable later

### Key files

| File | Role |
|---|---|
| `src/plugins/runtime.js` | Creates the plugin runtime; today it returns a closure over a static plugin list |
| `src/plugins/librarySchema.js` | Field types, item/collection helpers, patch refs, `applyPatchToState` |
| `src/plugins/audioFollowCore.js` | Capability plugin: count-in, audio capture, performance scoring |
| `src/plugins/factoryLibraryPlugin.js` | Library plugin: hydrates `presets.json` into library items |
| `src/plugins/lessonLibraryPlugin.js` | Library plugin: hand-authored lesson items |
| `src/plugins/modePlugins.js` | Mode plugins: practice-follow, rhythm-challenge, telephone |
| `src/plugins/timeline.js` | Shared scoring + timeline math used by capability plugins |

### Plugin shape

Every plugin exports a `manifest`:

```js
{
  id: 'factory-library',
  name: 'Factory Library',
  version: '0.1.0',
  kind: 'library',                       // 'library' | 'mode' | 'capability'
  capabilities: ['library.source'],      // free-form strings the host queries
  commercial: false,                     // metadata flag for gating
  licenseTier: 'core',                   // 'core' | 'pro' | etc.
}
```

Optional methods on the plugin object depend on `kind`:

- `kind: 'library'` → `getCollections() → Collection[]`
- `kind: 'mode'` → `defaults`, `description`
- `kind: 'capability'` → `createSession({...}) → SessionHandle`

### Runtime API

`createPluginRuntime()` returns:

```js
{
  plugins,                      // raw list
  getPlugin(id),                // by manifest.id
  getModePlugins(),             // all kind:'mode'
  getCapability(id),            // single kind:'capability' by id
  getLibraryCollections(),      // flattened collections from all kind:'library'
}
```

The host doesn't know about plugins by name — it asks the runtime for the kinds and capabilities it needs.

### Library schema (used by `kind: 'library'`)

A library plugin returns one or more **collections**. Each collection contains **items**. Each item is a normalized envelope:

```js
{
  id,                  // namespaced: pluginId/collectionId/itemId
  pluginId,
  collectionId,
  kind,                // 'pattern' | 'lesson' | ...
  title,
  fields: [            // arbitrary typed fields the plugin chose
    { id, type, value },
    ...
  ],
  card: {              // normalized data for the host's card view
    title, subtitle, cover, meta, badges, previewSteps,
  },
  actions: [           // what the host UI should offer
    { id, label, kind: 'load_state' | 'open_mode' | 'open_lesson' | 'share', targetPluginId? },
  ],
}
```

The host renders cards uniformly without knowing plugin internals; the plugin reads its own field values via `getFieldValue(item, fieldId)`.

#### Field types

Defined in `librarySchema.js → FIELD_TYPES`. The interesting ones for the gated-plugin story:

- `PATTERN_STATE` — full sequencer state blob (loaded by `LOAD_STATE`)
- `PATCH_REF` — `{ sourceType, instrument?, kitId? }`. Applied to a loaded state via `applyPatchToState` so a pattern can ship with a default kit but the kit can be swapped without rewriting `pattern_state`.
- `LICENSE_GATE` — reserved for the gated-plugin model (see §3)
- `LESSON_BLOCKS`, `CHALLENGE_CONFIG`, `SCORING_POLICY`, `TELEPHONE_CHAIN` — mode-specific payloads carried inside library items

Adding a new field type is intentionally lightweight: pick a string constant, document the value shape, and any plugin can start using it.

### Where the runtime is consumed

- `useLibraryActions.js` reads `pattern_state` + `default_patch` from items and dispatches `LOAD_STATE`
- `usePluginSession.js` (not in this doc, but adjacent) creates `kind: 'capability'` sessions for play-along modes
- The Library and Plugins tabs in `App.jsx` enumerate collections via `runtime.getLibraryCollections()`

---

## 2. OTP user accounts

### Goals

- Passwordless email login for users who want to save/share patterns
- Cross-app session: one identity across every `apps.pepperhorn.com` app
- No password storage in the host app

### Backend contract (provided by `apps.pepperhorn.com`)

Three webhook flows are exposed at `https://apps.pepperhorn.com/flows/trigger/<flowId>`:

| Purpose | Flow ID | Request | Response |
|---|---|---|---|
| Send OTP code | `40f96a57-1ab0-4031-a7f5-9a32ec877d15` | `{ email, app_slug }` | `200` on success |
| Verify OTP code | `65da02e3-4742-4c5a-8bc5-3bb114fb6557` | `{ email, otp_code, app_slug }` | `{ success, token, user, is_new_user }` |
| Verify session | `11dd60ca-fc66-4396-9461-858b7bbf2df8` | `{ token, app_slug }` | `{ valid, user }` |

`app_slug` is the per-app identifier (`drumlet` for this app). The backend uses it to scope the user record / app permissions.

### Client-side flow

`src/state/useAuth.js` is the entire client. Shape:

```
useAuth() → {
  user,             // hydrated profile or null
  isLoggedIn,
  isLoading,        // true while session is being verified on mount
  isNewUser,        // set after a verified OTP if the backend says new
  requestOtp(email),
  verifyOtp(email, otp),
  updateProfile(updates),
  logout(),
}
```

Lifecycle:

1. **Mount** — read `localStorage["drumlet-session-token"]`. If present, POST it to `FLOW_VERIFY_SESSION`. If valid, hydrate `user`. If not, clear the token.
2. **Sign in** — `requestOtp(email)` sends a code, then `verifyOtp(email, code)` exchanges it for `{ token, user }`. Token is persisted to localStorage.
3. **Profile updates** — `updateProfile(patch)` PATCHes `https://apps.pepperhorn.com/items/app_users/:id` with the bearer token. The backend treats the token as a Directus access token.
4. **Logout** — clear localStorage, clear React state.

### What the host must provide

- An `<AuthModal>` to collect email + OTP (`src/components/AuthModal.jsx`)
- A `<UserMenu>` for signed-in state (`src/components/UserMenu.jsx`)
- Whatever app-specific data lives on the user record (`app_users.<field>` columns)

### Threat model notes

- Tokens are stored in localStorage. XSS would compromise them. The app has no `dangerouslySetInnerHTML` and renders no untrusted HTML, but any future plugin that does must handle the boundary carefully.
- The flow webhook URLs are public (visible in client source). Rate limiting and abuse handling live on the backend, not the client.
- Tokens have no client-side refresh; expiry is detected on next mount via `FLOW_VERIFY_SESSION`.

---

## 3. Gated plugins (planned)

### Premise

The host (`drumlet`) is **AGPL-3.0** open source. Some plugins (premium kits, advanced lessons, paid challenge packs) should remain proprietary, sold or gated by user account, and **not** subject to AGPL obligations.

This works under AGPL because plugins talking to the host through a stable plugin API are a separate work (the same logic that lets proprietary apps run on a GPL'd Linux kernel via syscall boundaries).

### Architecture sketch

```
                  ┌────────────────────────────────────┐
                  │           apps.pepperhorn.com       │
                  │                                    │
                  │  OTP flows ◄── auth ──┐            │
                  │  Plugin registry      │            │
                  │  Plugin assets (JSON, │            │
                  │     audio, images)    │            │
                  │  License grants       │            │
                  └─────────┬─────────────┴───┬────────┘
                            │ HTTPS           │
                            ▼                 ▼
                      ┌──────────┐      ┌──────────┐
                      │ drumlet  │      │  app B   │
                      │  (AGPL)  │      │   ...    │
                      └──────────┘      └──────────┘
                            ▲
                            │ dynamic import()
                            │
                ┌───────────┴────────────┐
                │  Pro plugin bundle     │
                │  (private repo, built  │
                │   to JS, hosted via    │
                │   apps.pepperhorn.com) │
                └────────────────────────┘
```

### Pieces

1. **Plugin manifests in the backend** — the user-facing "Plugins" tab queries `apps.pepperhorn.com/items/plugins` for available plugins. Each row carries `{ id, name, version, license_tier, asset_url, content_url, signed_url_ttl }`.
2. **License gating** — when the user is signed in, the backend filters the manifest list by their entitlements (free tier sees core only; pro sees everything they're licensed for). Item-level `LICENSE_GATE` fields remain reserved for finer-grained gating inside a plugin.
3. **Dynamic plugin loading** — `runtime.js` evolves from a static array to:
   ```js
   import(pluginManifest.asset_url).then((mod) => runtime.register(mod.default));
   ```
   The host calls `runtime.register(plugin)` once the bundle resolves; the rest of the host code already only sees the runtime API.
4. **Content vs code** — most pro plugins will be **content-shaped**: a manifest stays in code (small), and the heavy data (audio samples, lesson markdown, JSON pattern banks) is fetched from `apps.pepperhorn.com/items/...` on demand. This keeps bundle size and licensing surface small.
5. **Asset signing** — when content is paid, `apps.pepperhorn.com` issues short-lived signed URLs for samples/audio. The client never sees a permanent file URL.

### What's already in place

- `manifest.commercial` and `manifest.licenseTier` fields on every plugin (today they're all `false` / `'core'`)
- `FIELD_TYPES.LICENSE_GATE` reserved in the schema
- `runtime.js` is the only thing the host imports from — easy to swap from static list to dynamic loader

### What's not yet built

- The backend `plugins` collection and entitlement model
- A dynamic loader path in `runtime.js`
- A signed-URL helper for asset fetches
- The Plugins tab UI for browsing/installing pro plugins

---

## Shared backbone across pepperhorn apps

The user-account flow, the plugin runtime, and the library schema are all candidates for sharing across apps on `apps.pepperhorn.com`. The question is how.

### Options

| Approach | Pros | Cons |
|---|---|---|
| **Copy/paste per repo** | Zero infrastructure | Drift, double-fixes, divergent bugs |
| **Git submodules** | Single source of truth, no publish step | Clunky workflow, easy to leave stale |
| **Monorepo** (turborepo / nx) | Tight coupling, atomic refactors | Forces all apps into one repo, heavier tooling |
| **Standalone npm package** | Works with separate repos, normal `npm install`, can be public or private | Requires a publish step + versioning discipline |

### Recommendation

Extract a small **`@pepperhorn/app-sdk`** npm package containing:

- `useAuth` hook (today's `src/state/useAuth.js`, generalized so `app_slug` is a constructor option)
- `<AuthModal>` and `<UserMenu>` components (or headless equivalents — see below)
- `createPluginRuntime` and the `librarySchema.js` field types/helpers
- A thin HTTP client wrapper that knows how to talk to `apps.pepperhorn.com` (flows, items, signed URLs)
- Type definitions for the plugin manifest, library item envelope, and patch ref

License the SDK as **MIT** so non-AGPL apps can adopt it freely. The SDK is generic plumbing — there's no creative content in it that needs copyleft protection. Drumlet (AGPL) consumes it just fine; AGPL is compatible with MIT inputs.

For the auth UI, ship two layers:

1. **Headless** — just the `useAuth` hook and types. Apps style their own modal.
2. **Default UI** — opinionated `<AuthModal>` / `<UserMenu>` that any app can drop in for free.

### Repo layout

```
pepperhorn/
  app-sdk/                 # public, MIT
    src/
      auth/                # useAuth, types
      plugins/             # runtime, library schema
      backend/             # http client for apps.pepperhorn.com
      ui/                  # default modal/menu (opt-in)
    package.json
    README.md

  drumlet/                 # public, AGPL — depends on @pepperhorn/app-sdk
  app-b/                   # depends on @pepperhorn/app-sdk
  ...

  pro-plugins/             # private — proprietary plugin bundles
    drumlet-premium-kits/
    drumlet-pro-lessons/
    ...
```

### Migration plan (rough)

1. **Carve out the SDK in-place inside drumlet first.** Keep `src/state/useAuth.js`, `src/plugins/runtime.js`, `src/plugins/librarySchema.js` as the source of truth. Don't extract yet — confirm the API by adding a second app that imports from the *files*, not a package.
2. **Stand up `@pepperhorn/app-sdk` repo** once the second app is real. Move the files, update drumlet's imports to the package, publish v0.1.0.
3. **Generalize `app_slug` and backend URL** so the SDK isn't hardcoded to `apps.pepperhorn.com`. Each consuming app passes them via a provider component.
4. **Lock the surface** at v1.0 once two or three apps are using it. After that, plugin manifest fields and library item shape become semver-stable.

### Why not just monorepo?

If everything were going to live under one team and one CI pipeline, a monorepo with `packages/sdk` + `apps/drumlet` + `apps/...` would be cleaner. The reason to prefer the package approach: drumlet is now public AGPL, and we want pro plugins (private) and other apps (possibly closed) to depend on the same SDK without dragging the AGPL boundary across them. A separate MIT-licensed SDK package gives a clean license seam.

---

## Open questions

- Should the SDK include the audio engine (`src/audio/*`)? Probably not — that's drumlet-specific. Other pepperhorn apps will have their own domain code.
- Where do pro plugin bundles get hosted? Options: bundled in the backend Directus assets, or built/published to a separate CDN. Lean toward backend assets so signed URLs and entitlements live in one place.
- Versioning: how do we handle a plugin built against SDK v0.3 when the host app is on SDK v0.5? Recommend embedding the SDK version range in the plugin manifest and refusing to load incompatible plugins.
