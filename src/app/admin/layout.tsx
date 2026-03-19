'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Package, ClipboardList, ArrowLeft, Building2, FolderOpen, Tags, Menu, X } from 'lucide-react';

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
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const SidebarContent = () => (
    <>
      {/* Logo/Brand */}
      <div className="p-4 md:p-6 border-b border-[var(--border-default)]">
        <Link href="/admin" className="block" onClick={() => setSidebarOpen(false)}>
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
              onClick={() => setSidebarOpen(false)}
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
          onClick={() => setSidebarOpen(false)}
          className="flex items-center gap-2 px-4 py-2 text-sm text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to brand view
        </Link>
      </div>
    </>
  );

  return (
    <div className="min-h-screen">
      {/* Mobile Header with Hamburger */}
      <header className="md:hidden fixed top-0 left-0 right-0 h-14 bg-[var(--bg-card)] border-b border-[var(--border-default)] z-30 flex items-center px-4">
        <button
          onClick={() => setSidebarOpen(true)}
          className="p-2 -ml-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
          aria-label="Open menu"
        >
          <Menu className="w-6 h-6" />
        </button>
        <span className="ml-3 text-sm font-semibold text-[var(--text-primary)]">Admin</span>
      </header>

      {/* Mobile Sidebar Overlay */}
      <div
        className={`md:hidden fixed inset-0 bg-black/60 backdrop-blur-sm z-40 transition-opacity duration-300 ${
          sidebarOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
        onClick={() => setSidebarOpen(false)}
      />

      {/* Mobile Sidebar Drawer */}
      <aside
        className={`md:hidden fixed inset-y-0 left-0 w-64 bg-[var(--bg-card)] border-r border-[var(--border-default)] flex flex-col z-50 transform transition-transform duration-300 ease-out ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <button
          onClick={() => setSidebarOpen(false)}
          className="absolute top-4 right-4 p-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
          aria-label="Close menu"
        >
          <X className="w-5 h-5" />
        </button>
        <SidebarContent />
      </aside>

      {/* Desktop Sidebar - Fixed */}
      <aside className="hidden md:flex fixed inset-y-0 left-0 w-64 bg-[var(--bg-card)] border-r border-[var(--border-default)] flex-col z-40 overflow-y-auto">
        <SidebarContent />
      </aside>

      {/* Main content - offset for fixed sidebar on desktop, header on mobile */}
      <main className="pt-14 md:pt-0 md:pl-64 min-h-screen bg-[var(--bg-body)]">
        <div className="px-4 md:px-24 py-6 md:py-8">
          {children}
        </div>
      </main>
    </div>
  );
}
