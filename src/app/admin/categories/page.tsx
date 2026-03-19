'use client';

import { useState } from 'react';
import { Plus, Edit2, Trash2, X } from 'lucide-react';
import { Button, Card, Modal, Input } from '@/components/common';
import { categories } from '@/data';
import { Category } from '@/types';
import { getCategoryColorByColorName } from '@/lib';

const colorOptions = [
  { value: 'blue', label: 'Blue' },
  { value: 'purple', label: 'Purple' },
  { value: 'orange', label: 'Orange' },
  { value: 'pink', label: 'Pink' },
  { value: 'cyan', label: 'Cyan' },
  { value: 'green', label: 'Green' },
  { value: 'amber', label: 'Amber' },
  { value: 'red', label: 'Red' },
  { value: 'teal', label: 'Teal' },
  { value: 'indigo', label: 'Indigo' },
];

export default function AdminCategoriesPage() {
  const [categoryList, setCategoryList] = useState<Category[]>(categories);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [formData, setFormData] = useState({ name: '', color: 'blue' });
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const openCreateModal = () => {
    setEditingCategory(null);
    setFormData({ name: '', color: 'blue' });
    setIsModalOpen(true);
  };

  const openEditModal = (category: Category) => {
    setEditingCategory(category);
    setFormData({ name: category.name, color: category.color });
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingCategory(null);
    setFormData({ name: '', color: 'blue' });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) return;

    if (editingCategory) {
      // Update existing category
      setCategoryList((prev) =>
        prev.map((cat) =>
          cat.id === editingCategory.id
            ? { ...cat, name: formData.name, color: formData.color }
            : cat
        )
      );
    } else {
      // Create new category
      const newCategory: Category = {
        id: formData.name.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''),
        name: formData.name,
        color: formData.color,
      };
      setCategoryList((prev) => [...prev, newCategory]);
    }
    closeModal();
  };

  const handleDelete = (categoryId: string) => {
    setCategoryList((prev) => prev.filter((cat) => cat.id !== categoryId));
    setDeleteConfirm(null);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-[var(--text-primary)]">Categories</h1>
          <p className="text-[var(--text-secondary)]">
            Manage offer categories and their colors
          </p>
        </div>
        <Button onClick={openCreateModal}>
          <Plus className="w-4 h-4 mr-2" />
          New Category
        </Button>
      </div>

      {/* Categories list */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[var(--border-default)]">
                <th className="text-left py-4 px-6 text-sm font-semibold text-[var(--text-secondary)]">
                  Name
                </th>
                <th className="text-left py-4 px-6 text-sm font-semibold text-[var(--text-secondary)]">
                  Preview
                </th>
                <th className="text-right py-4 px-6 text-sm font-semibold text-[var(--text-secondary)]">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {categoryList.map((category) => {
                const colors = getCategoryColorByColorName(category.color);
                return (
                  <tr
                    key={category.id}
                    className="border-b border-[var(--border-default)] last:border-0 hover:bg-[var(--bg-card-hover)]"
                  >
                    <td className="py-4 px-6">
                      <span className="font-medium text-[var(--text-primary)]">
                        {category.name}
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      <span className={`text-xs px-2 py-0.5 rounded-full border ${colors.badge}`}>
                        {category.name}
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openEditModal(category)}
                          className="p-2 text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-body)] rounded-lg transition-colors"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        {deleteConfirm === category.id ? (
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleDelete(category.id)}
                              className="px-2 py-1 text-xs text-[var(--brand-red)] hover:bg-[var(--brand-red)]/10 rounded transition-colors"
                            >
                              Confirm
                            </button>
                            <button
                              onClick={() => setDeleteConfirm(null)}
                              className="p-1 text-[var(--text-tertiary)] hover:text-[var(--text-secondary)]"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setDeleteConfirm(category.id)}
                            className="p-2 text-[var(--text-secondary)] hover:text-[var(--brand-red)] hover:bg-[var(--bg-body)] rounded-lg transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {categoryList.length === 0 && (
          <div className="text-center py-12">
            <p className="text-[var(--text-secondary)]">No categories yet</p>
          </div>
        )}
      </Card>

      {/* Create/Edit Modal */}
      <Modal isOpen={isModalOpen} onClose={closeModal} maxWidth="max-w-md">
        <div className="p-6">
          <h2 className="text-xl font-semibold text-[var(--text-primary)] mb-6">
            {editingCategory ? 'Edit Category' : 'New Category'}
          </h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              label="Name"
              value={formData.name}
              onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
              placeholder="e.g., Analytics & Insights"
              required
            />

            <div>
              <label className="block text-sm font-medium text-[var(--text-secondary)] mb-2">
                Color
              </label>
              <div className="flex flex-wrap gap-2">
                {colorOptions.map((option) => {
                  const colors = getCategoryColorByColorName(option.value);
                  const isSelected = formData.color === option.value;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => setFormData((prev) => ({ ...prev, color: option.value }))}
                      className={`text-xs px-3 py-1 rounded-full border transition-all cursor-pointer ${colors.badge} ${
                        isSelected
                          ? 'ring-2 ring-offset-2 ring-offset-[var(--bg-card)] ring-[var(--text-primary)]'
                          : 'opacity-70 hover:opacity-100'
                      }`}
                    >
                      {option.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-4">
              <Button type="button" variant="ghost" onClick={closeModal}>
                Cancel
              </Button>
              <Button type="submit">
                {editingCategory ? 'Save Changes' : 'Create Category'}
              </Button>
            </div>
          </form>
        </div>
      </Modal>
    </div>
  );
}
