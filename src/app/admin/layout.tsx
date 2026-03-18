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
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className="w-64 bg-[var(--bg-card)] border-r border-[var(--border-default)] flex flex-col">
        {/* Logo/Brand */}
        <div className="p-6 border-b border-[var(--border-default)]">
          <Link href="/admin" className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[var(--brand-green-primary)] flex items-center justify-center">
              <span className="text-sm font-bold text-[var(--bg-body)]">D</span>
            </div>
            <div>
              <span className="font-semibold text-[var(--text-primary)]">dtcmvp</span>
              <span className="text-xs text-[var(--text-tertiary)] block">Admin</span>
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

      {/* Main content */}
      <main className="flex-1 bg-[var(--bg-body)]">
        {children}
      </main>
    </div>
  );
}
