'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Plus, Search, Edit2, Archive } from 'lucide-react';
import { Button, Card, Badge, Input } from '@/components/common';
import { offers, partners, categories, getCategory } from '@/data';

export default function AdminOffersPage() {
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');

  const filteredOffers = offers.filter((offer) => {
    const matchesSearch =
      offer.name.toLowerCase().includes(search.toLowerCase()) ||
      offer.shortDescription.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = !categoryFilter || offer.categoryId === categoryFilter;
    const matchesStatus = !statusFilter || offer.status === statusFilter;
    return matchesSearch && matchesCategory && matchesStatus;
  });

  const getPartnerName = (partnerId: string) => {
    const partner = partners.find((p) => p.id === partnerId);
    return partner?.name || partnerId;
  };

  return (
    <div>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 md:mb-8">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-[var(--text-primary)]">Offers</h1>
          <p className="text-sm md:text-base text-[var(--text-secondary)]">
            Manage partner offers in the marketplace
          </p>
        </div>
        <Link href="/admin/offers/new">
          <Button className="w-full md:w-auto justify-center">
            <Plus className="w-4 h-4 mr-2" />
            New Offer
          </Button>
        </Link>
      </div>

      {/* Offers table with integrated filters */}
      <Card className="overflow-hidden">
        {/* Filters inside card */}
        <div className="flex flex-col md:flex-row gap-3 md:gap-4 px-4 md:px-6 py-3 md:py-4 border-b border-[var(--border-default)]">
          <div className="flex-1 min-w-0 md:min-w-[200px]">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-tertiary)]" />
              <input
                type="text"
                placeholder="Search offers..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-[var(--bg-body)] border border-[var(--border-default)] rounded-lg text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--brand-green-primary)]"
              />
            </div>
          </div>
          <div className="flex gap-3">
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="flex-1 md:flex-none px-4 py-2 bg-[var(--bg-body)] border border-[var(--border-default)] rounded-lg text-[var(--text-primary)] focus:outline-none focus:border-[var(--brand-green-primary)]"
            >
              <option value="">All Categories</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name}
                </option>
              ))}
            </select>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="flex-1 md:flex-none px-4 py-2 bg-[var(--bg-body)] border border-[var(--border-default)] rounded-lg text-[var(--text-primary)] focus:outline-none focus:border-[var(--brand-green-primary)]"
            >
              <option value="">All Status</option>
              <option value="active">Active</option>
              <option value="draft">Draft</option>
              <option value="archived">Archived</option>
            </select>
          </div>
        </div>
        <div className="overflow-x-auto">
          <div className="min-w-[800px]">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[var(--border-default)]">
                  <th className="text-left py-3 md:py-4 px-4 md:px-6 text-sm font-semibold text-[var(--text-secondary)]">
                    Offer
                  </th>
                  <th className="text-left py-3 md:py-4 px-4 md:px-6 text-sm font-semibold text-[var(--text-secondary)]">
                    Partner
                  </th>
                  <th className="text-left py-3 md:py-4 px-4 md:px-6 text-sm font-semibold text-[var(--text-secondary)]">
                    Category
                  </th>
                  <th className="text-left py-3 md:py-4 px-4 md:px-6 text-sm font-semibold text-[var(--text-secondary)]">
                    Status
                  </th>
                  <th className="text-left py-3 md:py-4 px-4 md:px-6 text-sm font-semibold text-[var(--text-secondary)]">
                    Created
                  </th>
                  <th className="text-right py-3 md:py-4 px-4 md:px-6 text-sm font-semibold text-[var(--text-secondary)]">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredOffers.map((offer) => (
                  <tr
                    key={offer.id}
                    className="border-b border-[var(--border-default)] last:border-0 hover:bg-[var(--bg-card-hover)]"
                  >
                    <td className="py-3 md:py-4 px-4 md:px-6">
                      <div>
                        <p className="font-medium text-[var(--text-primary)]">
                          {offer.name}
                        </p>
                        <p className="text-sm text-[var(--text-secondary)] truncate max-w-xs">
                          {offer.shortDescription}
                        </p>
                      </div>
                    </td>
                    <td className="py-3 md:py-4 px-4 md:px-6 text-[var(--text-secondary)]">
                      {getPartnerName(offer.partnerId)}
                    </td>
                    <td className="py-3 md:py-4 px-4 md:px-6">
                      <Badge variant="default">{getCategory(offer.categoryId)?.name || offer.categoryId}</Badge>
                    </td>
                    <td className="py-3 md:py-4 px-4 md:px-6">
                      <Badge
                        variant={
                          offer.status === 'active'
                            ? 'success'
                            : offer.status === 'draft'
                            ? 'warning'
                            : 'default'
                        }
                      >
                        {offer.status.charAt(0).toUpperCase() + offer.status.slice(1)}
                      </Badge>
                    </td>
                    <td className="py-3 md:py-4 px-4 md:px-6 text-[var(--text-tertiary)]">
                      {new Date(offer.createdAt).toLocaleDateString()}
                    </td>
                    <td className="py-3 md:py-4 px-4 md:px-6">
                      <div className="flex items-center justify-end gap-2">
                        <Link href={`/admin/offers/${offer.id}`}>
                          <button className="p-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-body)] rounded-lg transition-colors cursor-pointer">
                            <Edit2 className="w-4 h-4" />
                          </button>
                        </Link>
                        <button className="p-2 text-[var(--text-secondary)] hover:text-[var(--brand-orange)] hover:bg-[var(--bg-body)] rounded-lg transition-colors cursor-pointer">
                          <Archive className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {filteredOffers.length === 0 && (
          <div className="text-center py-8 md:py-12">
            <p className="text-[var(--text-secondary)]">No offers found</p>
          </div>
        )}
      </Card>
    </div>
  );
}
