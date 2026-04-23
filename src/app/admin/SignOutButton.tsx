'use client';

import { useState } from 'react';
import { LogOut } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

// Admin-only sign out. Lives in the topbar so an operator who lands on the
// admin-access gate (signed in as a non-admin) can switch accounts.
export default function SignOutButton() {
  const { user, signOut } = useAuth();
  const [busy, setBusy] = useState(false);

  const handleClick = async () => {
    if (busy) return;
    setBusy(true);
    try {
      await signOut();
    } finally {
      setBusy(false);
    }
  };

  return (
    <button
      onClick={handleClick}
      disabled={busy}
      title={user ? `Sign out ${user.email}` : 'Sign out'}
      className="flex items-center gap-2 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors disabled:opacity-50"
    >
      <LogOut className="w-4 h-4" />
      <span className="hidden sm:inline">{busy ? 'Signing out…' : 'Sign out'}</span>
    </button>
  );
}
