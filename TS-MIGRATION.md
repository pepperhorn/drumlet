# Drumlet → TypeScript + Zod migration brief

> **Status:** ready to start
> **Owner:** TBD
> **Target:** drumlet/main, single-shot land
> **Canonical context:** internal architecture lives in the `internal_architecture` singleton on apps.pepperhorn.com — operators can read it at `https://apps.pepperhorn.com/admin/content/internal_architecture`. Read §10 (Migration plan) before starting; this brief is the operational drilldown.

---

## Why we're doing this

The Pepperhorn app network is converging on a shared `@pepperhorn/app-sdk` (TypeScript). chordee2 is already TS+Zod. Drumlet is currently JavaScript. Maintaining two flavors of every type long-term doesn't age well — the SDK can only support one source of truth.

**The migration must happen BEFORE the SDK extraction**, otherwise the SDK will need a `.d.ts` generation step or dual JS/TS support, both of which add ongoing maintenance cost.

Zod is the network-boundary contract type. Every value coming in from `apps.pepperhorn.com` flows (auth, future asset/product/license collections) gets validated at the seam. This catches the "API field renamed and nobody noticed for two weeks" class of bug at the moment of ingestion, not three screens later.

---

## What we're NOT doing

These are explicit non-goals — touching them widens the scope and slows the land:

- **Audio engine internals.** `src/audio/*` is timing-critical. Type annotations only at the public boundary; do not refactor the loop, scheduler, or sample loader. TS ceremony is at the type-declaration level — runtime is unchanged.
- **VexFlow integration.** Notation rendering stays as-is. Add `// @ts-expect-error` or shallow types where needed, but don't try to type VexFlow's internals.
- **Component refactors.** No "while we're here" component rewrites. Rename `.jsx` → `.tsx`, add prop types, move on.
- **Dependency upgrades.** No version bumps unless a dep is incompatible with TS.
- **State shape changes.** The reducer, the context, the persistence layer all keep their current shape. Just typed.
- **Test suite changes.** If there are tests, they migrate alongside their source files. Don't add new tests as part of this work.

If something feels like a meaningful improvement that's not in the goal list, **leave a TODO comment and ship it separately** after the migration lands.

---

## Constraints

1. **One branch, one land.** No flag-driven half-state. Half-typed codebases are worse than fully untyped ones because the half-typed surface lies to you. If the migration is too big to land in one PR, split it by directory (e.g. `src/state/` first, then `src/plugins/`, etc.) but each split must be fully typed in its own PR — no `.js` files left behind in the touched directory.
2. **Zero behavior change.** Diff the dist output before/after where practical. If a behavior changes, it's a bug in the migration, not an improvement.
3. **`strict: true` in tsconfig from day one.** No "we'll tighten it later" — that day never comes.
4. **No `any`.** Use `unknown` at boundaries, narrow with type guards or Zod parses. The only allowed escape hatch is `// @ts-expect-error <reason>` for genuinely-untyped third-party libs (VexFlow, smplr).

---

## Setup (Phase 0)

1. Branch off `drumlet/main` as `ts-migration`.
2. `npm install --save-dev typescript zod @types/node`
3. Create `tsconfig.json` with strict settings. Suggested baseline:
   ```json
   {
     "compilerOptions": {
       "target": "ES2022",
       "lib": ["ES2022", "DOM", "DOM.Iterable"],
       "module": "ESNext",
       "moduleResolution": "bundler",
       "jsx": "react-jsx",
       "strict": true,
       "noUncheckedIndexedAccess": true,
       "noFallthroughCasesInSwitch": true,
       "isolatedModules": true,
       "esModuleInterop": true,
       "skipLibCheck": true,
       "allowJs": true,
       "resolveJsonModule": true,
       "noEmit": true,
       "paths": { "@/*": ["./src/*"] }
     },
     "include": ["src"]
   }
   ```
4. Add `"typecheck": "tsc --noEmit"` to `package.json` scripts.
5. Update `eslint.config.js` to include the TypeScript ESLint plugin (`@typescript-eslint/parser`, `@typescript-eslint/eslint-plugin`).
6. Verify Vite picks up `.ts` / `.tsx` files automatically (it does — no config change needed).
7. **Run `npm run typecheck` and `npm run build`** to confirm the baseline still passes with `allowJs: true` and zero TS files. This is your green starting state.

