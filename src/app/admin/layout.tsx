import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import AdminTabs from './AdminTabs';

// Shared shell for every /admin/* page: dtcmvp heading, tab row for the
// lists we maintain, and a "back to offers" escape hatch. No BrandProvider
// because admin tools don't touch the brand/claims flow.
export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen">
      <nav className="border-b border-[var(--border-default)] bg-[var(--bg-body)] sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14 md:h-16 gap-4">
            <Link href="/admin" className="flex items-center min-w-0">
              <h1 className="text-lg md:text-2xl font-bold text-[var(--text-primary)] truncate">
                dtcmvp{' '}
                <span className="hidden sm:inline text-sm md:text-lg uppercase tracking-widest text-[var(--brand-orange)] font-normal align-middle">
                  Admin
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
          <AdminTabs />
        </div>
      </nav>
      <main>{children}</main>
    </div>
  );
}
