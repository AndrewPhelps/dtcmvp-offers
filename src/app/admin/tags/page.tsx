'use client';

import { useState } from 'react';
import { Plus, Edit2, Trash2, X } from 'lucide-react';
import { Button, Card, Modal, Input } from '@/components/common';
import { tags } from '@/data';
import { Tag } from '@/types';
import { tagBadgeStyle } from '@/lib';

export default function AdminTagsPage() {
  const [tagList, setTagList] = useState<Tag[]>(tags);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTag, setEditingTag] = useState<Tag | null>(null);
  const [formData, setFormData] = useState({ name: '' });
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const openCreateModal = () => {
    setEditingTag(null);
    setFormData({ name: '' });
    setIsModalOpen(true);
  };

  const openEditModal = (tag: Tag) => {
    setEditingTag(tag);
    setFormData({ name: tag.name });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingTag(null);
    setFormData({ name: '' });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    if (editingTag) {
      // Update existing tag
      setTagList((prev) =>
        prev.map((tag) =>
          tag.id === editingTag.id
            ? { ...tag, name: formData.name }
            : tag
        )
      );
    } else {
      // Create new tag
      const newTag: Tag = {
        id: formData.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''),
        name: formData.name,
      };
      setTagList((prev) => [...prev, newTag]);
    }
    closeModal();
  };

  const handleDelete = (tagId: string) => {
    setTagList((prev) => prev.filter((tag) => tag.id !== tagId));
    setDeleteConfirm(null);
  };

  return (
    <div>
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 md:mb-8">
        <div>
          <h1 className="text-xl md:text-2xl font-bold text-[var(--text-primary)]">Tags</h1>
          <p className="text-sm md:text-base text-[var(--text-secondary)]">
            Manage offer tags for filtering and organization
          </p>
        </div>
        <Button onClick={openCreateModal}>
          <Plus className="w-4 h-4 mr-2" />
          New Tag
        </Button>
      </div>

      {/* Tags list */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <div className="min-w-[400px]">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[var(--border-default)]">
                  <th className="text-left py-3 md:py-4 px-4 md:px-6 text-sm font-semibold text-[var(--text-secondary)]">
                    Name
                  </th>
                  <th className="text-left py-3 md:py-4 px-4 md:px-6 text-sm font-semibold text-[var(--text-secondary)]">
                    Preview
                  </th>
                  <th className="text-right py-3 md:py-4 px-4 md:px-6 text-sm font-semibold text-[var(--text-secondary)]">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {tagList.map((tag) => (
                  <tr
                    key={tag.id}
                    className="border-b border-[var(--border-default)] last:border-0 hover:bg-[var(--bg-card-hover)]"
                  >
                    <td className="py-3 md:py-4 px-4 md:px-6">
                      <span className="font-medium text-[var(--text-primary)]">
                        {tag.name}
                      </span>
                    </td>
                    <td className="py-3 md:py-4 px-4 md:px-6">
                      <span className={`text-xs px-2 py-0.5 rounded-full border ${tagBadgeStyle}`}>
                        {tag.name}
                      </span>
                    </td>
                    <td className="py-3 md:py-4 px-4 md:px-6">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openEditModal(tag)}
                          className="p-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-body)] rounded-lg transition-colors cursor-pointer"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        {deleteConfirm === tag.id ? (
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleDelete(tag.id)}
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
                            onClick={() => setDeleteConfirm(tag.id)}
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

        {tagList.length === 0 && (
          <div className="text-center py-12">
            <p className="text-[var(--text-secondary)]">No tags yet</p>
          </div>
        )}
      </Card>

      {/* Create/Edit Modal */}
      <Modal isOpen={isModalOpen} onClose={closeModal} maxWidth="max-w-sm">
        <div className="p-4 md:p-6">
          <h2 className="text-lg md:text-xl font-semibold text-[var(--text-primary)] mb-4 md:mb-6">
            {editingTag ? 'Edit Tag' : 'New Tag'}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Name"
              value={formData.name}
              onChange={(e) => setFormData({ name: e.target.value })}
              placeholder="e.g., Analytics"
              required
            />

            <div className="flex flex-col-reverse md:flex-row items-stretch md:items-center justify-end gap-2 md:gap-3 pt-4">
              <Button type="button" variant="ghost" onClick={closeModal} className="justify-center">
                Cancel
              </Button>
              <Button type="submit" className="justify-center">
                {editingTag ? 'Save Changes' : 'Create Tag'}
              </Button>
            </div>
          </form>
        </div>
      </Modal>
    </div>
  );
}
