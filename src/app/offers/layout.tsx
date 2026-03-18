'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BrandProvider } from '@/contexts';

const brandNavItems = [
  { href: '/offers', label: 'Find Offers', exact: true },
  { href: '/offers/my', label: 'My Offers' },
];

export default function OffersLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <BrandProvider>
    <div className="min-h-screen">
      {/* Top Navigation Bar */}
      <nav className="border-b border-[var(--border-default)] bg-[var(--bg-body)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo/Title - styled like the original header */}
            <Link href="/offers" className="flex items-center">
              <h1 className="text-2xl font-bold text-[var(--text-primary)]">
                dtcmvp <span className="text-lg uppercase tracking-widest text-[var(--brand-green-primary)] font-normal align-middle">Partner Offers</span>
              </h1>
            </Link>

            {/* Navigation Links */}
            <div className="flex items-center gap-6">
              {brandNavItems.map((item) => {
                const isActive = item.exact
                  ? pathname === item.href
                  : pathname.startsWith(item.href);

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`py-1 text-sm font-medium transition-colors border-b-2 ${
                      isActive
                        ? 'border-[var(--brand-green-primary)] text-[var(--text-primary)]'
                        : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--text-tertiary)]'
                    }`}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </div>

            {/* Right side slot - rendered by page via portal or we leave empty for now */}
            <div id="nav-actions" className="flex items-center gap-3">
              {/* Page-specific actions will be placed here */}
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main>
        {children}
      </main>
    </div>
    </BrandProvider>
  );
}
