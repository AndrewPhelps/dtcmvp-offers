'use client';

import Link from 'next/link';
import { Gift, Settings } from 'lucide-react';

export default function Navbar() {
  return (
    <nav className="border-b border-[var(--border-default)] bg-[var(--bg-card)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/offers" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[var(--brand-green-primary)] flex items-center justify-center">
              <Gift className="w-5 h-5 text-[var(--bg-body)]" />
            </div>
            <span className="text-lg font-semibold text-[var(--text-primary)]">
              dtcmvp <span className="text-[var(--text-secondary)] font-normal">offers</span>
            </span>
          </Link>

          {/* User menu */}
          <div className="flex items-center gap-3">
            <button className="p-2 rounded-lg text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-card-hover)] transition-colors">
              <Settings className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[var(--bg-card-hover)]">
              <div className="w-7 h-7 rounded-full bg-[var(--brand-blue-primary)] flex items-center justify-center text-white text-xs font-semibold">
                SC
              </div>
              <span className="text-sm text-[var(--text-primary)]">BYLT Basics</span>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}
