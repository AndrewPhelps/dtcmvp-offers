'use client';

import { useState } from 'react';
import { CheckCircle } from 'lucide-react';
import { Button, Input, Textarea, Select, Checkbox } from '@/components/common';
import { FormField } from '@/types';

interface ClaimFormProps {
  formFields: FormField[];
  offerName: string;
  onSubmit: (data: Record<string, string | boolean>) => void;
  onSubmitted?: () => void;
}

export default function ClaimForm({ formFields, offerName, onSubmit, onSubmitted }: ClaimFormProps) {
  const [formData, setFormData] = useState<Record<string, string | boolean>>({});
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleChange = (fieldId: string, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [fieldId]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1000));

    onSubmit(formData);
    setSubmitted(true);
    setLoading(false);
    onSubmitted?.();
  };

  if (submitted) {
    return (
      <div className="text-center py-8">
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[var(--brand-green-primary)]/20 flex items-center justify-center">
          <CheckCircle className="w-8 h-8 text-[var(--brand-green-primary)]" />
        </div>
        <h3 className="text-xl font-semibold text-[var(--text-primary)] mb-2">
          Offer Claimed!
        </h3>
        <p className="text-[var(--text-secondary)] max-w-md mx-auto">
          Thanks for your interest in {offerName}. The dtcmvp team will review your
          submission and facilitate an introduction with the partner.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {formFields.map((field) => {
        switch (field.type) {
          case 'text':
          case 'email':
          case 'url':
            return (
              <Input
                key={field.id}
                type={field.type}
                label={field.label}
                placeholder={field.placeholder}
                required={field.required}
                value={(formData[field.id] as string) || ''}
                onChange={(e) => handleChange(field.id, e.target.value)}
              />
            );

          case 'textarea':
            return (
              <Textarea
                key={field.id}
                label={field.label}
                placeholder={field.placeholder}
                required={field.required}
                value={(formData[field.id] as string) || ''}
                onChange={(e) => handleChange(field.id, e.target.value)}
              />
            );

          case 'select':
            return (
              <Select
                key={field.id}
                label={field.label}
                required={field.required}
                options={(field.options || []).map((opt) => ({
                  value: opt,
                  label: opt,
                }))}
                value={(formData[field.id] as string) || ''}
                onChange={(e) => handleChange(field.id, e.target.value)}
              />
            );

          case 'checkbox':
            return (
              <Checkbox
                key={field.id}
                label={field.label}
                checked={(formData[field.id] as boolean) || false}
                onChange={(e) => handleChange(field.id, e.target.checked)}
              />
            );

          default:
            return null;
        }
      })}

      <div className="pt-1 pb-4">
        <Button type="submit" loading={loading} className="w-full">
          Submit and Claim
        </Button>
      </div>
    </form>
  );
}
