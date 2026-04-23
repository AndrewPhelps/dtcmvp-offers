'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react';
import Modal from '@/components/common/Modal';
import Button from '@/components/common/Button';
import type { SwagSpec } from '@/lib/swag/swag-types';

const SwagCalculator = dynamic(
  () => import('@/components/swag/SwagCalculator'),
  { ssr: false },
);

const SwagReviewPanel = dynamic(
  () => import('@/components/swag/SwagReviewPanel'),
  { ssr: false },
);

type Status = 'draft' | 'approved' | 'needs-regen';

interface LintCounts {
  red: number;
  yellow: number;
  error: boolean;
}

interface SpecRow {
  slug: string;
  partner_name: string;
  tier: number;
  status: Status;
  reviewed_by: string | null;
  reviewed_at: string | null;
  review_notes: string | null;
  generated_at: string;
  generated_by: string | null;
  created_at: string;
  updated_at: string;
  lintCounts: LintCounts;
}

interface AdminSpecResponse {
  spec: SwagSpec;
  meta: Omit<SpecRow, 'lintCounts'>;
}

const STATUS_FILTERS: Array<{ key: Status | 'all'; label: string }> = [
  { key: 'all', label: 'All' },
  { key: 'draft', label: 'Draft' },
  { key: 'approved', label: 'Approved' },
  { key: 'needs-regen', label: 'Needs regen' },
];

const statusBadgeClass: Record<Status, string> = {
  draft: 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/40',
  approved: 'bg-green-500/20 text-green-400 border border-green-500/40',
  'needs-regen': 'bg-red-500/20 text-red-400 border border-red-500/40',
};

const REVIEWER = 'peter';

type SortKey = 'partner' | 'status' | 'tier' | 'red' | 'yellow' | 'flag' | 'updated' | 'reviewed';
type SortDir = 'asc' | 'desc';

const COLUMNS: Array<{ key: SortKey; label: string; numeric?: boolean }> = [
  { key: 'partner', label: 'Partner' },
  { key: 'status', label: 'Status' },
  { key: 'tier', label: 'Tier', numeric: true },
  { key: 'red', label: 'Red', numeric: true },
  { key: 'yellow', label: 'Yellow', numeric: true },
  { key: 'flag', label: 'Flag', numeric: true },
  { key: 'updated', label: 'Updated' },
  { key: 'reviewed', label: 'Reviewed' },
];

// Status priority for sorting: drafts and needs-regen to the top.
const STATUS_SORT_ORDER: Record<Status, number> = {
  'needs-regen': 0,
  draft: 1,
  approved: 2,
};

