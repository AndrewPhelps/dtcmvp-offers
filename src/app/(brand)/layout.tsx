'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Sparkles, Loader2, Menu, X } from 'lucide-react';
import { BrandProvider, useBrand } from '@/contexts';
import { ImpersonationProvider, useImpersonation } from '@/contexts/ImpersonationContext';
import { useAuth } from '@/contexts/AuthContext';
import { InputsProvider, useInputs } from '@/components/inputs/InputsContext';
import { Button } from '@/components/common';
import TestBrandPicker from '@/components/swag/TestBrandPicker';

/**
 * The "find partners for me" button is gated on the brand having saved at
 * least one interest or objective — without that signal the rank handler
 * has nothing to personalize on and would just return high-value generic
 * partners that look the same across every brand. Numeric profile fields
 * (AOV, list size, etc.) are NOT part of the gate; they mostly scale the
 * dollar amounts and shouldn't punish a brand who simply hasn't entered
 * them yet. See ~/.claude/plans/find-partners-jaunty-otter-rebuild.md.
 */
function useFindPartnersUnlocked(): boolean {
  const { inputs, loading } = useInputs();
  if (loading) return true; // optimistic — don't flash disabled state on mount
  const count =
    (inputs.interestedFunctions?.length ?? 0) +
    (inputs.currentObjectives?.length ?? 0);
  return count > 0;
}

const brandNavItems = [
  { href: '/', label: 'partners', exact: true },
  { href: '/my', label: 'my partners', exact: true },
  { href: '/inputs', label: 'inputs', exact: true },
];

function NavActionsDesktop() {
  const { startAnalysis, isAnalyzing } = useBrand();
  const router = useRouter();
  const pathname = usePathname();
  const unlocked = useFindPartnersUnlocked();

  const handleClick = () => {
    if (!unlocked) {
      // Route them to /inputs so the disabled-button click is still useful.
      router.push('/inputs');
      return;
    }
    startAnalysis();
    if (pathname !== '/') {
      router.push('/');
    }
  };

  const button = (
    <Button
      onClick={handleClick}
      disabled={isAnalyzing}
      className={unlocked ? '' : 'opacity-60 hover:opacity-80'}
    >
      {isAnalyzing ? (
        <>
          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
          analyzing...
        </>
      ) : (
        <>
          <Sparkles className="w-4 h-4 mr-2" />
          find partners for me
        </>
      )}
    </Button>
  );

  if (unlocked) return button;

  return (
    <div className="relative group">
      {button}
      {/* Hover tooltip — desktop only, hover-trigger. Mobile users go straight
          to /inputs on tap via the click handler. */}
      <div
        role="tooltip"
        className="pointer-events-none absolute right-0 top-full mt-2 w-72 rounded-lg border border-[var(--border-default)] bg-[var(--bg-card)] p-3 shadow-lg opacity-0 group-hover:opacity-100 transition-opacity z-50"
      >
        <p className="text-sm font-medium text-[var(--text-primary)]">tell us what you care about first</p>
        <p className="mt-1 text-xs text-[var(--text-secondary)]">
          set up your interests and objectives so we can match you with real partners
        </p>
        <p className="mt-2 text-xs text-[var(--brand-green-primary)]">
          click to go to inputs →
        </p>
      </div>
    </div>
  );
}

interface MobileMenuFindSwagsButtonProps {
  onClose: () => void;
}

function MobileMenuFindSwagsButton({ onClose }: MobileMenuFindSwagsButtonProps) {
  const { startAnalysis, isAnalyzing } = useBrand();
  const router = useRouter();
  const pathname = usePathname();
  const unlocked = useFindPartnersUnlocked();

  const handleClick = () => {
    if (!unlocked) {
      router.push('/inputs');
      onClose();
      return;
    }
    startAnalysis();
    if (pathname !== '/') {
      router.push('/');
    }
    onClose();
  };

  return (
    <div>
      <Button
        onClick={handleClick}
        disabled={isAnalyzing}
        className={`w-full justify-center ${unlocked ? '' : 'opacity-60'}`}
      >
        {isAnalyzing ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            analyzing...
          </>
        ) : (
          <>
            <Sparkles className="w-4 h-4 mr-2" />
            find partners for me
          </>
        )}
      </Button>
      {!unlocked && !isAnalyzing && (
        <p className="mt-2 text-xs text-[var(--text-secondary)] text-center">
          tap to set up your interests first
        </p>
      )}
    </div>
  );
}

function SwagsLayoutContent({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const unlocked = useFindPartnersUnlocked();

  return (
    <div className="min-h-screen">
      {/* Top Navigation Bar */}
      <nav className="border-b border-[var(--border-default)] bg-[var(--bg-body)] sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14 md:h-16">
            {/* Logo */}
            <Link href="/" className="flex items-center">
              <Image
                src="/dtcmvp-logo-white.png"
                alt="dtcmvp"
                width={771}
                height={181}
                priority
                className="h-7 md:h-8 w-auto"
              />
            </Link>

            {/* Desktop Navigation Links */}
            <div className="hidden md:flex items-center gap-6">
              {brandNavItems.map((item) => {
                const isActive = item.exact
                  ? pathname === item.href
                  : pathname.startsWith(item.href);
                const showDot = item.href === '/inputs' && !unlocked;

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`relative py-1 text-sm font-medium transition-colors border-b-2 ${
                      isActive
                        ? 'border-[var(--brand-green-primary)] text-[var(--text-primary)]'
                        : 'border-transparent text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--text-tertiary)]'
                    }`}
                  >
                    {item.label}
                    {showDot && (
                      <span
                        aria-label="action needed"
                        className="absolute -top-0.5 -right-2.5 w-2 h-2 rounded-full bg-red-500"
                      />
                    )}
                  </Link>
                );
              })}
            </div>

            {/* Right side actions */}
            <div className="flex items-center gap-2">
              {/* Desktop: Full find-swags button */}
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
            const showDot = item.href === '/inputs' && !unlocked;

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`flex items-center justify-between px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                  isActive
                    ? 'bg-[var(--brand-green-primary)]/10 text-[var(--brand-green-primary)]'
                    : 'text-[var(--text-secondary)] hover:bg-[var(--bg-card-hover)] hover:text-[var(--text-primary)]'
                }`}
              >
                <span>{item.label}</span>
                {showDot && (
                  <span
                    aria-label="action needed"
                    className="w-2 h-2 rounded-full bg-red-500"
                  />
                )}
              </Link>
            );
          })}
        </nav>
        <div className="p-4 border-t border-[var(--border-default)]">
          <MobileMenuFindSwagsButton onClose={() => setMobileMenuOpen(false)} />
        </div>
      </div>

      {/* Admin impersonation banner — visible across all brand-facing pages. */}
      <AdminImpersonationBanner />

      {/* Main Content */}
      <main>
        {children}
      </main>
    </div>
  );
}

function AdminImpersonationBanner() {
  const { user } = useAuth();
  const { testBrand, setTestBrand } = useImpersonation();
  if (!user?.is_admin) return null;
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-3">
      <TestBrandPicker selected={testBrand} onSelect={setTestBrand} />
    </div>
  );
}

export default function SwagsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ImpersonationProvider>
      <BrandProvider>
        <InputsProvider>
          <SwagsLayoutContent>{children}</SwagsLayoutContent>
        </InputsProvider>
      </BrandProvider>
    </ImpersonationProvider>
  );
}
