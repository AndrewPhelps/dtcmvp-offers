export interface Question {
  id: string;
  question: string;
  description?: string;
  type: 'single' | 'multiple';
  options: {
    id: string;
    label: string;
    tags: string[]; // Tags that map to offer categories/tags
  }[];
}

export const questions: Question[] = [
  {
    id: 'primary_challenge',
    question: 'What is your biggest challenge right now?',
    description: 'Select the area where you need the most help',
    type: 'single',
    options: [
      {
        id: 'acquisition',
        label: 'Acquiring new customers profitably',
        tags: ['Advertising & Acquisition', 'acquisition', 'targeting', 'mobile'],
      },
      {
        id: 'retention',
        label: 'Retaining customers and increasing LTV',
        tags: ['Retention & Loyalty', 'retention', 'loyalty', 'subscription', 'churn'],
      },
      {
        id: 'conversion',
        label: 'Converting website visitors',
        tags: ['Site & Checkout', 'conversion', 'cro', 'optimization', 'checkout'],
      },
      {
        id: 'email_sms',
        label: 'Email & SMS performance',
        tags: ['Email, SMS & Subscribers', 'email', 'sms', 'klaviyo', 'subscribers'],
      },
      {
        id: 'operations',
        label: 'Operations & efficiency',
        tags: ['Operations', 'fraud', 'cx', 'support', 'billing'],
      },
      {
        id: 'analytics',
        label: 'Understanding my data',
        tags: ['Analytics & Insights', 'analytics', 'data', 'personas', 'competitive'],
      },
    ],
  },
  {
    id: 'channels',
    question: 'Which channels are you currently using?',
    description: 'Select all that apply',
    type: 'multiple',
    options: [
      { id: 'meta', label: 'Meta (Facebook/Instagram)', tags: ['advertising', 'Meta'] },
      { id: 'google', label: 'Google Ads', tags: ['advertising', 'Google'] },
      { id: 'tiktok', label: 'TikTok', tags: ['advertising', 'TikTok'] },
      { id: 'email', label: 'Email (Klaviyo, etc.)', tags: ['email', 'klaviyo'] },
      { id: 'sms', label: 'SMS', tags: ['sms'] },
      { id: 'amazon', label: 'Amazon', tags: ['amazon', 'Marketplaces'] },
      { id: 'direct_mail', label: 'Direct mail', tags: ['direct mail', 'offline'] },
    ],
  },
  {
    id: 'revenue_range',
    question: 'What is your monthly revenue?',
    description: 'This helps us recommend the most relevant offers',
    type: 'single',
    options: [
      { id: 'under_100k', label: 'Under $100k', tags: [] },
      { id: '100k_500k', label: '$100k - $500k', tags: [] },
      { id: '500k_1m', label: '$500k - $1M', tags: [] },
      { id: '1m_5m', label: '$1M - $5M', tags: [] },
      { id: 'over_5m', label: 'Over $5M', tags: [] },
    ],
  },
  {
    id: 'priorities',
    question: 'What are your top priorities for the next 90 days?',
    description: 'Select up to 3',
    type: 'multiple',
    options: [
      { id: 'reduce_cac', label: 'Reduce customer acquisition cost', tags: ['acquisition', 'advertising'] },
      { id: 'increase_ltv', label: 'Increase customer lifetime value', tags: ['retention', 'loyalty', 'subscription'] },
      { id: 'improve_conversion', label: 'Improve website conversion rate', tags: ['cro', 'conversion', 'checkout'] },
      { id: 'grow_list', label: 'Grow email/SMS list', tags: ['subscribers', 'opt-in', 'email', 'sms'] },
      { id: 'expand_amazon', label: 'Grow Amazon revenue', tags: ['amazon', 'Marketplaces'] },
      { id: 'reduce_fraud', label: 'Reduce fraud & chargebacks', tags: ['fraud', 'security'] },
      { id: 'automate_cx', label: 'Automate customer support', tags: ['cx', 'support', 'automation'] },
    ],
  },
];

export const getQuestionById = (id: string): Question | undefined => {
  return questions.find((q) => q.id === id);
};