export default function AdminSwagsPage() {
  const [rows, setRows] = useState<SpecRow[]>([]);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [filter, setFilter] = useState<Status | 'all'>('all');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null);
  const [selectedSpec, setSelectedSpec] = useState<AdminSpecResponse | null>(null);
  const [selectedLoading, setSelectedLoading] = useState(false);
  const [actionBusy, setActionBusy] = useState(false);
  const [notesDraft, setNotesDraft] = useState('');
  // Default sort: most reds first, then yellows — reviewer tackles problems first.
  const [sortKey, setSortKey] = useState<SortKey>('red');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  const loadList = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/swag/admin/list', { cache: 'no-store' });
      if (!res.ok) throw new Error(`list failed: ${res.status}`);
      const data = await res.json();
      setRows(data.specs ?? []);
      const c: Record<string, number> = {};
      for (const { status, count } of data.counts ?? []) c[status] = count;
      setCounts(c);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'unknown error');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadList(); }, [loadList]);

  const filtered = useMemo(() => {
    if (filter === 'all') return rows;
    return rows.filter((r) => r.status === filter);
  }, [rows, filter]);

  const sorted = useMemo(() => {
    const arr = [...filtered];
    const dir = sortDir === 'asc' ? 1 : -1;
    arr.sort((a, b) => {
      switch (sortKey) {
        case 'partner':
          return dir * a.partner_name.localeCompare(b.partner_name);
        case 'status':
          return dir * (STATUS_SORT_ORDER[a.status] - STATUS_SORT_ORDER[b.status]);
        case 'tier':
          return dir * (a.tier - b.tier);
        case 'red':
          return dir * ((a.lintCounts?.red ?? 0) - (b.lintCounts?.red ?? 0));
        case 'yellow':
          return dir * ((a.lintCounts?.yellow ?? 0) - (b.lintCounts?.yellow ?? 0));
        case 'flag':
          return dir * ((a.review_notes ? 1 : 0) - (b.review_notes ? 1 : 0));
        case 'updated':
          return dir * a.updated_at.localeCompare(b.updated_at);
        case 'reviewed':
          return dir * ((a.reviewed_at ?? '').localeCompare(b.reviewed_at ?? ''));
        default:
          return 0;
      }
    });
    return arr;
  }, [filtered, sortKey, sortDir]);

  const handleSort = useCallback((key: SortKey) => {
    setSortKey((prevKey) => {
      if (prevKey === key) {
        // Toggle direction on same column.
        setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
      } else {
        // New column — numeric columns default to desc (more = more attention needed),
        // text columns default to asc.
        const col = COLUMNS.find((c) => c.key === key);
        setSortDir(col?.numeric ? 'desc' : 'asc');
      }
      return key;
    });
  }, []);

  const sortIcon = useCallback((key: SortKey) => {
    if (sortKey !== key) return <ArrowUpDown className="w-3 h-3 opacity-50" />;
    return sortDir === 'asc'
      ? <ArrowUp className="w-3 h-3" />
      : <ArrowDown className="w-3 h-3" />;
  }, [sortKey, sortDir]);

  const openSpec = useCallback(async (slug: string) => {
    setSelectedSlug(slug);
    setSelectedSpec(null);
    setSelectedLoading(true);
    setNotesDraft('');
    try {
      const res = await fetch(`/api/swag/admin/spec/${slug}`, { cache: 'no-store' });
      if (!res.ok) throw new Error(`load failed: ${res.status}`);
      const data = (await res.json()) as AdminSpecResponse;
      setSelectedSpec(data);
      setNotesDraft(data.meta.review_notes ?? '');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'load failed');
      setSelectedSlug(null);
    } finally {
      setSelectedLoading(false);
    }
  }, []);

  const closeSpec = useCallback(() => {
    setSelectedSlug(null);
    setSelectedSpec(null);
    setNotesDraft('');
  }, []);

  // Save review notes without changing status. Useful when the operator
  // wants to flag an already-approved spec ("fix em dash in X benefit")
  // without re-running the approval flow.
  const saveNotesOnly = useCallback(async () => {
    if (!selectedSpec) return;
    setActionBusy(true);
    try {
      const res = await fetch('/api/swag/admin/status', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          slug: selectedSpec.meta.slug,
          status: selectedSpec.meta.status,
          reviewed_by: REVIEWER,
          notes: notesDraft || null,
        }),
      });
      if (!res.ok) throw new Error(`notes save failed: ${res.status}`);
      await loadList();
      const refreshed = await fetch(`/api/swag/admin/spec/${selectedSpec.meta.slug}`, { cache: 'no-store' });
      if (refreshed.ok) {
        const data = (await refreshed.json()) as AdminSpecResponse;
        setSelectedSpec(data);
        setNotesDraft(data.meta.review_notes ?? '');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'notes save failed');
    } finally {
      setActionBusy(false);
    }
  }, [selectedSpec, notesDraft, loadList]);

  const setStatus = useCallback(async (status: Status) => {
    if (!selectedSpec) return;
    setActionBusy(true);
    try {
      const res = await fetch('/api/swag/admin/status', {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          slug: selectedSpec.meta.slug,
          status,
          reviewed_by: REVIEWER,
          notes: notesDraft || null,
        }),
      });
      if (!res.ok) throw new Error(`status update failed: ${res.status}`);
      await loadList();
      closeSpec();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'update failed');
    } finally {
      setActionBusy(false);
    }
  }, [selectedSpec, notesDraft, loadList, closeSpec]);

  const deleteSpec = useCallback(async () => {
    if (!selectedSpec) return;
    if (!confirm(`Delete SWAG for ${selectedSpec.meta.partner_name}? This cannot be undone.`)) return;
    setActionBusy(true);
    try {
      const res = await fetch(`/api/swag/admin/spec/${selectedSpec.meta.slug}`, { method: 'DELETE' });
      if (!res.ok) throw new Error(`delete failed: ${res.status}`);
      await loadList();
      closeSpec();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'delete failed');
    } finally {
      setActionBusy(false);
    }
  }, [selectedSpec, loadList, closeSpec]);

  return (
    <div className="min-h-screen bg-[var(--bg-body)] text-[var(--text-primary)] p-6 md:p-10">
      <div className="max-w-7xl mx-auto">
        <header className="mb-6 flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl md:text-3xl font-semibold">SWAG review</h1>
            <p className="text-sm text-[var(--text-secondary)] mt-1">
              {rows.length} total
              {' · '}
              {(['draft', 'approved', 'needs-regen'] as Status[]).map((s, i) => (
                <span key={s}>
                  {i > 0 ? ' · ' : ''}
                  <span className={statusBadgeClass[s].split(' ')[1]}>{s}</span>{' '}
                  {counts[s] ?? 0}
                </span>
              ))}
            </p>
          </div>
          <Button variant="secondary" size="sm" onClick={loadList} loading={loading}>
            Refresh
          </Button>
        </header>

        {error && (
          <div className="mb-4 rounded-lg border border-red-500/40 bg-red-500/10 p-3 text-sm text-red-400">
            {error}
          </div>
        )}

        <div className="mb-4 flex flex-wrap gap-2">
          {STATUS_FILTERS.map((f) => {
            const active = filter === f.key;
            return (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={`px-3 py-1.5 rounded-md text-sm border transition-colors ${
                  active
                    ? 'bg-[var(--brand-green-primary)] text-[var(--bg-body)] border-[var(--brand-green-primary)] font-medium'
                    : 'bg-[var(--bg-card)] text-[var(--text-secondary)] border-[var(--border-default)] hover:text-[var(--text-primary)]'
                }`}
              >
                {f.label}
                {f.key !== 'all' && (
                  <span className="ml-1.5 opacity-70">{counts[f.key] ?? 0}</span>
                )}
              </button>
            );
          })}
        </div>

        <div className="rounded-xl border border-[var(--border-default)] overflow-hidden bg-[var(--bg-card)]">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-[var(--bg-card-hover)] text-xs uppercase tracking-wide text-[var(--text-secondary)]">
                <tr>
                  {COLUMNS.map((col) => {
                    const active = sortKey === col.key;
                    return (
                      <th
                        key={col.key}
                        onClick={() => handleSort(col.key)}
                        className={`text-left px-4 py-3 cursor-pointer select-none hover:text-[var(--text-primary)] transition-colors ${active ? 'text-[var(--text-primary)]' : ''}`}
                      >
                        <span className="inline-flex items-center gap-1.5">
                          {col.label}
                          {sortIcon(col.key)}
                        </span>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {sorted.map((r) => {
                  const lc = r.lintCounts ?? { red: 0, yellow: 0, error: false };
                  const approved = r.status === 'approved';
                  const hasFlag = Boolean(r.review_notes);
                  return (
                    <tr
                      key={r.slug}
                      onClick={() => openSpec(r.slug)}
                      className="border-t border-[var(--border-default)] hover:bg-[var(--bg-card-hover)] cursor-pointer"
                    >
                      <td className="px-4 py-3">
                        <div className="font-medium">{r.partner_name}</div>
                        <div className="text-xs font-mono text-[var(--text-tertiary)]">{r.slug}</div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${statusBadgeClass[r.status]}`}>
                          {r.status}
                        </span>
                      </td>
                      <td className="px-4 py-3">{r.tier}</td>
                      <td className="px-4 py-3">
                        {lc.error ? (
                          <span className="inline-block px-2 py-0.5 rounded text-xs font-medium bg-red-500/20 text-red-400 border border-red-500/40">err</span>
                        ) : lc.red > 0 ? (
                          approved ? (
                            <span className="inline-block px-2 py-0.5 rounded text-xs text-[var(--text-tertiary)] line-through" title="Accepted at approval">
                              {lc.red}
                            </span>
                          ) : (
                            <span className="inline-block px-2 py-0.5 rounded text-xs font-medium bg-red-500/20 text-red-300 border border-red-500/40">{lc.red}</span>
                          )
                        ) : (
                          <span className="text-[var(--text-tertiary)]">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {lc.yellow > 0 ? (
                          approved ? (
                            <span className="inline-block px-2 py-0.5 rounded text-xs text-[var(--text-tertiary)] line-through" title="Accepted at approval">
                              {lc.yellow}
                            </span>
                          ) : (
                            <span className="inline-block px-2 py-0.5 rounded text-xs font-medium bg-yellow-500/20 text-yellow-300 border border-yellow-500/40">{lc.yellow}</span>
                          )
                        ) : (
                          <span className="text-[var(--text-tertiary)]">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {hasFlag ? (
                          <span
                            className="inline-block px-2 py-0.5 rounded text-xs font-medium bg-[var(--brand-orange)]/20 text-[var(--brand-orange)] border border-[var(--brand-orange)]/40"
                            title={r.review_notes ?? ''}
                          >
                            ⚑ fix
                          </span>
                        ) : (
                          <span className="text-[var(--text-tertiary)]">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-[var(--text-secondary)] whitespace-nowrap">{formatDate(r.updated_at)}</td>
                      <td className="px-4 py-3 text-[var(--text-secondary)] whitespace-nowrap">
                        {r.reviewed_by ? `${r.reviewed_by} · ${formatDate(r.reviewed_at)}` : '—'}
                      </td>
                    </tr>
                  );
                })}
                {sorted.length === 0 && !loading && (
                  <tr>
                    <td colSpan={COLUMNS.length} className="px-4 py-10 text-center text-[var(--text-secondary)]">
                      No specs match this filter.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <Modal
        isOpen={Boolean(selectedSlug)}
        onClose={closeSpec}
        maxWidth="max-w-[95vw]"
        header={selectedSpec ? (
          <div className="flex items-center gap-3 flex-wrap">
            <h2 className="text-lg md:text-xl font-semibold">{selectedSpec.meta.partner_name}</h2>
            <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${statusBadgeClass[selectedSpec.meta.status]}`}>
              {selectedSpec.meta.status}
            </span>
            <span className="text-xs text-[var(--text-secondary)]">
              tier {selectedSpec.meta.tier} · slug {selectedSpec.meta.slug}
            </span>
          </div>
        ) : selectedSlug ? (
          <h2 className="text-lg font-semibold">Loading {selectedSlug}…</h2>
        ) : null}
        footer={selectedSpec ? (
          <div className="px-4 md:px-8 py-4 flex flex-wrap items-center gap-3">
            <label className="flex-1 min-w-[240px] flex items-center gap-2">
              <span className="text-xs text-[var(--text-secondary)] shrink-0">Flag / notes</span>
              <input
                value={notesDraft}
                onChange={(e) => setNotesDraft(e.target.value)}
                placeholder="e.g. fix em dash in upsell description"
                className="flex-1 bg-[var(--bg-body)] border border-[var(--border-default)] rounded-md px-3 py-1.5 text-sm"
              />
            </label>
            <Button
              variant="secondary"
              size="sm"
              onClick={saveNotesOnly}
              loading={actionBusy}
              disabled={notesDraft === (selectedSpec.meta.review_notes ?? '')}
              title="Save flag/notes without changing status — for small fixes you want Claude to handle"
            >
              Save notes
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setStatus('needs-regen')}
              loading={actionBusy}
            >
              Mark needs regen
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={deleteSpec}
              loading={actionBusy}
            >
              Delete
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => setStatus('approved')}
              loading={actionBusy}
            >
              Approve
            </Button>
          </div>
        ) : undefined}
      >
        {selectedLoading && (
          <div className="p-10 text-center text-[var(--text-secondary)]">Loading spec…</div>
        )}
        {selectedSpec && (
          <div className="flex flex-col md:flex-row h-full md:h-[calc(90vh-10rem)]">
            <div className="md:w-1/2 md:h-full overflow-y-auto p-4 md:p-6 md:border-r border-[var(--border-default)]">
              <SwagReviewPanel key={selectedSpec.meta.slug} spec={selectedSpec.spec} />
            </div>
            <div className="md:w-1/2 md:h-full overflow-y-auto p-4 md:p-6">
              <SwagCalculator key={selectedSpec.meta.slug} spec={selectedSpec.spec} />
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

function formatDate(iso: string | null): string {
  if (!iso) return '—';
  try {
    const d = new Date(iso.replace(' ', 'T') + 'Z');
    if (Number.isNaN(d.getTime())) return iso;
    return d.toISOString().slice(0, 16).replace('T', ' ');
  } catch {
    return iso;
  }
}
