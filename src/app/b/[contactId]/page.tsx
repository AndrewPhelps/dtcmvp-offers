'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { brandLogin } from '@/lib/auth';

export default function BrandVerificationPage() {
  const params = useParams();
  const router = useRouter();
  const contactId = params.contactId as string;

  const [nameInput, setNameInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);

  const handleVerify = async () => {
    if (!nameInput.trim()) return;
    setIsVerifying(true);
    setError(null);
    try {
      await brandLogin(contactId, nameInput.trim());
      const redirect =
        typeof window !== 'undefined'
          ? new URLSearchParams(window.location.search).get('redirect') || '/offers'
          : '/offers';
      router.push(redirect);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Verification failed');
    } finally {
      setIsVerifying(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleVerify();
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--bg-body)] p-4">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">
            dtcmvp <span className="text-sm uppercase tracking-widest text-[var(--brand-green-primary)] font-normal align-middle">Partner Offers</span>
          </h1>
        </div>

        <div className="bg-[var(--bg-card)] border border-[var(--border-default)] rounded-xl p-8">
          <h2 className="text-lg font-bold text-[var(--text-primary)] mb-2 text-center lowercase">
            confirm it&apos;s you
          </h2>
          <p className="text-sm text-[var(--text-secondary)] mb-6 text-center">
            enter your first name to access your offers
          </p>

          <div className="space-y-4">
            <input
              type="text"
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="first name"
              autoFocus
              className="w-full bg-[var(--bg-body)] border border-[var(--border-default)] rounded-lg px-4 py-3 text-sm text-[var(--text-primary)] placeholder-[var(--text-tertiary)] focus:outline-none focus:border-[var(--brand-green-primary)] transition-colors"
            />

            {error && (
              <p className="text-xs text-[var(--brand-red)] text-center">{error}</p>
            )}

            <button
              onClick={handleVerify}
              disabled={!nameInput.trim() || isVerifying}
              className="w-full px-4 py-3 bg-[var(--brand-green-secondary)] text-[var(--bg-body)] font-bold rounded-lg hover:bg-[var(--brand-green-primary)] transition-all disabled:opacity-50 disabled:cursor-not-allowed text-sm lowercase"
            >
              {isVerifying ? 'verifying...' : 'continue'}
            </button>
          </div>
        </div>

        <div className="mt-8 text-center">
          <p className="text-[9px] text-[var(--text-tertiary)]/70 uppercase tracking-widest">
            dtcmvp © {new Date().getFullYear()}
          </p>
        </div>
      </div>
    </div>
  );
}
