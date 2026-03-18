'use client';

import { useState } from 'react';
import { Search, Eye, Mail, CheckCircle } from 'lucide-react';
import { Card, Badge, Button } from '@/components/common';
import { claims, offers, partners } from '@/data';

export default function AdminClaimsPage() {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [selectedClaim, setSelectedClaim] = useState<string | null>(null);

  const filteredClaims = claims.filter((claim) => {
    const matchesSearch =
      claim.brandName.toLowerCase().includes(search.toLowerCase());
    const matchesStatus = !statusFilter || claim.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const getOfferInfo = (offerId: string) => {
    const offer = offers.find((o) => o.id === offerId);
    if (!offer) return { offerName: 'Unknown', partnerName: 'Unknown' };
    const partner = partners.find((p) => p.id === offer.partnerId);
    return {
      offerName: offer.name,
      partnerName: partner?.name || 'Unknown',
    };
  };

  const selectedClaimData = selectedClaim
    ? claims.find((c) => c.id === selectedClaim)
    : null;

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">Claims</h1>
        <p className="text-[var(--text-secondary)]">
          Review and manage offer claims from brands
        </p>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Claims list */}
        <div className="lg:col-span-2 space-y-6">
          {/* Filters */}
          <Card>
            <div className="flex flex-wrap gap-4">
              <div className="flex-1 min-w-[200px]">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-tertiary)]" />
                  <input
                    type="text"
                    placeholder="Search by brand name..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 bg-[var(--bg-body)] border border-[var(--border-default)] rounded-lg text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] focus:outline-none focus:border-[var(--brand-green-primary)]"
                  />
                </div>
              </div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-4 py-2 bg-[var(--bg-body)] border border-[var(--border-default)] rounded-lg text-[var(--text-primary)] focus:outline-none focus:border-[var(--brand-green-primary)]"
              >
                <option value="">All Status</option>
                <option value="pending">Pending</option>
                <option value="reviewed">Reviewed</option>
                <option value="completed">Completed</option>
              </select>
            </div>
          </Card>

          {/* Claims table */}
          <Card className="overflow-hidden">
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
                      Partner
                    </th>
                    <th className="text-left py-4 px-6 text-sm font-semibold text-[var(--text-secondary)]">
                      Status
                    </th>
                    <th className="text-left py-4 px-6 text-sm font-semibold text-[var(--text-secondary)]">
                      Date
                    </th>
                    <th className="text-right py-4 px-6 text-sm font-semibold text-[var(--text-secondary)]">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {filteredClaims.map((claim) => {
                    const { offerName, partnerName } = getOfferInfo(claim.offerId);
                    const isSelected = selectedClaim === claim.id;

                    return (
                      <tr
                        key={claim.id}
                        className={`border-b border-[var(--border-default)] last:border-0 cursor-pointer transition-colors ${
                          isSelected
                            ? 'bg-[var(--brand-green-primary)]/5'
                            : 'hover:bg-[var(--bg-card-hover)]'
                        }`}
                        onClick={() => setSelectedClaim(claim.id)}
                      >
                        <td className="py-4 px-6">
                          <p className="font-medium text-[var(--text-primary)]">
                            {claim.brandName}
                          </p>
                        </td>
                        <td className="py-4 px-6 text-[var(--text-secondary)]">
                          {offerName}
                        </td>
                        <td className="py-4 px-6 text-[var(--text-secondary)]">
                          {partnerName}
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
                            {claim.status}
                          </Badge>
                        </td>
                        <td className="py-4 px-6 text-[var(--text-tertiary)]">
                          {new Date(claim.claimedAt).toLocaleDateString()}
                        </td>
                        <td className="py-4 px-6">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedClaim(claim.id);
                              }}
                              className="p-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-body)] rounded-lg transition-colors"
                            >
                              <Eye className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {filteredClaims.length === 0 && (
              <div className="text-center py-12">
                <p className="text-[var(--text-secondary)]">No claims found</p>
              </div>
            )}
          </Card>
        </div>

        {/* Claim details sidebar */}
        <div className="lg:col-span-1">
          <div className="sticky top-8">
            <Card>
              {selectedClaimData ? (
                <>
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-lg font-semibold text-[var(--text-primary)]">
                      Claim Details
                    </h2>
                    <Badge
                      variant={
                        selectedClaimData.status === 'pending'
                          ? 'warning'
                          : selectedClaimData.status === 'reviewed'
                          ? 'info'
                          : 'success'
                      }
                    >
                      {selectedClaimData.status}
                    </Badge>
                  </div>

                  <div className="space-y-4 mb-6">
                    <div>
                      <p className="text-sm text-[var(--text-tertiary)] mb-1">Brand</p>
                      <p className="font-medium text-[var(--text-primary)]">
                        {selectedClaimData.brandName}
                      </p>
                    </div>

                    <div>
                      <p className="text-sm text-[var(--text-tertiary)] mb-1">Offer</p>
                      <p className="font-medium text-[var(--text-primary)]">
                        {getOfferInfo(selectedClaimData.offerId).offerName}
                      </p>
                    </div>

                    <div>
                      <p className="text-sm text-[var(--text-tertiary)] mb-1">Partner</p>
                      <p className="font-medium text-[var(--text-primary)]">
                        {getOfferInfo(selectedClaimData.offerId).partnerName}
                      </p>
                    </div>

                    <div>
                      <p className="text-sm text-[var(--text-tertiary)] mb-1">Claimed</p>
                      <p className="font-medium text-[var(--text-primary)]">
                        {new Date(selectedClaimData.claimedAt).toLocaleString()}
                      </p>
                    </div>
                  </div>

                  <div className="border-t border-[var(--border-default)] pt-4 mb-6">
                    <p className="text-sm text-[var(--text-tertiary)] mb-3">
                      Form Submission
                    </p>
                    <div className="space-y-3">
                      {Object.entries(selectedClaimData.formData).map(([key, value]) => (
                        <div key={key}>
                          <p className="text-xs text-[var(--text-tertiary)] capitalize">
                            {key.replace(/_/g, ' ')}
                          </p>
                          <p className="text-sm text-[var(--text-primary)]">
                            {String(value)}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-3">
                    <Button className="w-full">
                      <Mail className="w-4 h-4 mr-2" />
                      Facilitate Intro
                    </Button>
                    <Button variant="secondary" className="w-full">
                      <CheckCircle className="w-4 h-4 mr-2" />
                      Mark as Reviewed
                    </Button>
                  </div>
                </>
              ) : (
                <div className="text-center py-8">
                  <p className="text-[var(--text-secondary)]">
                    Select a claim to view details
                  </p>
                </div>
              )}
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
