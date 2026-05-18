import { APP_SLUG, FLOWS_BASE, getSessionToken } from './useAuth.js';

const FLOW_LIST = '55b04a7b-a384-4d75-ac8c-68439054dcbf';
const FLOW_UPSERT = 'ffd9c4cc-5e14-46a6-a011-7baebba7f171';
const FLOW_DELETE = 'e2594d40-dde4-4c93-b42e-88d8bac288c6';

export const SAVE_KIND = 'pattern';

export interface RemoteSave {
  external_id: string;
  name: string;
  kind: string;
  payload: unknown;
  date_updated: string | null;
}

async function callFlow(flowId: string, body: Record<string, unknown>): Promise<unknown | null> {
  const token = getSessionToken();
  if (!token) return null;
  try {
    const res = await fetch(`${FLOWS_BASE}/${flowId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, app_slug: APP_SLUG, ...body }),
    });
    if (!res.ok) return null;
    const json = await res.json().catch(() => null);
    // Webhook flows return the last operation's value directly (no { data } wrapper).
    return (json as { data?: unknown })?.data ?? json;
  } catch {
    return null;
  }
}

/** Returns the user's remote saves, or null if logged out / unreachable. */
export async function remoteListSaves(): Promise<RemoteSave[] | null> {
  const result = await callFlow(FLOW_LIST, {});
  const saves = (result as { success?: boolean; saves?: unknown })?.saves;
  if (!Array.isArray(saves)) return null;
  return saves as RemoteSave[];
}

/** Upserts one save (keyed by external_id). Returns false if logged out / failed. */
export async function remoteUpsertSave(
  externalId: string,
  name: string,
  payload: unknown,
): Promise<boolean> {
  const result = await callFlow(FLOW_UPSERT, {
    external_id: externalId,
    name,
    kind: SAVE_KIND,
    payload,
  });
  return (result as { success?: boolean })?.success === true;
}

/** Deletes one save by external_id. Idempotent. Returns false if logged out / failed. */
export async function remoteDeleteSave(externalId: string): Promise<boolean> {
  const result = await callFlow(FLOW_DELETE, { external_id: externalId });
  return (result as { success?: boolean })?.success === true;
}
