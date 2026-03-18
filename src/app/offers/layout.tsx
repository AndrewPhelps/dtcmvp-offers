'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Sparkles, Loader2 } from 'lucide-react';
import { BrandProvider, useBrand } from '@/contexts';
import { Button } from '@/components/common';

const brandNavItems = [
  { href: '/offers', label: 'Find Offers', exact: true },
  { href: '/offers/my', label: 'My Offers' },
];

function NavActions() {
  const { startAnalysis, isAnalyzing } = useBrand();
  const router = useRouter();
  const pathname = usePathname();

  const handleFindOffersForMe = () => {
    startAnalysis();
    // Only navigate if not already on /offers
    if (pathname !== '/offers') {
      router.push('/offers');
    }
  };

  return (
    <Button onClick={handleFindOffersForMe} disabled={isAnalyzing}>
      {isAnalyzing ? (
        <>
          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          Analyzing...
        </>
      ) : (
        <>
          <Sparkles className="w-4 h-4 mr-2" />
          Find Offers For Me
        </>
      )}
    </Button>
  );
}

function OffersLayoutContent({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
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

            {/* Find Offers For Me button */}
            <NavActions />
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main>
        {children}
      </main>
    </div>
  );
}

export default function OffersLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <BrandProvider>
      <OffersLayoutContent>{children}</OffersLayoutContent>
    </BrandProvider>
  );
}
