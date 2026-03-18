import { Category } from '@/types';

export const categories: Category[] = [
  {
    id: 'analytics-insights',
    name: 'Analytics & Insights',
    color: 'blue',
  },
  {
    id: 'email-sms-subscribers',
    name: 'Email, SMS & Subscribers',
    color: 'purple',
  },
  {
    id: 'marketplaces',
    name: 'Marketplaces',
    color: 'orange',
  },
  {
    id: 'retention-loyalty',
    name: 'Retention & Loyalty',
    color: 'pink',
  },
  {
    id: 'site-checkout',
    name: 'Site & Checkout',
    color: 'cyan',
  },
  {
    id: 'advertising-acquisition',
    name: 'Advertising & Acquisition',
    color: 'green',
  },
  {
    id: 'operations',
    name: 'Operations',
    color: 'amber',
  },
];

export const getCategory = (id: string): Category | undefined => {
  return categories.find((c) => c.id === id);
};

export const getCategoryByName = (name: string): Category | undefined => {
  return categories.find((c) => c.name === name);
};
