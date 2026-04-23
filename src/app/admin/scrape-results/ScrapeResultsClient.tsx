'use client';

import { useMemo, useState } from 'react';
import Image from 'next/image';
import {
  Search,
  ChevronUp,
  ChevronDown,
  CheckCircle2,
  Star,
  Video,
  FileText,
  ChevronLeft,
  ChevronRight,
  X,
} from 'lucide-react';
import type { ListApp, DetailApp } from '@/lib/scrapeDb';
import { Drawer, Input, Badge, Button } from '@/components/common';
import AppDetailBody from './AppDetailBody';

type SortKey =
  | 'brand_count'
  | 'review_count'
  | 'rating'
  | 'name'
  | 'pricing_tier_count'
  | 'media_count';

type SortDir = 'asc' | 'desc';
const PER_PAGE = 50;

function safeNumber(n: number | null | undefined): number {
  return n ?? -Infinity;
}

function compare(a: ListApp, b: ListApp, key: SortKey, dir: SortDir): number {
  const mul = dir === 'asc' ? 1 : -1;
  if (key === 'name') {
    const an = (a.name ?? '').toLowerCase();
    const bn = (b.name ?? '').toLowerCase();
    return mul * an.localeCompare(bn);
  }
  const av = safeNumber(a[key]);
  const bv = safeNumber(b[key]);
  if (av === bv) return a.slug.localeCompare(b.slug);
  return mul * (av - bv);
}

interface Props {
  initialApps: ListApp[];
  loadError: string | null;
  viewerEmail: string;
}