Commit: `chore: ts-migration scaffolding`. Nothing functional has changed yet.

---

## Phase 1 — `src/state/` (the meat)

This is where the auth and library logic lives. It's also where the SDK extraction will pull from later, so getting types right here unblocks the most downstream work.

Files to migrate (in order — earlier files have fewer dependents):

| File | Notes |
|---|---|
| `useAuth.js` → `useAuth.ts` | **The most important file in the migration.** This is the cross-app auth contract. Define a Zod schema for each of the three flow responses (send-otp, verify-otp, verify-session) and parse responses through Zod at the seam. Schemas should match the field shapes documented in the `internal_architecture` singleton §1. |
| `userLibrary.js` → `userLibrary.ts` | User-saved patterns. The current shape becomes the basis for `app_user_assets.payload` later. Type the `Pattern` shape carefully — it's about to become a network contract. |
| `presets.js` → `presets.ts` | Factory presets. Light typing, no Zod needed (these are static imports). |
| `normalizeSequencerState.js` → `normalizeSequencerState.ts` | Type the sequencer state shape. This is the canonical "what is a drum pattern" definition — make it a `z.infer` from a Zod schema so it's reusable at the network boundary later. |
| `sequencerReducer.js` → `sequencerReducer.ts` | Action types as a discriminated union. Use `z.infer` for state shape. |
| `SequencerContext.jsx` → `SequencerContext.tsx` | Glue. Should mostly just inherit types from the reducer. |
| `useLibraryActions.js` → `useLibraryActions.ts` | Library-load action dispatcher. Type via the plugin runtime types from Phase 2. |
| `usePluginSession.js` → `usePluginSession.ts` | Capability session glue. Type via plugin runtime types from Phase 2. |
| `projectSerializer.js` → `projectSerializer.ts` | Round-trip serialization. Define a Zod schema for the serialized format and parse on load. This catches corrupt/old saves at the boundary. |
| `shareCodec.js` → `shareCodec.ts` | URL share codec. Type the wire format with Zod. |
| `midiExport.js` → `midiExport.ts` | Export glue. Lightweight types. |

**For each file**: rename, add types, run `npm run typecheck`, fix errors, commit. Don't move on until the file typechecks cleanly.

**Auth contract is the highest-value target.** Spend the most time here. Sketch:

```ts
// useAuth.ts — sketch

import { z } from "zod"

export const AppUserSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  user_handle: z.string(),
  first_name: z.string().nullable(),
  last_name: z.string().nullable(),
  // ... mirror app_users shape from internal_architecture singleton §1
})
export type AppUser = z.infer<typeof AppUserSchema>

const VerifyOtpResponseSchema = z.object({
  success: z.boolean(),
  token: z.string().uuid(),
  user: AppUserSchema,
  is_new_user: z.boolean(),
})

const VerifySessionResponseSchema = z.object({
  valid: z.boolean(),
  user: AppUserSchema.nullable(),
})

// ... then in verifyOtp / verifySession, parse the fetch response through these
// schemas. Throw on parse failure with a clear error.
```

**Important**: the `AppUserSchema` shape MUST match what `apps.pepperhorn.com/items/app_users` returns. The canonical field list lives in the `internal_architecture` singleton §1 — read it before defining the schema. If they drift, the verify-session flow will start throwing parse errors and that's how you'll find out.

---

## Phase 2 — `src/plugins/` (the runtime + library schema)

This is the eventual SDK code. Get these types right and the SDK extraction is mostly a copy-paste job.

