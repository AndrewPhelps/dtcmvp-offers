import { Claim } from '@/types';

// Mock claims for demo purposes
export const claims: Claim[] = [
  {
    id: 'claim-001',
    offerId: 'aix-audit',
    brandId: 'brand-001',
    brandName: 'BYLT Basics',
    brandEmail: 'sarah@byltbasics.com',
    formData: {
      brand_name: 'BYLT Basics',
      store_url: 'https://byltbasics.com',
      account_type: 'Seller Central',
      monthly_spend: '$50k-$100k',
      product_category: 'Apparel',
      biggest_challenge: 'High ACOS on non-brand campaigns, struggling to scale profitably.',
    },
    status: 'pending',
    claimedAt: '2024-03-10T14:30:00Z',
  },
  {
    id: 'claim-002',
    offerId: 'polar-test',
    brandId: 'brand-002',
    brandName: 'HexClad',
    brandEmail: 'marketing@hexclad.com',
    formData: {
      store_url: 'https://hexclad.com',
      monthly_revenue: '$5M+',
      data_questions: 'Want to understand which acquisition channels have the best LTV and where to shift budget.',
    },
    status: 'reviewed',
    claimedAt: '2024-03-08T10:15:00Z',
    reviewedAt: '2024-03-09T09:00:00Z',
    notes: 'Great fit - scheduled for next week.',
  },
  {
    id: 'claim-003',
    offerId: 'postscript-audit',
    brandId: 'brand-003',
    brandName: 'Ridge',
    brandEmail: 'growth@ridge.com',
    formData: {
      store_url: 'https://ridge.com',
      sms_platform: 'Attentive',
      list_size: '100k+',
      sms_revenue: '10-20%',
    },
    status: 'completed',
    claimedAt: '2024-03-01T16:45:00Z',
    reviewedAt: '2024-03-02T11:30:00Z',
    notes: 'Audit completed and delivered. Strong candidate for migration.',
  },
];

export const getClaim = (id: string): Claim | undefined => {
  return claims.find((c) => c.id === id);
};

export const getClaimsByOffer = (offerId: string): Claim[] => {
  return claims.filter((c) => c.offerId === offerId);
};

export const getClaimsByStatus = (status: Claim['status']): Claim[] => {
  return claims.filter((c) => c.status === status);
};