export default function ScrapeResultsClient({
  initialApps,
  loadError,
  viewerEmail,
}: Props) {
  const [query, setQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [sortKey, setSortKey] = useState<SortKey>('brand_count');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [page, setPage] = useState(1);
  const [selectedSlug, setSelectedSlug] = useState<string | null>(null);
  const [detail, setDetail] = useState<DetailApp | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);

  const allCategories = useMemo(() => {
    const counts = new Map<string, number>();
    for (const app of initialApps) {
      for (const c of app.categories) {
        counts.set(c, (counts.get(c) ?? 0) + 1);
      }
    }
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([name, count]) => ({ name, count }));
  }, [initialApps]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const rows = initialApps.filter((a) => {
      if (verifiedOnly && !a.verified) return false;
      if (selectedCategory && !a.categories.includes(selectedCategory)) return false;
      if (!q) return true;
      if ((a.name ?? '').toLowerCase().includes(q)) return true;
      if (a.slug.toLowerCase().includes(q)) return true;
      if (a.categories.some((c) => c.toLowerCase().includes(q))) return true;
      return false;
    });
    rows.sort((a, b) => compare(a, b, sortKey, sortDir));
    return rows;
  }, [initialApps, query, selectedCategory, verifiedOnly, sortKey, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PER_PAGE));
  const clampedPage = Math.min(page, totalPages);
  const pageStart = (clampedPage - 1) * PER_PAGE;
  const pageRows = filtered.slice(pageStart, pageStart + PER_PAGE);

  function toggleSort(key: SortKey) {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir(key === 'name' ? 'asc' : 'desc');
    }
    setPage(1);
  }

  async function openDetail(slug: string) {
    setSelectedSlug(slug);
    setDetail(null);
    setDetailError(null);
    setDetailLoading(true);
    try {
      const res = await fetch(`/api/scrape-results/apps/${encodeURIComponent(slug)}`);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `HTTP ${res.status}`);
      }
      const { app } = (await res.json()) as { app: DetailApp };
      setDetail(app);
    } catch (err) {
      setDetailError(err instanceof Error ? err.message : String(err));
    } finally {
      setDetailLoading(false);
    }
  }

  function closeDetail() {
    setSelectedSlug(null);
    setDetail(null);
    setDetailError(null);
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 md:py-10">
      <div className="mb-6">
        <div className="flex items-baseline justify-between gap-4 mb-1">
          <h2 className="text-xl md:text-2xl font-semibold text-[var(--text-primary)]">
            1800dtc.com scrape
          </h2>
          <span className="text-xs text-[var(--text-tertiary)]">
            signed in as {viewerEmail}
          </span>
        </div>
        <p className="text-sm text-[var(--text-secondary)]">
          {initialApps.length.toLocaleString()} Shopify apps captured from{' '}
          <a
            href="https://1800dtc.com/best-shopify-apps"
            target="_blank"
            rel="noreferrer"
            className="text-[var(--brand-green-primary)] hover:underline"
          >
            1800dtc.com/best-shopify-apps
          </a>
          . Sortable, searchable, filterable — click a row for full detail.
        </p>
      </div>

      {loadError && (
        <div className="mb-6 p-4 rounded-lg border border-[var(--brand-red)]/40 bg-[var(--brand-red)]/10 text-sm text-[var(--text-primary)]">
          <strong>Couldn&apos;t open the scrape database.</strong>
          <div className="mt-1 font-mono text-xs text-[var(--text-secondary)]">{loadError}</div>
          <div className="mt-2 text-xs text-[var(--text-secondary)]">
            Expected at <code>/app/data/1800dtc.db</code> in the container. Run the one-time <code>scp</code> from the deploy README.
          </div>
        </div>
      )}

      {/* Controls */}
      <div className="mb-4 space-y-3">
        <div className="flex items-center gap-2">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--text-tertiary)] pointer-events-none" />
            <Input
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setPage(1);
              }}
              placeholder="Search name, slug, or category…"
              className="pl-9"
            />
          </div>
          <label className="flex items-center gap-2 text-sm text-[var(--text-secondary)] cursor-pointer select-none">
            <input
              type="checkbox"
              checked={verifiedOnly}
              onChange={(e) => {
                setVerifiedOnly(e.target.checked);
                setPage(1);
              }}
              className="w-4 h-4 rounded border-[var(--border-default)] bg-[var(--bg-card)] accent-[var(--brand-green-primary)]"
            />
            Verified only
          </label>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => {
              setSelectedCategory(null);
              setPage(1);
            }}
            className={`px-3 py-1.5 text-xs rounded-full border transition-colors ${
              selectedCategory === null
                ? 'bg-[var(--brand-green-primary)]/20 border-[var(--brand-green-primary)]/60 text-[var(--text-primary)]'
                : 'bg-[var(--bg-card)] border-[var(--border-default)] text-[var(--text-secondary)] hover:border-[var(--border-hover)] hover:text-[var(--text-primary)]'
            }`}
          >
            All ({initialApps.length.toLocaleString()})
          </button>
          {allCategories.map(({ name, count }) => {
            const active = selectedCategory === name;
            return (
              <button
                key={name}
                type="button"
                onClick={() => {
                  setSelectedCategory(active ? null : name);
                  setPage(1);
                }}
                className={`px-3 py-1.5 text-xs rounded-full border transition-colors ${
                  active
                    ? 'bg-[var(--brand-green-primary)]/20 border-[var(--brand-green-primary)]/60 text-[var(--text-primary)]'
                    : 'bg-[var(--bg-card)] border-[var(--border-default)] text-[var(--text-secondary)] hover:border-[var(--border-hover)] hover:text-[var(--text-primary)]'
                }`}
              >
                {name}{' '}
                <span className="text-[var(--text-tertiary)]">{count}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border border-[var(--border-default)] bg-[var(--bg-card)]">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--border-default)] text-[var(--text-secondary)]">
              <th className="px-3 py-3 text-left font-medium w-10"></th>
              <SortableHeader
                label="Name"
                active={sortKey === 'name'}
                dir={sortKey === 'name' ? sortDir : undefined}
                onClick={() => toggleSort('name')}
              />
              <SortableHeader
                label="Rating"
                active={sortKey === 'rating'}
                dir={sortKey === 'rating' ? sortDir : undefined}
                onClick={() => toggleSort('rating')}
                align="right"
              />
              <SortableHeader
                label="Reviews"
                active={sortKey === 'review_count'}
                dir={sortKey === 'review_count' ? sortDir : undefined}
                onClick={() => toggleSort('review_count')}
                align="right"
              />
              <SortableHeader
                label="Brands"
                active={sortKey === 'brand_count'}
                dir={sortKey === 'brand_count' ? sortDir : undefined}
                onClick={() => toggleSort('brand_count')}
                align="right"
              />
              <th className="px-3 py-3 text-left font-medium">Categories</th>
              <SortableHeader
                label="Tiers"
                active={sortKey === 'pricing_tier_count'}
                dir={sortKey === 'pricing_tier_count' ? sortDir : undefined}
                onClick={() => toggleSort('pricing_tier_count')}
                align="right"
              />
              <SortableHeader
                label="Media"
                active={sortKey === 'media_count'}
                dir={sortKey === 'media_count' ? sortDir : undefined}
                onClick={() => toggleSort('media_count')}
                align="right"
              />
            </tr>
          </thead>
          <tbody>
            {pageRows.length === 0 ? (
              <tr>
                <td
                  colSpan={8}
                  className="px-3 py-12 text-center text-[var(--text-tertiary)] text-sm"
                >
                  No apps match the current filters.
                </td>
              </tr>
            ) : (
              pageRows.map((app) => (
                <tr
                  key={app.slug}
                  onClick={() => openDetail(app.slug)}
                  className="border-b border-[var(--border-default)] last:border-b-0 hover:bg-[var(--bg-card-hover)] cursor-pointer transition-colors"
                >
                  <td className="px-3 py-3">
                    {app.logo_url ? (
                      <Image
                        src={app.logo_url}
                        alt={`${app.name ?? app.slug} logo`}
                        width={32}
                        height={32}
                        className="w-8 h-8 rounded object-contain bg-white/10"
                        unoptimized
                      />
                    ) : (
                      <div className="w-8 h-8 rounded bg-[var(--bg-card-hover)]" />
                    )}
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="font-medium text-[var(--text-primary)] truncate">
                        {app.name ?? app.slug}
                      </span>
                      {app.verified && (
                        <CheckCircle2
                          className="w-4 h-4 text-[var(--brand-green-primary)] flex-shrink-0"
                          aria-label="Verified"
                        />
                      )}
                      {app.has_video && (
                        <Video
                          className="w-4 h-4 text-[var(--brand-blue-primary)] flex-shrink-0"
                          aria-label="Has demo video"
                        />
                      )}
                      {app.has_case_study && (
                        <FileText
                          className="w-4 h-4 text-[var(--brand-orange)] flex-shrink-0"
                          aria-label="Has case study"
                        />
                      )}
                    </div>
                    <div className="text-xs text-[var(--text-tertiary)] font-mono truncate">
                      {app.slug}
                    </div>
                  </td>
                  <td className="px-3 py-3 text-right">
                    {app.rating != null ? (
                      <span className="inline-flex items-center gap-1 text-[var(--text-primary)]">
                        <Star className="w-3.5 h-3.5 text-[var(--brand-orange)] fill-[var(--brand-orange)]" />
                        {app.rating.toFixed(1)}
                      </span>
                    ) : (
                      <span className="text-[var(--text-tertiary)]">—</span>
                    )}
                  </td>
                  <td className="px-3 py-3 text-right tabular-nums text-[var(--text-secondary)]">
                    {app.review_count != null
                      ? app.review_count.toLocaleString()
                      : '—'}
                  </td>
                  <td className="px-3 py-3 text-right tabular-nums text-[var(--text-secondary)]">
                    {app.brand_count != null
                      ? app.brand_count.toLocaleString()
                      : '—'}
                  </td>
                  <td className="px-3 py-3">
                    <div className="flex flex-wrap gap-1">
                      {app.categories.slice(0, 2).map((c) => (
                        <Badge key={c} variant="info">
                          {c}
                        </Badge>
                      ))}
                      {app.categories.length > 2 && (
                        <Badge variant="default">
                          +{app.categories.length - 2}
                        </Badge>
                      )}
                    </div>
                  </td>
                  <td className="px-3 py-3 text-right tabular-nums text-[var(--text-secondary)]">
                    {app.pricing_tier_count || '—'}
                  </td>
                  <td className="px-3 py-3 text-right tabular-nums text-[var(--text-secondary)]">
                    {app.media_count || '—'}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="mt-4 flex items-center justify-between text-sm">
        <div className="text-[var(--text-secondary)]">
          Showing{' '}
          <span className="text-[var(--text-primary)]">
            {filtered.length === 0 ? 0 : pageStart + 1}–
            {Math.min(pageStart + PER_PAGE, filtered.length)}
          </span>{' '}
          of{' '}
          <span className="text-[var(--text-primary)]">
            {filtered.length.toLocaleString()}
          </span>
          {filtered.length !== initialApps.length && (
            <span className="text-[var(--text-tertiary)]">
              {' '}
              (filtered from {initialApps.length.toLocaleString()})
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={clampedPage <= 1}
          >
            <ChevronLeft className="w-4 h-4" />
            Prev
          </Button>
          <span className="text-[var(--text-secondary)] tabular-nums">
            page {clampedPage} / {totalPages}
          </span>
          <Button
            variant="secondary"
            size="sm"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={clampedPage >= totalPages}
          >
            Next
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <Drawer
        isOpen={selectedSlug !== null}
        onClose={closeDetail}
        header={
          <div className="flex items-center gap-3 min-w-0">
            {detail?.logo_url && (
              <Image
                src={detail.logo_url}
                alt={`${detail.name ?? detail.slug} logo`}
                width={40}
                height={40}
                className="w-10 h-10 rounded object-contain bg-white/10 flex-shrink-0"
                unoptimized
              />
            )}
            <div className="min-w-0">
              <div className="text-lg font-semibold text-[var(--text-primary)] truncate">
                {detail?.name ?? selectedSlug ?? ''}
              </div>
              <div className="text-xs text-[var(--text-tertiary)] font-mono truncate">
                {selectedSlug}
              </div>
            </div>
          </div>
        }
      >
        {detailLoading && (
          <div className="p-8 text-center text-[var(--text-tertiary)]">
            Loading detail…
          </div>
        )}
        {detailError && !detailLoading && (
          <div className="p-8 text-center">
            <X className="w-8 h-8 text-[var(--brand-red)] mx-auto mb-2" />
            <div className="text-[var(--text-primary)]">Failed to load</div>
            <div className="text-xs text-[var(--text-secondary)] mt-1 font-mono">
              {detailError}
            </div>
          </div>
        )}
        {detail && !detailLoading && !detailError && <AppDetailBody app={detail} />}
      </Drawer>
    </div>
  );
}

interface SortableHeaderProps {
  label: string;
  active: boolean;
  dir?: SortDir;
  onClick: () => void;
  align?: 'left' | 'right';
}

function SortableHeader({
  label,
  active,
  dir,
  onClick,
  align = 'left',
}: SortableHeaderProps) {
  return (
    <th
      className={`px-3 py-3 font-medium ${
        align === 'right' ? 'text-right' : 'text-left'
      }`}
    >
      <button
        type="button"
        onClick={onClick}
        className={`inline-flex items-center gap-1 transition-colors ${
          active
            ? 'text-[var(--text-primary)]'
            : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
        }`}
      >
        {label}
        {active ? (
          dir === 'asc' ? (
            <ChevronUp className="w-3.5 h-3.5" />
          ) : (
            <ChevronDown className="w-3.5 h-3.5" />
          )
        ) : (
          <ChevronDown className="w-3.5 h-3.5 opacity-30" />
        )}
      </button>
    </th>
  );
}
