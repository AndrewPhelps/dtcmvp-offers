import Link from 'next/link';
import { Package, ClipboardList, TrendingUp, Users } from 'lucide-react';
import { Card, Badge } from '@/components/common';
import { offers, claims } from '@/data';

export default function AdminDashboardPage() {
  const activeOffers = offers.filter((o) => o.status === 'active').length;
  const pendingClaims = claims.filter((c) => c.status === 'pending').length;
  const totalClaims = claims.length;

  const stats = [
    {
      label: 'Active Offers',
      value: activeOffers,
      icon: Package,
      color: 'var(--brand-green-primary)',
      href: '/admin/offers',
    },
    {
      label: 'Pending Claims',
      value: pendingClaims,
      icon: ClipboardList,
      color: 'var(--brand-orange)',
      href: '/admin/claims',
    },
    {
      label: 'Total Claims',
      value: totalClaims,
      icon: TrendingUp,
      color: 'var(--brand-blue-primary)',
      href: '/admin/claims',
    },
    {
      label: 'Partners',
      value: 20,
      icon: Users,
      color: 'var(--brand-coral)',
      href: '/admin/offers',
    },
  ];

  // Get recent claims
  const recentClaims = [...claims]
    .sort((a, b) => new Date(b.claimedAt).getTime() - new Date(a.claimedAt).getTime())
    .slice(0, 5);

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">Dashboard</h1>
        <p className="text-[var(--text-secondary)]">
          Overview of your offer marketplace
        </p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {stats.map((stat) => {
          const Icon = stat.icon;
          return (
            <Link key={stat.label} href={stat.href}>
              <Card className="hover:border-[var(--border-hover)] transition-colors cursor-pointer p-6">
                <div className="flex items-center gap-4">
                  <div
                    className="w-12 h-12 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: `${stat.color}20` }}
                  >
                    <Icon className="w-6 h-6" style={{ color: stat.color }} />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-[var(--text-primary)]">
                      {stat.value}
                    </p>
                    <p className="text-sm text-[var(--text-secondary)]">{stat.label}</p>
                  </div>
                </div>
              </Card>
            </Link>
          );
        })}
      </div>

      {/* Recent claims */}
      <Card className="overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border-default)]">
          <h2 className="text-lg font-semibold text-[var(--text-primary)]">
            Recent Claims
          </h2>
          <Link
            href="/admin/claims"
            className="text-sm text-[var(--brand-green-primary)] hover:underline"
          >
            View all
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[var(--border-default)]">
                <th className="text-left py-4 px-6 text-sm font-semibold text-[var(--text-secondary)]">
                  Brand
                </th>
                <th className="text-left py-4 px-6 text-sm font-semibold text-[var(--text-secondary)]">
                  Offer
                </th>
                <th className="text-left py-4 px-6 text-sm font-semibold text-[var(--text-secondary)]">
                  Date
                </th>
                <th className="text-left py-4 px-6 text-sm font-semibold text-[var(--text-secondary)]">
                  Status
                </th>
              </tr>
            </thead>
            <tbody>
              {recentClaims.map((claim) => {
                const offer = offers.find((o) => o.id === claim.offerId);
                return (
                  <tr
                    key={claim.id}
                    className="border-b border-[var(--border-default)] last:border-0 hover:bg-[var(--bg-card-hover)]"
                  >
                    <td className="py-4 px-6">
                      <span className="font-medium text-[var(--text-primary)]">
                        {claim.brandName}
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      <span className="text-[var(--text-secondary)]">
                        {offer?.name}
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      <span className="text-[var(--text-tertiary)]">
                        {new Date(claim.claimedAt).toLocaleDateString()}
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      <Badge
                        variant={
                          claim.status === 'pending'
                            ? 'warning'
                            : claim.status === 'reviewed'
                            ? 'info'
                            : 'success'
                        }
                      >
                        {claim.status.charAt(0).toUpperCase() + claim.status.slice(1)}
                      </Badge>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
