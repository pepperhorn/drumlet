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
  const [isLoading, setIsLoading] = useState(true);
  const [isNewUser, setIsNewUser] = useState(false);

  const isLoggedIn = !!user;

  useEffect(() => {
    const token = getStoredToken();
    if (!token) {
      setIsLoading(false);
      return;
    }

    fetch(`${API_BASE}/${FLOW_VERIFY_SESSION}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, app_slug: APP_SLUG }),
    })
      .then((r) => r.json())
      .then((res) => {
        const data = res?.data ?? res;
        if (data?.valid && data.user) {
          setUser(data.user);
        } else {
          clearToken();
        }
      })
      .catch(() => clearToken())
      .finally(() => setIsLoading(false));
  }, []);

  const requestOtp = useCallback(async (email: string): Promise<boolean> => {
    const res = await fetch(`${API_BASE}/${FLOW_SEND_CODE}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, app_slug: APP_SLUG }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err?.errors?.[0]?.message || 'Failed to send code');
    }
    return true;
  }, []);

  const verifyOtp = useCallback(async (email: string, otpCode: string): Promise<VerifyOtpResult> => {
    const res = await fetch(`${API_BASE}/${FLOW_VERIFY_CODE}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, otp_code: otpCode, app_slug: APP_SLUG }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err?.errors?.[0]?.message || 'Invalid code');
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
