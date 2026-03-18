// Simulated brand profile data for AI-like recommendations
// In a real system, this would come from the logged-in user's profile

export interface BrandProfile {
  companyName: string;
  companyCategory: string;
  companySize: string;
  monthlyRevenue: string;
  contactName: string;
  contactTitle: string;
  contactSeniority: string;
  contactDepartment: string;
}

// Hardcoded profile simulating what we'd know about the logged-in brand user
export const brandProfile: BrandProfile = {
  companyName: 'Acme Apparel Co.',
  companyCategory: 'Fashion & Apparel',
  companySize: '50-100 employees',
  monthlyRevenue: '$1M-$5M',
  contactName: 'Sarah Chen',
  contactTitle: 'VP of Marketing',
  contactSeniority: 'VP',
  contactDepartment: 'Marketing',
};

// Messages to cycle through during the AI-like loading animation
export const getLoadingMessages = (profile: BrandProfile): string[] => [
  'Analyzing your company profile...',
  `Looking at offers for ${profile.companyCategory} brands...`,
  `Considering your role as ${profile.contactTitle}...`,
  `Finding relevant offers based on your company size...`,
  `Matching offers to ${profile.contactDepartment} priorities...`,
  'Preparing personalized recommendations...',
];
