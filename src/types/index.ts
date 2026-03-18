export interface Partner {
  id: string;
  name: string;
  website: string;
  logo?: string;
  description: string;
}

export interface Category {
  id: string;
  name: string;
  color: string;
}

export interface Tag {
  id: string;
  name: string;
}

export type FormFieldType = 'text' | 'email' | 'textarea' | 'select' | 'checkbox' | 'url';

export interface FormField {
  id: string;
  type: FormFieldType;
  label: string;
  placeholder?: string;
  required: boolean;
  options?: string[];
}

// Legacy type for backwards compatibility during migration
export type OfferCategory =
  | 'Analytics & Insights'
  | 'Email, SMS & Subscribers'
  | 'Marketplaces'
  | 'Retention & Loyalty'
  | 'Site & Checkout'
  | 'Advertising & Acquisition'
  | 'Operations';

export interface Offer {
  id: string;
  partnerId: string;
  name: string;
  shortDescription: string;
  fullDescription: string;
  videoUrl?: string;
  categoryId: string;
  tagIds: string[];
  claimInstructions?: string;
  formFields: FormField[];
  status: 'active' | 'draft' | 'archived';
  isActive: boolean;
  sampleDeliverablePdf?: string;
  createdAt: string;
}

export type ClaimStatus = 'pending' | 'reviewed' | 'completed';

export interface Claim {
  id: string;
  offerId: string;
  brandId: string;
  brandName: string;
  brandEmail: string;
  formData: Record<string, string | boolean>;
  status: ClaimStatus;
  claimedAt: string;
  reviewedAt?: string;
  notes?: string;
}

export interface Brand {
  id: string;
  name: string;
  email: string;
  website?: string;
}
