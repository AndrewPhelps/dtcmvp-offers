'use client';

import { useState, useEffect } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Plus, Trash2, GripVertical, Upload } from 'lucide-react';
import { Button, Card, Input, Textarea, Select, Toggle } from '@/components/common';
import { partners, categories, tags, getOffer, getTagsByIds } from '@/data';
import { FormField } from '@/types';

const fieldTypes = [
  { value: 'text', label: 'Text' },
  { value: 'email', label: 'Email' },
  { value: 'url', label: 'URL' },
  { value: 'textarea', label: 'Textarea' },
  { value: 'select', label: 'Select' },
  { value: 'checkbox', label: 'Checkbox' },
];

export default function EditOfferPage() {
  const router = useRouter();
  const params = useParams();
  const offerId = params.id as string;

  const [loading, setLoading] = useState(false);
  const [notFound, setNotFound] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    partnerId: '',
    categoryId: '',
    shortDescription: '',
    fullDescription: '',
    claimInstructions: '',
    tagIds: [] as string[],
    status: 'draft' as 'active' | 'draft' | 'archived',
    isActive: true,
    sampleDeliverablePdf: '',
    championName: '',
    championTitle: '',
    championBrand: '',
    championAvatarUrl: '',
    championLinkedInUrl: '',
  });

  const [formFields, setFormFields] = useState<FormField[]>([]);
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

  useEffect(() => {
    const offer = getOffer(offerId);
    if (offer) {
      setFormData({
        name: offer.name,
        partnerId: offer.partnerId,
        categoryId: offer.categoryId,
        shortDescription: offer.shortDescription,
        fullDescription: offer.fullDescription,
        claimInstructions: offer.claimInstructions || '',
        tagIds: offer.tagIds,
        status: offer.status,
        isActive: offer.isActive,
        sampleDeliverablePdf: offer.sampleDeliverablePdf || '',
        championName: offer.champion?.name || '',
        championTitle: offer.champion?.title || '',
        championBrand: offer.champion?.brand || '',
        championAvatarUrl: offer.champion?.avatarUrl || '',
        championLinkedInUrl: offer.champion?.linkedInUrl || '',
      });
      setFormFields(offer.formFields);
    } else {
      setNotFound(true);
    }
  }, [offerId]);

  const handleChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const addFormField = () => {
    const newField: FormField = {
      id: `field_${Date.now()}`,
      type: 'text',
      label: '',
      required: false,
    };
    setFormFields([...formFields, newField]);
  };

  const updateFormField = (index: number, updates: Partial<FormField>) => {
    setFormFields((prev) =>
      prev.map((field, i) => (i === index ? { ...field, ...updates } : field))
    );
  };

  const removeFormField = (index: number) => {
    setFormFields((prev) => prev.filter((_, i) => i !== index));
  };

  const handleDragStart = (index: number) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;

    const newFields = [...formFields];
    const draggedField = newFields[draggedIndex];
    newFields.splice(draggedIndex, 1);
    newFields.splice(index, 0, draggedField);
    setFormFields(newFields);
    setDraggedIndex(index);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1000));

    const champion = formData.championName && formData.championTitle && formData.championBrand
      ? {
          name: formData.championName,
          title: formData.championTitle,
          brand: formData.championBrand,
          avatarUrl: formData.championAvatarUrl,
          linkedInUrl: formData.championLinkedInUrl || undefined,
        }
      : undefined;

    const updatedOffer = {
      id: offerId,
      ...formData,
      formFields,
      sampleDeliverablePdf: formData.sampleDeliverablePdf || undefined,
      champion,
    };

    console.log('Offer updated:', updatedOffer);
    router.push('/admin/offers');
  };

  if (notFound) {
    return (
      <div className="max-w-4xl">
        <Link
          href="/admin/offers"
          className="inline-flex items-center gap-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to offers
        </Link>

        <Card className="text-center py-12">
          <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-2">
            Offer not found
          </h2>
          <p className="text-[var(--text-secondary)]">
            The offer you&apos;re looking for doesn&apos;t exist or has been removed.
          </p>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto">
      <Link
        href="/admin/offers"
        className="inline-flex items-center gap-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to offers
      </Link>

      <div className="mb-8">
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">Edit Offer</h1>
        <p className="text-[var(--text-secondary)]">
          Update this partner offer
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Basic Info */}
        <Card className="p-6">
          <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-6">
            Basic Information
          </h2>
          <div className="space-y-4">
            <Input
              label="Offer Name"
              required
              value={formData.name}
              onChange={(e) => handleChange('name', e.target.value)}
              placeholder="e.g., Free Fraud Audit"
            />

            <div className="grid grid-cols-2 gap-4">
              <Select
                label="Partner"
                required
                value={formData.partnerId}
                onChange={(e) => handleChange('partnerId', e.target.value)}
                options={[
                  { value: '', label: 'Select a partner' },
                  ...partners.map((p) => ({ value: p.id, label: p.name })),
                ]}
              />

              <Select
                label="Category"
                required
                value={formData.categoryId}
                onChange={(e) => handleChange('categoryId', e.target.value)}
                options={[
                  { value: '', label: 'Select a category' },
                  ...categories.map((c) => ({ value: c.id, label: c.name })),
                ]}
              />
            </div>

            <Select
              label="Status"
              required
              value={formData.status}
              onChange={(e) => handleChange('status', e.target.value)}
              options={[
                { value: 'draft', label: 'Draft' },
                { value: 'active', label: 'Active' },
                { value: 'archived', label: 'Archived' },
              ]}
            />

            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">
                Tags
              </label>
              <div className="flex flex-wrap gap-2 p-3 bg-[var(--bg-body)] border border-[var(--border-default)] rounded-lg min-h-[42px]">
                {formData.tagIds.map((tagId) => {
                  const tag = tags.find((t) => t.id === tagId);
                  return (
                    <span
                      key={tagId}
                      className="inline-flex items-center gap-1 px-2 py-1 bg-[var(--bg-card)] rounded text-sm text-[var(--text-primary)]"
                    >
                      {tag?.name || tagId}
                      <button
                        type="button"
                        onClick={() =>
                          setFormData((prev) => ({
                            ...prev,
                            tagIds: prev.tagIds.filter((id) => id !== tagId),
                          }))
                        }
                        className="text-[var(--text-tertiary)] hover:text-[var(--brand-red)] cursor-pointer"
                      >
                        ×
                      </button>
                    </span>
                  );
                })}
                <select
                  value=""
                  onChange={(e) => {
                    if (e.target.value && !formData.tagIds.includes(e.target.value)) {
                      setFormData((prev) => ({
                        ...prev,
                        tagIds: [...prev.tagIds, e.target.value],
                      }));
                    }
                  }}
                  className="bg-transparent text-sm text-[var(--text-tertiary)] focus:outline-none cursor-pointer"
                >
                  <option value="">+ Add tag</option>
                  {tags
                    .filter((t) => !formData.tagIds.includes(t.id))
                    .map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.name}
                      </option>
                    ))}
                </select>
              </div>
            </div>
          </div>
        </Card>

        {/* Descriptions */}
        <Card className="p-6">
          <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-6">
            Descriptions
          </h2>
          <div className="space-y-4">
            <Textarea
              label="Short Description"
              required
              value={formData.shortDescription}
              onChange={(e) => handleChange('shortDescription', e.target.value)}
              placeholder="Brief description shown in offer cards (1-2 sentences)"
              rows={2}
            />

            <Textarea
              label="Full Description"
              required
              value={formData.fullDescription}
              onChange={(e) => handleChange('fullDescription', e.target.value)}
              placeholder="Detailed description of the offer, what's included, benefits, etc."
              rows={6}
            />

            <Textarea
              label="Claim Instructions"
              value={formData.claimInstructions}
              onChange={(e) => handleChange('claimInstructions', e.target.value)}
              placeholder="Step-by-step process after claiming (one step per line)"
              rows={4}
            />

            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">
                Sample Deliverable PDF
              </label>
              <div className="flex gap-3">
                <Input
                  value={formData.sampleDeliverablePdf}
                  onChange={(e) => handleChange('sampleDeliverablePdf', e.target.value)}
                  placeholder="e.g., sample-audit-report.pdf"
                  className="flex-1"
                />
                <Button type="button" variant="secondary">
                  <Upload className="w-4 h-4 mr-2" />
                  Upload
                </Button>
              </div>
              <p className="text-xs text-[var(--text-tertiary)] mt-1.5">
                Upload a sample deliverable PDF to show brands what they&apos;ll receive (optional)
              </p>
            </div>
          </div>
        </Card>

        {/* Offer Champion */}
        <Card className="p-6">
          <h2 className="text-lg font-semibold text-[var(--text-primary)] mb-2">
            Offer Champion
          </h2>
          <p className="text-sm text-[var(--text-secondary)] mb-6">
            Add an endorsing champion to build trust (all fields optional)
          </p>
          <div className="space-y-4">
            <div>
              <Input
                label="LinkedIn URL"
                value={formData.championLinkedInUrl}
                onChange={(e) => handleChange('championLinkedInUrl', e.target.value)}
                placeholder="e.g., https://linkedin.com/in/sarahchen"
              />
              <p className="text-xs text-[var(--text-tertiary)] mt-1.5">
                Will auto-populate champion info from LinkedIn profile
              </p>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Champion Name"
                value={formData.championName}
                onChange={(e) => handleChange('championName', e.target.value)}
                placeholder="e.g., Sarah Chen"
              />
              <Input
                label="Title"
                value={formData.championTitle}
                onChange={(e) => handleChange('championTitle', e.target.value)}
                placeholder="e.g., VP of Marketing"
              />
            </div>

            <Input
              label="Brand / Company"
              value={formData.championBrand}
              onChange={(e) => handleChange('championBrand', e.target.value)}
              placeholder="e.g., Glossier"
            />

            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-1.5">
                Avatar URL
              </label>
              <div className="flex gap-3">
                <Input
                  value={formData.championAvatarUrl}
                  onChange={(e) => handleChange('championAvatarUrl', e.target.value)}
                  placeholder="e.g., /avatars/sarah-chen.jpg"
                  className="flex-1"
                />
                <Button type="button" variant="secondary">
                  <Upload className="w-4 h-4 mr-2" />
                  Upload
                </Button>
              </div>
            </div>
          </div>
        </Card>

        {/* Form Fields */}
        <Card className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-semibold text-[var(--text-primary)]">
                Claim Form Fields
              </h2>
              <p className="text-sm text-[var(--text-secondary)]">
                Configure what information to collect when brands claim this offer
              </p>
            </div>
            <Button type="button" variant="secondary" onClick={addFormField}>
              <Plus className="w-4 h-4 mr-2" />
              Add Field
            </Button>
          </div>

          <div className="space-y-3">
            {formFields.map((field, index) => (
              <div
                key={field.id}
                draggable
                onDragStart={() => handleDragStart(index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDragEnd={handleDragEnd}
                className={`flex items-center gap-4 p-4 bg-[var(--bg-body)] rounded-lg transition-all ${
                  draggedIndex === index ? 'opacity-50 scale-[0.98]' : ''
                }`}
              >
                <div
                  className="text-[var(--text-tertiary)] cursor-grab active:cursor-grabbing"
                >
                  <GripVertical className="w-4 h-4" />
                </div>

                <div className="flex-1 grid grid-cols-3 gap-4 items-end">
                  <Input
                    label="Label"
                    value={field.label}
                    onChange={(e) =>
                      updateFormField(index, { label: e.target.value })
                    }
                    placeholder="Field label"
                  />

                  <Select
                    label="Type"
                    value={field.type}
                    onChange={(e) =>
                      updateFormField(index, {
                        type: e.target.value as FormField['type'],
                      })
                    }
                    options={fieldTypes}
                  />

                  <div className="flex items-center justify-between pb-2">
                    <Toggle
                      label="Required"
                      checked={field.required}
                      onChange={(checked) =>
                        updateFormField(index, { required: checked })
                      }
                    />

                    <button
                      type="button"
                      onClick={() => removeFormField(index)}
                      className="p-2 text-[var(--text-tertiary)] hover:text-[var(--brand-red)] transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}

            {formFields.length === 0 && (
              <div className="text-center py-8 text-[var(--text-secondary)]">
                No form fields yet. Add fields to collect information from brands.
              </div>
            )}
          </div>
        </Card>

        {/* Actions */}
        <div className="flex items-center justify-end gap-4">
          <Link href="/admin/offers">
            <Button type="button" variant="ghost">
              Cancel
            </Button>
          </Link>
          <Button type="submit" loading={loading}>
            Save Changes
          </Button>
        </div>
      </form>
    </div>
  );
}
