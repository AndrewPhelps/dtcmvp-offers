'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Package, ClipboardList, ArrowLeft, Building2, FolderOpen, Tags } from 'lucide-react';

const adminNavItems = [
  { href: '/admin', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/admin/claims', label: 'Claims', icon: ClipboardList },
  { href: '/admin/offers', label: 'Offers', icon: Package },
  { href: '/admin/partners', label: 'Partners', icon: Building2 },
  { href: '/admin/categories', label: 'Categories', icon: FolderOpen },
  { href: '/admin/tags', label: 'Tags', icon: Tags },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen">
      {/* Sidebar - Fixed */}
      <aside className="fixed inset-y-0 left-0 w-64 bg-[var(--bg-card)] border-r border-[var(--border-default)] flex flex-col z-40 overflow-y-auto">
        {/* Logo/Brand */}
        <div className="p-6 border-b border-[var(--border-default)]">
          <Link href="/admin" className="block">
            <div className="text-sm font-semibold text-[var(--text-primary)]">
              DTC MVP Partner Offers
            </div>
            <div className="text-xs text-[var(--text-secondary)]">
              Admin
            </div>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1">
          {adminNavItems.map((item) => {
            const isActive = pathname === item.href ||
              (item.href !== '/admin' && pathname.startsWith(item.href));
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                  isActive
                    ? 'bg-[var(--brand-green-primary)]/10 text-[var(--brand-green-primary)]'
                    : 'text-[var(--text-secondary)] hover:bg-[var(--bg-card-hover)] hover:text-[var(--text-primary)]'
                }`}
              >
                <Icon className="w-5 h-5" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Back to brand view */}
        <div className="p-4 border-t border-[var(--border-default)]">
          <Link
            href="/offers"
            className="flex items-center gap-2 px-4 py-2 text-sm text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to brand view
          </Link>
        </div>
      </aside>

      {/* Main content - offset for fixed sidebar */}
      <main className="pl-64 min-h-screen bg-[var(--bg-body)]">
        <div className="px-24 py-8">
          {children}
        </div>
      </main>
    </div>
  );
}