| File | Notes |
|---|---|
| `librarySchema.js` → `librarySchema.ts` | Define `FieldType` as a string literal union. Define `LibraryItem`, `LibraryCollection`, `PatchRef` as Zod schemas. Export both the schemas and the inferred types. This file becomes the public surface of the eventual SDK. |
| `runtime.js` → `runtime.ts` | Type `PluginManifest` as a discriminated union on `kind` ("library" \| "mode" \| "capability"). Type `createPluginRuntime()` return shape. Add the `commercial` and `licenseTier` fields to the manifest type even though current plugins all set them to `false` / `'core'`. |
| `factoryLibraryPlugin.js` → `factoryLibraryPlugin.ts` | Should mostly just inherit types from runtime + librarySchema. |
| `lessonLibraryPlugin.js` → `lessonLibraryPlugin.ts` | Same. |
| `modePlugins.js` → `modePlugins.ts` | Type each mode's `defaults` shape. |
| `audioFollowCore.js` → `audioFollowCore.ts` | The audio capture / scoring capability plugin. Type the `SessionHandle` interface carefully — this is the contract that mode plugins consume. **Do not refactor the audio loop**; type-annotate at the boundary only. |
| `timeline.js` → `timeline.ts` | Shared scoring math. Pure functions, easy to type. |

**`PluginManifest` shape** (for reference — should match what eventually goes in the public `PLUGIN.md`):

```ts
type PluginKind = "library" | "mode" | "capability"
type LicenseTier = "core" | "pro"

interface PluginManifestBase {
  id: string
  name: string
  version: string  // semver
  kind: PluginKind
  capabilities: string[]  // free-form strings the host queries
  commercial: boolean
  licenseTier: LicenseTier
}

interface LibraryPlugin extends PluginManifestBase {
  kind: "library"
  getCollections(): LibraryCollection[]
}

interface ModePlugin extends PluginManifestBase {
  kind: "mode"
  defaults: Record<string, unknown>
  description: string
}

interface CapabilityPlugin extends PluginManifestBase {
  kind: "capability"
  createSession(opts: SessionOptions): SessionHandle
}

type Plugin = LibraryPlugin | ModePlugin | CapabilityPlugin
```

The discriminated union on `kind` means TypeScript narrows correctly when consumers do `if (plugin.kind === "library") plugin.getCollections()`.

---

## Phase 3 — `src/components/` and the rest

Bulk JSX → TSX rename. Each component file gets:

1. `.jsx` → `.tsx`
2. Props interface defined inline at the top of the file
3. `React.FC<Props>` is **not** preferred — declare the function with explicit return type or just let inference handle it
4. `useState<T>()` annotations where TS can't infer
5. Event handler types (`React.MouseEvent<HTMLButtonElement>`, etc.)

Order: leaf components first (no children), then their parents, working up to `App.tsx`. This minimizes the "child has wrong props" cascade.

Don't try to type-annotate inside refs to VexFlow / smplr — those are escape-hatch territory. Add `// @ts-expect-error <reason>` and move on.

---

## Phase 4 — `src/util/`, `src/data/`, `src/audio/` (the rest)

| Directory | Strategy |
|---|---|
| `src/util/` | Pure functions, easy to type. Migrate file by file. |
| `src/data/` | Static data files. Add types via `as const` assertions or explicit type annotations on the export. |
| `src/audio/` | **Boundary types only.** Type the public exports — the functions other code calls. Do NOT type-annotate the inner timing loops, sample scheduler, or buffer math. Treat the audio module as a black box with a typed surface. |
| `src/notation/` | Same approach as `src/audio/`. VexFlow is the boundary — type around it, not into it. |

---

## Phase 5 — `main.jsx` → `main.tsx`, `App.jsx` → `App.tsx`

The entry points. By this point everything else is typed and these files just become the integration glue. Should be the smallest commit in the migration.

---

## Acceptance criteria

The migration is done when ALL of these are true:

- [ ] Every file in `src/` ends in `.ts` or `.tsx`. Zero `.js` / `.jsx` files remain.
- [ ] `tsconfig.json` has `"strict": true`, `"noUncheckedIndexedAccess": true`, `"allowJs": false` (you can flip allowJs to false at the end).
- [ ] `npm run typecheck` exits 0 with zero errors.
- [ ] `npm run build` produces a working dist.
- [ ] `npm run lint` passes (with the TS ESLint plugin enabled).
- [ ] `npm run dev` boots and the app works end-to-end: load a pattern, edit it, save it, sign in, sign out.
- [ ] Auth flow responses are validated through Zod schemas. Tampering with a response (e.g. via DevTools network mocking) produces a parse error, not a silent state corruption.
- [ ] No `any` in the codebase except `// @ts-expect-error` escape hatches with a reason comment.
- [ ] The `PluginManifest` type is a discriminated union on `kind`.
- [ ] The audio engine still passes whatever timing tests it has (or, if no tests exist, manual verification: a 4/4 pattern at 120 BPM still sounds the same, click-by-click, before and after).

