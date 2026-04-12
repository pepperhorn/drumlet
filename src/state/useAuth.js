import { useState, useCallback, useEffect } from 'react';

const SESSION_KEY = 'drumlet-session-token';
const APP_SLUG = 'drumlet';
const API_BASE = 'https://apps.pepperhorn.com/flows/trigger';

// Flow webhook IDs
const FLOW_SEND_CODE = '40f96a57-1ab0-4031-a7f5-9a32ec877d15';
const FLOW_VERIFY_CODE = '65da02e3-4742-4c5a-8bc5-3bb114fb6557';
const FLOW_VERIFY_SESSION = '11dd60ca-fc66-4396-9461-858b7bbf2df8';

function getStoredToken() {
  try { return localStorage.getItem(SESSION_KEY); }
  catch { return null; }
}

function storeToken(token) {
  try { localStorage.setItem(SESSION_KEY, token); }
  catch { /* quota exceeded */ }
}

function clearToken() {
  try { localStorage.removeItem(SESSION_KEY); }
  catch { /* ignore */ }
}

export function useAuth() {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isNewUser, setIsNewUser] = useState(false);

  const isLoggedIn = !!user;

  // Validate stored session on mount
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

  const requestOtp = useCallback(async (email) => {
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

  const verifyOtp = useCallback(async (email, otpCode) => {
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
      return data;
    }
    throw new Error('Verification failed');
  }, []);

  const updateProfile = useCallback(async (updates) => {
    if (!user) return;
    const token = getStoredToken();
    // Direct Directus API call to update the user record
    const res = await fetch(`https://apps.pepperhorn.com/items/app_users/${user.id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(updates),
    });
    if (res.ok) {
      setUser((prev) => ({ ...prev, ...updates }));
    }
  }, [user]);

  const logout = useCallback(() => {
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
