'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Sparkles, Loader2, Menu, X } from 'lucide-react';
import { BrandProvider, useBrand } from '@/contexts';
import { Button } from '@/components/common';

const brandNavItems = [
  { href: '/offers', label: 'Find Offers', exact: true },
  { href: '/offers/my', label: 'My Offers' },
];

function NavActionsDesktop() {
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

interface MobileMenuFindOffersButtonProps {
  onClose: () => void;
}

function MobileMenuFindOffersButton({ onClose }: MobileMenuFindOffersButtonProps) {
  const { startAnalysis, isAnalyzing } = useBrand();
  const router = useRouter();
  const pathname = usePathname();

  const handleFindOffersForMe = () => {
    startAnalysis();
    // Only navigate if not already on /offers
    if (pathname !== '/offers') {
      router.push('/offers');
    }
    onClose();
  };

  return (
    <Button onClick={handleFindOffersForMe} disabled={isAnalyzing} className="w-full justify-center">
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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="min-h-screen">
      {/* Top Navigation Bar */}
      <nav className="border-b border-[var(--border-default)] bg-[var(--bg-body)] sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14 md:h-16">
            {/* Logo/Title - styled like the original header */}
            <Link href="/offers" className="flex items-center">
              <h1 className="text-lg md:text-2xl font-bold text-[var(--text-primary)]">
                dtcmvp <span className="hidden sm:inline text-sm md:text-lg uppercase tracking-widest text-[var(--brand-green-primary)] font-normal align-middle">Partner Offers</span>
              </h1>
            </Link>

            {/* Desktop Navigation Links */}
            <div className="hidden md:flex items-center gap-6">
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

            {/* Right side actions */}
            <div className="flex items-center gap-2">
              {/* Desktop: Full Find Offers button */}
              <div className="hidden md:block">
                <NavActionsDesktop />
              </div>

              {/* Mobile menu button */}
              <button
                onClick={() => setMobileMenuOpen(true)}
                className="md:hidden p-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
                aria-label="Open menu"
              >
                <Menu className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile Menu Overlay */}
      <div
        className={`md:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-40 transition-opacity duration-300 ${
          mobileMenuOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={() => setMobileMenuOpen(false)}
      />

      {/* Mobile Menu Drawer */}
      <div
        className={`md:hidden fixed inset-y-0 right-0 w-64 bg-[var(--bg-card)] border-l border-[var(--border-default)] z-50 transform transition-transform duration-300 ease-out ${
          mobileMenuOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        <div className="flex items-center justify-between p-4 border-b border-[var(--border-default)]">
          <span className="text-sm font-semibold text-[var(--text-primary)]">Menu</span>
          <button
            onClick={() => setMobileMenuOpen(false)}
            className="p-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
            aria-label="Close menu"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <nav className="p-4 space-y-1">
          {brandNavItems.map((item) => {
            const isActive = item.exact
              ? pathname === item.href
              : pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`block px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-[var(--brand-green-primary)]/10 text-[var(--brand-green-primary)]'
                    : 'text-[var(--text-secondary)] hover:bg-[var(--bg-card-hover)] hover:text-[var(--text-primary)]'
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="p-4 border-t border-[var(--border-default)]">
          <MobileMenuFindOffersButton onClose={() => setMobileMenuOpen(false)} />
        </div>
      </div>

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
