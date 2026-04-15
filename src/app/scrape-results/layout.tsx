import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';

// Distinct shell from /offers — signals "admin tool" visually.
// No BrandProvider (no claims/analysis flows here).
export default function ScrapeResultsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen">
      <nav className="border-b border-[var(--border-default)] bg-[var(--bg-body)] sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14 md:h-16 gap-4">
            <Link href="/scrape-results" className="flex items-center min-w-0">
              <h1 className="text-lg md:text-2xl font-bold text-[var(--text-primary)] truncate">
                dtcmvp{' '}
                <span className="hidden sm:inline text-sm md:text-lg uppercase tracking-widest text-[var(--brand-orange)] font-normal align-middle">
                  Scrape Results
                </span>
              </h1>
            </Link>

            <Link
              href="/offers"
              className="flex items-center gap-2 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline">Back to Offers</span>
            </Link>
          </div>
        </div>
      </nav>
      <main>{children}</main>
    </div>
  );
}
