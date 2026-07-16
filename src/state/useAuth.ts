import { useState, useCallback, useEffect } from 'react';

export interface AuthUser {
  id: string;
  email: string;
  user_handle?: string;
  first_name?: string | null;
  last_name?: string | null;
}

export interface VerifyOtpResult {
  success?: boolean;
  token?: string;
  user?: AuthUser;
  is_new_user?: boolean;
}

export interface UseAuthReturn {
  user: AuthUser | null;
  isLoggedIn: boolean;
  isLoading: boolean;
  isNewUser: boolean;
  setIsNewUser: (v: boolean) => void;
  requestOtp: (email: string) => Promise<boolean>;
  verifyOtp: (email: string, otpCode: string) => Promise<VerifyOtpResult>;
  updateProfile: (updates: Partial<AuthUser>) => Promise<void>;
  logout: () => void;
}

const SESSION_KEY = 'drumlet-session-token';
const APP_SLUG = 'drumlet';
const API_BASE = 'https://apps.pepperhorn.com/flows/trigger';

const FLOW_SEND_CODE = '40f96a57-1ab0-4031-a7f5-9a32ec877d15';
const FLOW_VERIFY_CODE = '65da02e3-4742-4c5a-8bc5-3bb114fb6557';
const FLOW_VERIFY_SESSION = '11dd60ca-fc66-4396-9461-858b7bbf2df8';

/**
 * Turn a non-ok Response into a user-facing message keyed by status class.
 * Never surfaces Directus's raw internal text (e.g. "An unexpected error
 * occurred.") for 5xx — that leaks backend internals and tells the user
 * nothing actionable. The real detail is logged to the console for debugging.
 */
async function friendlyError(res: Response, fallback: string): Promise<Error> {
  let backendMsg = '';
  try {
    const body = await res.json();
    backendMsg = body?.errors?.[0]?.message || '';
  } catch { /* non-JSON body (HTML 500, gateway error) */ }

  if (backendMsg) {
    console.error(`[auth] ${res.status} from ${res.url}: ${backendMsg}`);
  } else {
    console.error(`[auth] ${res.status} from ${res.url} (no parseable body)`);
  }

  if (res.status === 429) {
    return new Error('Too many attempts. Wait a minute and try again.');
  }
  if (res.status >= 500) {
    return new Error("Something went wrong on our end. Please try again in a moment.");
  }
  // 4xx: client/input problem — the backend message is usually safe and useful
  // ("Invalid code", "Email not allowed"). Fall back if it's empty.
  return new Error(backendMsg || fallback);
}

/** True for fetch-level failures (offline, DNS, CORS) vs HTTP error responses. */
function isNetworkError(err: unknown): boolean {
  return err instanceof TypeError;
}

function getStoredToken(): string | null {
  try { return localStorage.getItem(SESSION_KEY); }
  catch { return null; }
}

function storeToken(token: string): void {
  try { localStorage.setItem(SESSION_KEY, token); }
  catch { /* quota exceeded */ }
}

function clearToken(): void {
  try { localStorage.removeItem(SESSION_KEY); }
  catch { /* ignore */ }
}

export function useAuth(): UseAuthReturn {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [initialToken] = useState(getStoredToken);
  const [isLoading, setIsLoading] = useState(() => initialToken !== null);
  const [isNewUser, setIsNewUser] = useState(false);

  const isLoggedIn = !!user;

  useEffect(() => {
    const token = initialToken;
    if (!token) return;

    fetch(`${API_BASE}/${FLOW_VERIFY_SESSION}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, app_slug: APP_SLUG }),
    })
      .then(async (r) => {
        // Only treat a definitive "session invalid" answer as a reason to
        // log out. A transient 500 / network blip must NOT clear a valid
        // token — that would force a needless re-login on a server hiccup.
        if (r.status >= 500) {
          console.error(`[auth] session verify ${r.status} — keeping token (transient)`);
          return;
        }
        const res = await r.json().catch(() => null);
        const data = res?.data ?? res;
        if (data?.valid && data.user) {
          setUser(data.user);
        } else {
          clearToken();
        }
      })
      .catch((err) => {
        // Network failure: server unreachable, not an invalid session.
        if (isNetworkError(err)) {
          console.error('[auth] session verify network error — keeping token');
          return;
        }
        clearToken();
      })
      .finally(() => setIsLoading(false));
  }, [initialToken]);

  const requestOtp = useCallback(async (email: string): Promise<boolean> => {
    let res: Response;
    try {
      res = await fetch(`${API_BASE}/${FLOW_SEND_CODE}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, app_slug: APP_SLUG }),
      });
    } catch (err) {
      if (isNetworkError(err)) {
        throw new Error("Can't reach the server. Check your connection and try again.");
      }
      throw err;
    }
    if (!res.ok) {
      throw await friendlyError(res, 'Failed to send code');
    }
    return true;
  }, []);

  const verifyOtp = useCallback(async (email: string, otpCode: string): Promise<VerifyOtpResult> => {
    let res: Response;
    try {
      res = await fetch(`${API_BASE}/${FLOW_VERIFY_CODE}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, otp_code: otpCode, app_slug: APP_SLUG }),
      });
    } catch (err) {
      if (isNetworkError(err)) {
        throw new Error("Can't reach the server. Check your connection and try again.");
      }
      throw err;
    }
    if (!res.ok) {
      throw await friendlyError(res, 'Invalid code');
    }
    const result = await res.json();
    const data = result?.data ?? result;
    if (data?.success && data.token) {
      storeToken(data.token);
      setUser(data.user);
      setIsNewUser(data.is_new_user || false);
      return data as VerifyOtpResult;
    }
    throw new Error('Verification failed');
  }, []);

  const updateProfile = useCallback(async (updates: Partial<AuthUser>): Promise<void> => {
    if (!user) return;
    const token = getStoredToken();
    const res = await fetch(`https://apps.pepperhorn.com/items/app_users/${user.id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(updates),
    });
    if (res.ok) {
      setUser((prev) => (prev ? { ...prev, ...updates } : prev));
    }
  }, [user]);

  const logout = useCallback((): void => {
    clearToken();
    setUser(null);
    setIsNewUser(false);
  }, []);

  return {
    user,
    isLoggedIn,
    isLoading,
    isNewUser,
    setIsNewUser,
    requestOtp,
    verifyOtp,
    updateProfile,
    logout,
  };
}
