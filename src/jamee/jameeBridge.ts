import { createDirectus, rest, staticToken, createItem, readItems } from '@directus/sdk'

const URL = (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_DIRECTUS_URL) ?? 'https://apps.pepperhorn.com'

function token(): string {
  try { return localStorage.getItem('drumlet-session-token') ?? '' } catch { return '' }
}

function client() {
  return createDirectus<any>(URL).with(staticToken(token())).with(rest())
}

export interface SavedPresetRef { id: string; external_id: string; name: string }

/** Save the current drumlet preset to the shared library. */
export async function savePresetToLibrary(presetDoc: any, name: string): Promise<SavedPresetRef> {
  const externalId = crypto.randomUUID()
  const created: any = await client().request(createItem('app_user_saves', {
    app_slug: 'drumlet',
    kind: 'preset',
    external_id: externalId,
    name,
    payload: presetDoc,
    status: 'published',
  } as any))
  return { id: created.id, external_id: externalId, name: created.name ?? name }
}

/** List drumlet presets the current user has saved to the shared library. */
export async function listMyLibraryPresets(): Promise<Array<{ external_id: string; name: string }>> {
  const rows: any[] = await client().request(readItems('app_user_saves', {
    filter: { app_slug: { _eq: 'drumlet' }, kind: { _eq: 'preset' } } as any,
    fields: ['external_id', 'name'],
    sort: ['-date_updated' as any],
    limit: 100,
  }))
  return rows.map(r => ({ external_id: r.external_id, name: r.name }))
}
