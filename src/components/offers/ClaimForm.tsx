'use client';

import { useState } from 'react';
import { CheckCircle, AlertTriangle } from 'lucide-react';
import { Button, Input, Textarea, Select, Checkbox } from '@/components/common';
import { FormField } from '@/types';
import { submitClaim } from '@/lib/api';
import { useAuth } from '@/contexts/AuthContext';
import { useImpersonation } from '@/contexts/ImpersonationContext';

interface ClaimFormProps {
  offerSlug: string;
  offerName: string;
  formFields: FormField[];
  /** Called after a successful claim with the backend-issued claim_id. */
  onClaimed?: (claimId: string) => void;
  /** Optional callback for parent after the success screen is showing. */
  onSubmitted?: () => void;
}

export default function ClaimForm({ offerSlug, offerName, formFields, onClaimed, onSubmitted }: ClaimFormProps) {
  // Per-offer dynamic fields. Identity comes from session.
  const [formData, setFormData] = useState<Record<string, string | boolean>>({});

  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();
  const { testBrand } = useImpersonation();
  const effectiveEmail = testBrand?.email || user?.email;

  const handleChange = (fieldId: string, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [fieldId]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const normalized = { ...formData };
    for (const field of formFields) {
      if (field.type === 'url') {
        const raw = (normalized[field.id] as string | undefined)?.trim();
        if (raw && !/^https?:\/\//i.test(raw)) {
          normalized[field.id] = `https://${raw}`;
        }
      }
    }

    try {
      const result = await submitClaim({ slug: offerSlug, formData: normalized });
      setSubmitted(true);
      onClaimed?.(result.claim.claim_id);
      onSubmitted?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setLoading(false);
    }
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
      {/* Identity comes from session — show who's signing the claim.
          When admin is impersonating a brand, show that brand's email. */}
      {effectiveEmail && (
        <p className="text-xs text-[var(--text-tertiary)]">
          Signed in as <span className="text-[var(--text-secondary)]">{effectiveEmail}</span>
          {testBrand && (
            <span className="ml-2 text-amber-300/80">· admin testing</span>
          )}
        </p>
      )}

      {/* Per-offer dynamic fields */}
      {formFields.map((field) => {
        switch (field.type) {
          case 'text':
          case 'email':
          case 'url':
            return (
              <Input
                key={field.id}
                type={field.type === 'url' ? 'text' : field.type}
                label={field.label}
                placeholder={field.placeholder ?? (field.type === 'url' ? 'yourstore.com' : undefined)}
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

      {error && (
        <div className="flex items-start gap-2 px-3 py-2.5 rounded-lg bg-red-500/10 border border-red-500/30 text-sm text-red-400">
          <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="pt-1 pb-4">
        <Button type="submit" loading={loading} className="w-full">
          Submit and Claim
        </Button>
      </div>
    </form>
  );
}
