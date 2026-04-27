import { memo, useState, useCallback, useRef, useEffect } from 'react';
import type { FormEvent, KeyboardEvent } from 'react';
import type { UseAuthReturn } from '../state/useAuth.js';

const STEPS = { EMAIL: 'email', OTP: 'otp', PROFILE: 'profile' } as const;
type Step = typeof STEPS[keyof typeof STEPS];

const AUTH_FLOW_KEY = 'drumlet-auth-flow';

interface PersistedFlow {
  step: Step;
  email: string;
  codeSentAt: number;
}

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  auth: UseAuthReturn;
}

function getPersistedFlow(): PersistedFlow | null {
  try {
    const raw = localStorage.getItem(AUTH_FLOW_KEY);
    if (!raw) return null;
    const flow = JSON.parse(raw);
    // Expire after 10 minutes (OTP lifetime)
    if (Date.now() - flow.codeSentAt > 10 * 60 * 1000) {
      localStorage.removeItem(AUTH_FLOW_KEY);
      return null;
    }
    return flow;
  } catch { return null; }
}

function persistFlow(step: Step, email: string, codeSentAt: number): void {
  try {
    localStorage.setItem(AUTH_FLOW_KEY, JSON.stringify({ step, email, codeSentAt }));
  } catch { /* quota exceeded */ }
}

function clearPersistedFlow(): void {
  try { localStorage.removeItem(AUTH_FLOW_KEY); } catch { /* ignore */ }
}

