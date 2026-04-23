'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

// Central registry of admin views. Add new entries here as lists grow.
const TABS: Array<{ href: string; label: string }> = [
  { href: '/admin/scrape-results', label: '1800dtc apps' },
  { href: '/admin/swags', label: 'SWAGs' },
];

export default function AdminTabs() {
  const pathname = usePathname() ?? '';

  return (
    <div className="flex gap-1 -mb-px overflow-x-auto">
      {TABS.map((tab) => {
        const active = pathname === tab.href || pathname.startsWith(`${tab.href}/`);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
              active
                ? 'border-[var(--brand-green-primary)] text-[var(--text-primary)]'
                : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
            }`}
          >
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}
