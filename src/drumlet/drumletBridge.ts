// Talks to the shared ph-apps (Directus) library through its webhook flows,
// NOT the items API directly. The flows ("Saves — Upsert/List/Delete")
// validate the session token against app_sessions and stamp app_user
// server-side, so saves are correctly scoped to the signed-in user. Hitting
// the items collection directly (the old @directus/sdk path) skipped all of
// that and never triggered the flows.

const BASE =
  (typeof import.meta !== 'undefined' && (import.meta as any).env?.VITE_DIRECTUS_URL) ??
  'https://apps.pepperhorn.com'

const FLOW_UPSERT = 'ffd9c4cc-5e14-46a6-a011-7baebba7f171'
const FLOW_LIST = '55b04a7b-a384-4d75-ac8c-68439054dcbf'
const FLOW_DELETE = 'e2594d40-dde4-4c93-b42e-88d8bac288c6'

const APP_SLUG = 'drumlet'

function token(): string {
  try {
    return localStorage.getItem('drumlet-session-token') ?? ''
  } catch {
    return ''
  }
}

/**
 * POST a body to a flow's webhook trigger and return its resolved data.
 * The flows use `error_on_reject: true`, so a missing-field rejection or a
 * thrown "Invalid or expired session" comes back as a non-ok response —
 * surface a message the caller can show, and log the real detail.
 */
async function callFlow(flowId: string, body: Record<string, unknown>): Promise<any> {
  let res: Response
  try {
    res = await fetch(`${BASE}/flows/trigger/${flowId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
  } catch (err) {
    if (err instanceof TypeError) {
      throw new Error("Can't reach the server. Check your connection and try again.")
    }
    throw err
  }

  if (!res.ok) {
    let backendMsg = ''
    try {
      const errBody = await res.json()
      backendMsg = errBody?.errors?.[0]?.message || ''
    } catch {
      /* non-JSON error body */
    }
    console.error(`[drumlet] ${res.status} from flow ${flowId}: ${backendMsg || '(no body)'}`)
    if (/session/i.test(backendMsg)) {
      throw new Error('Your session expired. Sign in again to sync.')
    }
    if (res.status >= 500) {
      throw new Error('Something went wrong on our end. Please try again in a moment.')
    }
    throw new Error(backendMsg || "Couldn't save to your library.")
  }

  const json = await res.json().catch(() => null)
  // Webhook flows return the last operation's value; mirror useAuth's
  // tolerance for an optional `data` envelope.
  return json?.data ?? json
}

export interface SavedPresetRef {
  external_id: string
  name: string
}

export interface LibrarySave {
  id: string
  external_id: string
  name: string
  kind: string
  payload: unknown
  visibility?: string
  date_created?: string
  date_updated?: string
}

/**
 * Save (upsert) a preset to the shared library. The upsert is keyed by
 * `external_id`: pass a stable id to update an existing remote save,
 * or omit it to create a fresh one.
 */
export async function savePresetToLibrary(
  presetDoc: unknown,
  name: string,
  externalId?: string,
): Promise<SavedPresetRef> {
  const external_id = externalId ?? crypto.randomUUID()
  const data = await callFlow(FLOW_UPSERT, {
    token: token(),
    app_slug: APP_SLUG,
    external_id,
    name,
    kind: 'preset',
    payload: presetDoc,
  })
  return { external_id: data?.external_id ?? external_id, name }
}

/** List the presets the signed-in user has saved to the shared library. */
export async function listMyLibraryPresets(): Promise<LibrarySave[]> {
  const data = await callFlow(FLOW_LIST, {
    token: token(),
    app_slug: APP_SLUG,
  })
  const saves = Array.isArray(data?.saves) ? data.saves : []
  return saves.filter((s: any) => s?.kind === 'preset')
}

/** Remove a preset from the shared library by its external id. */
export async function deletePresetFromLibrary(
  externalId: string,
): Promise<{ deleted: boolean; external_id: string }> {
  const data = await callFlow(FLOW_DELETE, {
    token: token(),
    app_slug: APP_SLUG,
    external_id: externalId,
  })
  return { deleted: Boolean(data?.deleted), external_id: data?.external_id ?? externalId }
}