---

## Verification protocol

Before opening the PR for the final merge to main:

1. **Smoke test the auth flow end-to-end.** Sign out, sign in with an OTP code, verify the user is hydrated. Refresh the page, verify the session re-validates. Sign out, verify localStorage is cleared.
2. **Smoke test the library actions.** Load a factory pattern. Edit it. Save it to user library. Reload. Verify it persists.
3. **Smoke test audio.** Play a pattern. Verify timing sounds identical to pre-migration (record before, compare after if possible).
4. **Diff the dist bundle.** `npm run build` before and after; the bundle size should be roughly the same (TS adds zero runtime). If it's significantly different, find out why.
5. **Read the diff.** Skim every changed file. Look for accidental behavior changes — a `??` where you used to have `||`, a missing `?.`, an array bound check that was implicit and is now explicit.

---

## What lands in the PR description

```
feat: TypeScript + Zod migration

Migrates drumlet from JavaScript to TypeScript with Zod validation at
network boundaries. Prerequisite for @pepperhorn/app-sdk extraction.

Why: see internal_architecture singleton §10 on apps.pepperhorn.com.

Scope (no behavior change):
- All .js/.jsx → .ts/.tsx
- strict: true tsconfig
- Zod schemas for apps.pepperhorn.com flow responses (useAuth)
- Zod schemas for plugin manifest, library item envelope
- PluginManifest discriminated union on `kind`

Out of scope (deliberately):
- Audio engine internals (typed at boundary only)
- VexFlow integration (escape hatches)
- Component refactors
- Dependency upgrades

Verification:
- npm run typecheck: 0 errors
- npm run build: produces working dist
- Auth flow smoke-tested end-to-end
- Audio timing verified unchanged
```

---

## When you're done

1. Merge to `drumlet/main`.
2. Update the `internal_architecture` singleton on apps.pepperhorn.com — bump the changelog at the bottom of §10 to note that drumlet TS migration is complete.
3. Notify whoever's working on chordee2 — Phase 1 (auth port) can now copy from drumlet's TypeScript `useAuth.ts` directly instead of porting from JS.
4. The next milestone is `@pepperhorn/app-sdk` extraction — see internal_architecture §10 for sequencing.

---

## Reference

- **Canonical architecture:** `internal_architecture` singleton on apps.pepperhorn.com (operator-only)
- **Public plugin authoring contract** (to be written): `drumlet/PLUGIN.md`
- **Drumlet's existing architecture doc:** `drumlet/ARCHITECTURE.md` — read §1 (plugin runtime) and §2 (OTP user accounts) for the current shape, before you start typing them.
- **Auth flow IDs:** see `drumlet/ARCHITECTURE.md` §2 or `internal_architecture` singleton §1.

---

## Open questions before starting

If you hit any of these, stop and get an answer rather than guessing:

1. **Should `@types/react` and React 19 types work cleanly with the existing JSX, or do we need a React types upgrade?** Run `npm run typecheck` after Phase 0 setup with one trivial `.tsx` file to find out before committing to Phase 1.
2. **Are there any third-party libs in `package.json` without bundled types?** `smplr`, `vexflow`, and `midi-writer-js` are the suspects. Check `node_modules/<lib>/package.json` for a `types` field. If missing, we use module declaration files (`declarations.d.ts`) with shallow `declare module 'libname'` stubs.
3. **Is there a test suite to keep green?** `package.json` doesn't show one. Confirm before starting — no tests means manual smoke-testing is the only verification.
4. **Does the audio engine have any timing benchmarks?** If yes, run them before and after. If no, manual ear-test.

If you run into anything else that surprises you, **stop and ask** rather than working around it. Surprises during a type migration are usually a sign of a deeper assumption that the migration just made visible.
