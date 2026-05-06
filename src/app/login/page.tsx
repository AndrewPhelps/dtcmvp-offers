'use client';

import { useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { sendOTP, verifyOTP, loginWithPassword } from '@/lib/auth';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<'email' | 'code' | 'password'>('email');
  const [canResend, setCanResend] = useState(false);
  const router = useRouter();

  const handleRedirect = () => {
    let redirectUrl = '/offers';
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      redirectUrl =
        urlParams.get('redirect') ||
        sessionStorage.getItem('auth.redirect') ||
        '/offers';
      sessionStorage.removeItem('auth.redirect');
    }
    router.push(redirectUrl);
  };

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      await sendOTP(email);
      setSuccess('check your email for the verification code');
      setStep('code');
      setTimeout(() => setCanResend(true), 30000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'failed to send code');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await verifyOTP(email, code);
      handleRedirect();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'invalid code');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await loginWithPassword(email, password);
      handleRedirect();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'invalid email or password');
    } finally {
      setLoading(false);
    }
  };

  const handleResendCode = () => {
    setCanResend(false);
    setCode('');
    handleSendCode({ preventDefault: () => {} } as React.FormEvent);
  };

  const handleBackToEmail = () => {
    setStep('email');
    setCode('');
    setPassword('');
    setError('');
    setSuccess('');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--bg-body)] p-4">
      <div className="w-full max-w-md">
        <div className="flex flex-col items-center mb-8">
          <Image
            src="/dtcmvp-logo-white.png"
            alt="dtcmvp"
            width={771}
            height={181}
            priority
            className="h-10 w-auto"
          />
          <p className="text-xs text-[var(--text-tertiary)] uppercase tracking-widest mt-3">partner sign-in</p>
        </div>

        <div className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-xl p-8">
          {step === 'email' && (
            <form onSubmit={handleSendCode} className="space-y-5">
              <div>
                <label htmlFor="email" className="block text-xs uppercase tracking-widest text-[var(--text-secondary)] mb-2">email</label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg bg-[var(--bg-body)] border border-[var(--border-default)] text-[var(--text-primary)] outline-none focus:border-[var(--brand-green-primary)] transition-colors"
                  placeholder="you@company.com"
                  required
                  autoFocus
                />
              </div>
              {error && <div className="text-sm text-center text-[var(--brand-red)]">{error}</div>}
              <button
                type="submit"
                disabled={loading}
                className="w-full px-4 py-3 rounded-lg font-semibold bg-[var(--brand-green-secondary)] text-[var(--bg-body)] hover:bg-[var(--brand-green-primary)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'sending...' : 'send code'}
              </button>
              <div className="text-center">
                <button
                  type="button"
                  onClick={() => setStep('password')}
                  className="text-xs text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] uppercase tracking-widest"
                >
                  sign in another way
                </button>
              </div>
            </form>
          )}

          {step === 'password' && (
            <form onSubmit={handlePasswordLogin} className="space-y-5">
              <div>
                <label htmlFor="password-email" className="block text-xs uppercase tracking-widest text-[var(--text-secondary)] mb-2">email</label>
                <input
                  id="password-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg bg-[var(--bg-body)] border border-[var(--border-default)] text-[var(--text-primary)] outline-none focus:border-[var(--brand-green-primary)] transition-colors"
                  required
                  autoFocus
                />
              </div>
              <div>
                <label htmlFor="password" className="block text-xs uppercase tracking-widest text-[var(--text-secondary)] mb-2">password</label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg bg-[var(--bg-body)] border border-[var(--border-default)] text-[var(--text-primary)] outline-none focus:border-[var(--brand-green-primary)] transition-colors"
                  required
                />
              </div>
              {error && <div className="text-sm text-center text-[var(--brand-red)]">{error}</div>}
              <button
                type="submit"
                disabled={loading}
                className="w-full px-4 py-3 rounded-lg font-semibold bg-[var(--brand-green-secondary)] text-[var(--bg-body)] hover:bg-[var(--brand-green-primary)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'signing in...' : 'sign in'}
              </button>
              <div className="text-center">
                <button
                  type="button"
                  onClick={handleBackToEmail}
                  className="text-sm text-[var(--brand-green-primary)] hover:text-[var(--brand-green-secondary)]"
                >
                  ← back to email code
                </button>
              </div>
            </form>
          )}

          {step === 'code' && (
            <form onSubmit={handleVerifyCode} className="space-y-5">
              <div className="text-center mb-2">
                <p className="text-sm text-[var(--text-secondary)]">
                  code sent to <span className="text-[var(--brand-green-primary)]">{email}</span>
                </p>
              </div>
              <div>
                <label htmlFor="code" className="block text-xs uppercase tracking-widest text-[var(--text-secondary)] mb-2">verification code</label>
                <input
                  id="code"
                  type="text"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg bg-[var(--bg-body)] border border-[var(--border-default)] text-[var(--text-primary)] outline-none text-center tracking-[0.3em] text-lg focus:border-[var(--brand-green-primary)] transition-colors"
                  placeholder="000000"
                  maxLength={6}
                  required
                  autoFocus
                />
              </div>
              {success && <div className="text-sm text-center text-[var(--brand-green-primary)]">{success}</div>}
              {error && <div className="text-sm text-center text-[var(--brand-red)]">{error}</div>}
              <button
                type="submit"
                disabled={loading}
                className="w-full px-4 py-3 rounded-lg font-semibold bg-[var(--brand-green-secondary)] text-[var(--bg-body)] hover:bg-[var(--brand-green-primary)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'verifying...' : 'verify code'}
              </button>
              <div className="flex justify-between text-sm">
                <button
                  type="button"
                  onClick={handleBackToEmail}
                  className="text-[var(--brand-green-primary)] hover:text-[var(--brand-green-secondary)]"
                >
                  ← change email
                </button>
                {canResend ? (
                  <button
                    type="button"
                    onClick={handleResendCode}
                    className="text-[var(--brand-green-primary)] hover:text-[var(--brand-green-secondary)]"
                  >
                    resend code
                  </button>
                ) : (
                  <span className="text-[var(--text-tertiary)]">resend in 30s</span>
                )}
              </div>
            </form>
          )}
        </div>

        <div className="mt-6 text-center text-xs text-[var(--text-tertiary)]">
          <p className="mb-1">
            Brand user? Use the link from your{' '}
            <a href="https://brand.dtcmvp.com" className="text-[var(--brand-green-primary)] hover:underline">
              brand portal
            </a>
            {' '}to sign in.
          </p>
          <p className="mt-3 uppercase tracking-widest text-[var(--text-tertiary)]/70">a product of dtcmvp</p>
        </div>
      </div>
    </div>
  );
}