function AuthModal({ isOpen, onClose, auth }: AuthModalProps) {
  const persisted = isOpen ? getPersistedFlow() : null;
  const [step, setStep] = useState<Step>(persisted?.step || STEPS.EMAIL);
  const [email, setEmail] = useState<string>(persisted?.email || '');
  const [otp, setOtp] = useState<string[]>(['', '', '', '', '', '']);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [, setCodeSentAt] = useState<number | null>(persisted?.codeSentAt || null);
  const digitRefs = useRef<Array<HTMLInputElement | null>>([]);

  // Reset state when modal opens (but preserve persisted OTP flow)
  useEffect(() => {
    if (isOpen) {
      const flow = getPersistedFlow();
      if (flow) {
        setStep(flow.step);
        setEmail(flow.email);
        setCodeSentAt(flow.codeSentAt);
      } else {
        setStep(STEPS.EMAIL);
        setEmail('');
        setCodeSentAt(null);
      }
      setOtp(['', '', '', '', '', '']);
      setFirstName('');
      setLastName('');
      setError('');
      setSending(false);
      setVerifying(false);
    }
  }, [isOpen]);

  const handleSendCode = useCallback(async (e: FormEvent) => {
    e.preventDefault();
    if (!email.trim() || sending) return;
    setError('');
    setSending(true);
    try {
      await auth.requestOtp(email.trim());
      const now = Date.now();
      setCodeSentAt(now);
      setStep(STEPS.OTP);
      persistFlow(STEPS.OTP, email.trim(), now);
    } catch (err) {
      setError((err as Error).message || 'Failed to send code');
    } finally {
      setSending(false);
    }
  }, [email, sending, auth]);

  const handleDigitChange = useCallback((index: number, value: string) => {
    if (value.length > 1) {
      // Handle paste
      const digits = value.replace(/\D/g, '').slice(0, 6).split('');
      setOtp((prev) => {
        const next = [...prev];
        digits.forEach((d, i) => {
          if (index + i < 6) next[index + i] = d;
        });
        return next;
      });
      const focusIdx = Math.min(index + digits.length, 5);
      digitRefs.current[focusIdx]?.focus();
      // Auto-submit if all 6 filled
      if (index + digits.length >= 6) {
        const fullCode = [...otp];
        digits.forEach((d, i) => { if (index + i < 6) fullCode[index + i] = d; });
        if (fullCode.every((d) => d !== '')) {
          handleVerify(fullCode.join(''));
        }
      }
      return;
    }

    const digit = value.replace(/\D/g, '');
    setOtp((prev) => {
      const next = [...prev];
      next[index] = digit;
      return next;
    });
    if (digit && index < 5) {
      digitRefs.current[index + 1]?.focus();
    }
  }, [otp]);

  const handleDigitKeyDown = useCallback((index: number, e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      digitRefs.current[index - 1]?.focus();
    }
  }, [otp]);

  // Watch for all 6 digits filled
  useEffect(() => {
    if (step === STEPS.OTP && otp.every((d) => d !== '') && !verifying) {
      handleVerify(otp.join(''));
    }
  }, [otp, step]);

  const handleVerify = useCallback(async (code: string) => {
    if (verifying) return;
    setError('');
    setVerifying(true);
    try {
      const result = await auth.verifyOtp(email, code);
      clearPersistedFlow();
      if (result.is_new_user) {
        setStep(STEPS.PROFILE);
      } else {
        onClose();
      }
    } catch (err) {
      setError((err as Error).message || 'Invalid code');
      setOtp(['', '', '', '', '', '']);
      setVerifying(false);
      digitRefs.current[0]?.focus();
    }
  }, [email, verifying, auth, onClose]);

  const handleProfileSubmit = useCallback(async (e: FormEvent) => {
    e.preventDefault();
    if (firstName.trim() || lastName.trim()) {
      await auth.updateProfile({
        first_name: firstName.trim() || null,
        last_name: lastName.trim() || null,
      });
    }
    clearPersistedFlow();
    auth.setIsNewUser(false);
    onClose();
  }, [firstName, lastName, auth, onClose]);

  const handleResend = useCallback(async () => {
    if (sending) return;
    setError('');
    setSending(true);
    try {
      await auth.requestOtp(email);
      setCodeSentAt(Date.now());
      setOtp(['', '', '', '', '', '']);
    } catch (err) {
      setError((err as Error).message || 'Failed to resend');
    } finally {
      setSending(false);
    }
  }, [email, sending, auth]);

  if (!isOpen) return null;

  return (
    <>
      <div className="auth-backdrop fixed inset-0 bg-black/20 z-40" onClick={onClose} />
      <div className="auth-modal fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 bg-card rounded-2xl shadow-2xl border border-border w-[400px] max-w-[90vw] p-6">
        {/* Header */}
        <div className="auth-header flex items-center justify-between mb-5">
          <h3 className="auth-title text-lg lg:text-xl font-display font-bold text-text">
            {step === STEPS.EMAIL && 'Sign In'}
            {step === STEPS.OTP && 'Enter Code'}
            {step === STEPS.PROFILE && 'Welcome!'}
          </h3>
          <button
            className="auth-close-btn w-8 h-8 rounded-lg bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-muted hover:text-text cursor-pointer transition-colors"
            onClick={onClose}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <line x1="2" y1="2" x2="12" y2="12" /><line x1="12" y1="2" x2="2" y2="12" />
            </svg>
          </button>
        </div>

        {/* Step 1: Email */}
        {step === STEPS.EMAIL && (
          <form className="auth-email-form" onSubmit={handleSendCode}>
            <p className="auth-email-hint text-xs lg:text-sm text-muted mb-3">
              Enter your email to receive a one-time login code.
            </p>
            <input
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="auth-email-input w-full px-4 py-3 rounded-xl bg-bg border border-border text-sm text-text outline-none focus:border-sky transition-colors"
              autoFocus
              required
            />
            {error && <p className="auth-error text-xs text-red-500 mt-2">{error}</p>}
            <button
              type="submit"
              disabled={sending || !email.trim()}
              className="auth-send-btn w-full mt-4 px-4 py-3 rounded-xl bg-sky text-white font-semibold text-sm cursor-pointer transition-all hover:bg-sky/90 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {sending ? 'Sending...' : 'Send Code'}
            </button>
          </form>
        )}

        {/* Step 2: OTP */}
        {step === STEPS.OTP && (
          <div className="auth-otp-form">
            <p className="auth-otp-hint text-xs lg:text-sm text-muted mb-1">
              We sent a 6-digit code to
            </p>
            <p className="auth-otp-email text-xs lg:text-sm font-mono font-semibold text-text mb-4">
              {email}
            </p>
            <div className="auth-otp-digits flex justify-center gap-2 mb-4">
              {otp.map((digit, i) => (
                <input
                  key={i}
                  ref={(el) => { digitRefs.current[i] = el; }}
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  value={digit}
                  onChange={(e) => handleDigitChange(i, e.target.value)}
                  onKeyDown={(e) => handleDigitKeyDown(i, e)}
                  onFocus={(e) => e.target.select()}
                  className="auth-otp-digit w-11 h-13 rounded-xl bg-bg border border-border text-center text-xl font-mono font-bold text-text outline-none focus:border-sky transition-colors"
                  autoFocus={i === 0}
                  disabled={verifying}
                />
              ))}
            </div>
            {error && <p className="auth-error text-xs text-red-500 text-center mb-3">{error}</p>}
            {verifying && (
              <p className="auth-verifying text-xs text-sky text-center mb-3">Verifying...</p>
            )}
            <div className="auth-otp-actions flex items-center justify-between">
              <button
                className="auth-back-btn text-xs text-muted hover:text-text cursor-pointer transition-colors"
                onClick={() => { clearPersistedFlow(); setStep(STEPS.EMAIL); setError(''); setOtp(['', '', '', '', '', '']); }}
              >
                ← Back
              </button>
              <button
                className="auth-resend-btn text-xs text-sky hover:text-sky/80 cursor-pointer transition-colors disabled:opacity-50"
                onClick={handleResend}
                disabled={sending}
              >
                {sending ? 'Sending...' : 'Resend code'}
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Profile completion */}
        {step === STEPS.PROFILE && (
          <form className="auth-profile-form" onSubmit={handleProfileSubmit}>
            <p className="auth-profile-hint text-xs lg:text-sm text-muted mb-1">
              Your musical handle is
            </p>
            <p className="auth-profile-handle text-lg font-display font-bold text-sky mb-4">
              {auth.user?.user_handle}
            </p>
            <p className="auth-profile-prompt text-xs lg:text-sm text-muted mb-3">
              Add your name (optional):
            </p>
            <div className="auth-profile-fields flex gap-2 mb-4">
              <input
                type="text"
                placeholder="First name"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="auth-first-name flex-1 px-3 py-2.5 rounded-xl bg-bg border border-border text-sm text-text outline-none focus:border-sky transition-colors"
                autoFocus
              />
              <input
                type="text"
                placeholder="Last name"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="auth-last-name flex-1 px-3 py-2.5 rounded-xl bg-bg border border-border text-sm text-text outline-none focus:border-sky transition-colors"
              />
            </div>
            <button
              type="submit"
              className="auth-complete-btn w-full px-4 py-3 rounded-xl bg-sky text-white font-semibold text-sm cursor-pointer transition-all hover:bg-sky/90"
            >
              Let's go!
            </button>
          </form>
        )}
      </div>
    </>
  );
}

export default memo(AuthModal);
