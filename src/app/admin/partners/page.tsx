'use client';

import { useState } from 'react';
import Image from 'next/image';
import { Plus, Edit2, Trash2, X, ExternalLink } from 'lucide-react';
import { Button, Card, Modal, Input, Textarea } from '@/components/common';
import { partners } from '@/data';
import { Partner } from '@/types';

export default function AdminPartnersPage() {
  const [partnerList, setPartnerList] = useState<Partner[]>(partners);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPartner, setEditingPartner] = useState<Partner | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    website: '',
    logo: '',
    description: '',
  });
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const openCreateModal = () => {
    setEditingPartner(null);
    setFormData({ name: '', website: '', logo: '', description: '' });
    setIsModalOpen(true);
  };

  const openEditModal = (partner: Partner) => {
    setEditingPartner(partner);
    setFormData({
      name: partner.name,
      website: partner.website,
      logo: partner.logo || '',
      description: partner.description,
    });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingPartner(null);
    setFormData({ name: '', website: '', logo: '', description: '' });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    if (editingPartner) {
      // Update existing partner
      setPartnerList((prev) =>
        prev.map((partner) =>
          partner.id === editingPartner.id
            ? {
                ...partner,
                name: formData.name,
                website: formData.website,
                logo: formData.logo,
                description: formData.description,
              }
            : partner
        )
      );
    } else {
      // Create new partner
      const newPartner: Partner = {
        id: formData.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''),
        name: formData.name,
        website: formData.website,
        logo: formData.logo,
        description: formData.description,
      };
      setPartnerList((prev) => [...prev, newPartner]);
    }
    closeModal();
  };

  const handleDelete = (partnerId: string) => {
    setPartnerList((prev) => prev.filter((partner) => partner.id !== partnerId));
    setDeleteConfirm(null);
  };

  return (
    <div>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 md:mb-8">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-[var(--text-primary)]">Partners</h1>
          <p className="text-sm md:text-base text-[var(--text-secondary)]">
            Manage partner companies and their details
          </p>
        </div>
        <Button onClick={openCreateModal}>
          <Plus className="w-4 h-4 mr-2" />
          New Partner
        </Button>
      </div>

      {/* Partners list */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <div className="min-w-[600px]">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[var(--border-default)]">
                  <th className="text-left py-3 md:py-4 px-4 md:px-6 text-sm font-semibold text-[var(--text-secondary)]">
                    Partner
                  </th>
                  <th className="text-left py-3 md:py-4 px-4 md:px-6 text-sm font-semibold text-[var(--text-secondary)] max-w-md">
                    Description
                  </th>
                  <th className="text-left py-3 md:py-4 px-4 md:px-6 text-sm font-semibold text-[var(--text-secondary)]">
                    Website
                  </th>
                  <th className="text-right py-3 md:py-4 px-4 md:px-6 text-sm font-semibold text-[var(--text-secondary)]">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {partnerList.map((partner) => (
                  <tr
                    key={partner.id}
                    className="border-b border-[var(--border-default)] last:border-0 hover:bg-[var(--bg-card-hover)]"
                  >
                    <td className="py-3 md:py-4 px-4 md:px-6">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg bg-white border border-[var(--border-default)] flex items-center justify-center overflow-hidden flex-shrink-0">
                          {partner.logo ? (
                            <Image
                              src={`/logos/${partner.logo}`}
                              alt={`${partner.name} logo`}
                              width={28}
                              height={28}
                              className="object-contain"
                            />
                          ) : (
                            <span className="text-sm font-bold text-slate-600">
                              {partner.name.slice(0, 2).toUpperCase()}
                            </span>
                          )}
                        </div>
                        <span className="font-medium text-[var(--text-primary)]">
                          {partner.name}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 md:py-4 px-4 md:px-6 max-w-md">
                      <p className="text-sm text-[var(--text-secondary)] line-clamp-2">
                        {partner.description}
                      </p>
                    </td>
                    <td className="py-3 md:py-4 px-4 md:px-6">
                      <a
                        href={`https://${partner.website}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 text-[var(--brand-blue-primary)] hover:underline cursor-pointer"
                      >
                        {partner.website}
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </td>
                    <td className="py-3 md:py-4 px-4 md:px-6">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openEditModal(partner)}
                          className="p-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-body)] rounded-lg transition-colors cursor-pointer"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        {deleteConfirm === partner.id ? (
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleDelete(partner.id)}
                              className="px-2 py-1 text-xs text-[var(--brand-red)] hover:bg-[var(--brand-red)]/10 rounded transition-colors cursor-pointer"
                            >
                              Confirm
                            </button>
                            <button
                              onClick={() => setDeleteConfirm(null)}
                              className="p-1 text-[var(--text-tertiary)] hover:text-[var(--text-secondary)] cursor-pointer"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setDeleteConfirm(partner.id)}
                            className="p-2 text-[var(--text-secondary)] hover:text-[var(--brand-red)] hover:bg-[var(--bg-body)] rounded-lg transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {partnerList.length === 0 && (
          <div className="text-center py-12">
            <p className="text-[var(--text-secondary)]">No partners yet</p>
          </div>
        )}
      </Card>

      {/* Create/Edit Modal */}
      <Modal isOpen={isModalOpen} onClose={closeModal} maxWidth="max-w-lg">
        <div className="p-4 md:p-6">
          <h2 className="text-lg md:text-xl font-semibold text-[var(--text-primary)] mb-4 md:mb-6">
            {editingPartner ? 'Edit Partner' : 'New Partner'}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Name"
              value={formData.name}
              onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
              placeholder="e.g., Acme Inc"
              required
            />

            <Input
              label="Website"
              value={formData.website}
              onChange={(e) => setFormData((prev) => ({ ...prev, website: e.target.value }))}
              placeholder="e.g., acme.com"
            />

            <div>
              <Input
                label="Logo Filename"
                value={formData.logo}
                onChange={(e) => setFormData((prev) => ({ ...prev, logo: e.target.value }))}
                placeholder="e.g., acme.png"
              />
              <p className="text-xs text-[var(--text-tertiary)] mt-1">
                Filename of the logo image in the public folder
              </p>
            </div>

            <Textarea
              label="Description"
              value={formData.description}
              onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
              placeholder="Brief description of what this partner does..."
              rows={3}
            />

            <div className="flex flex-col-reverse md:flex-row items-stretch md:items-center justify-end gap-2 md:gap-3 pt-4">
              <Button type="button" variant="ghost" onClick={closeModal} className="justify-center">
                Cancel
              </Button>
              <Button type="submit" className="justify-center">
                {editingPartner ? 'Save Changes' : 'Create Partner'}
              </Button>
            </div>
          </form>
        </div>
      </Modal>
    </div>
  );
}
