'use client';

import { useState } from 'react';
import Image from 'next/image';
import {
  ExternalLink,
  Star,
  Users,
  CheckCircle2,
  Video as VideoIcon,
} from 'lucide-react';
import type { DetailApp } from '@/lib/scrapeDb';
import { Badge } from '@/components/common';

const BRAND_PREVIEW = 48;
const BRAND_BATCH = 120;

function toYouTubeEmbed(url: string): string | null {
  try {
    const u = new URL(url);
    // https://www.youtube.com/watch?v=ID → https://www.youtube.com/embed/ID
    if (u.hostname.includes('youtube.com')) {
      const v = u.searchParams.get('v');
      if (v) return `https://www.youtube.com/embed/${v}`;
      // already an embed URL
      if (u.pathname.startsWith('/embed/')) return url;
    }
    if (u.hostname === 'youtu.be') {
      const id = u.pathname.replace(/^\//, '');
      if (id) return `https://www.youtube.com/embed/${id}`;
    }
  } catch {
    // not a URL
  }
  return null;
}

export default function AppDetailBody({ app }: { app: DetailApp }) {
  const [brandLimit, setBrandLimit] = useState(BRAND_PREVIEW);
  const videos = app.media.filter((m) => m.kind === 'video');
  const screenshots = app.media.filter((m) => m.kind === 'screenshot');

  return (
    <div className="px-4 md:px-8 py-6 space-y-8">
      {/* Stats strip */}
      <div className="flex flex-wrap gap-3">
        {app.verified && (
          <Badge variant="success">
            <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
            Verified
          </Badge>
        )}
        {app.rating != null && (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-[var(--bg-card-hover)] text-sm">
            <Star className="w-4 h-4 text-[var(--brand-orange)] fill-[var(--brand-orange)]" />
            <span className="text-[var(--text-primary)] font-medium">
              {app.rating.toFixed(1)}
            </span>
            {app.review_count != null && (
              <span className="text-[var(--text-tertiary)]">
                ({app.review_count.toLocaleString()} reviews)
              </span>
            )}
          </span>
        )}
        {app.brand_count != null && (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-[var(--bg-card-hover)] text-sm text-[var(--text-primary)]">
            <Users className="w-4 h-4 text-[var(--brand-blue-primary)]" />
            {app.brand_count.toLocaleString()} brands
          </span>
        )}
      </div>

      {/* Links */}
      <div className="flex flex-wrap gap-3 text-sm">
        {app.website_url && (
          <a
            href={app.website_url}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded border border-[var(--border-default)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--border-hover)] transition-colors"
          >
            <ExternalLink className="w-4 h-4" />
            Affiliate link (1800dtc go-link)
          </a>
        )}
        <a
          href={app.source_url}
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded border border-[var(--border-default)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--border-hover)] transition-colors"
        >
          <ExternalLink className="w-4 h-4" />
          View on 1800dtc.com
        </a>
      </div>

      {/* Short description + overview */}
      {app.short_desc && (
        <p className="text-[var(--text-primary)] leading-relaxed">
          {app.short_desc}
        </p>
      )}
      {app.overview && app.overview !== app.short_desc && (
        <div>
          <h3 className="text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-2">
            Overview
          </h3>
          <p className="text-[var(--text-primary)] leading-relaxed whitespace-pre-line">
            {app.overview}
          </p>
        </div>
      )}

      {/* Categories + tags */}
      {app.categories.length > 0 && (
        <Section title="Categories">
          <div className="flex flex-wrap gap-2">
            {app.categories.map((c) => (
              <Badge key={c} variant="info">
                {c}
              </Badge>
            ))}
          </div>
        </Section>
      )}
      {app.tags.length > 0 && (
        <Section title="Tags">
          <div className="flex flex-wrap gap-1.5">
            {app.tags.map((t) => (
              <span
                key={t}
                className="px-2 py-0.5 text-xs rounded-full bg-[var(--bg-card-hover)] text-[var(--text-secondary)] border border-[var(--border-default)]"
              >
                {t}
              </span>
            ))}
          </div>
        </Section>
      )}

      {/* Pricing tiers */}
      {app.pricing_tiers.length > 0 && (
        <Section title={`Pricing (${app.pricing_tiers.length} tier${app.pricing_tiers.length === 1 ? '' : 's'})`}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {app.pricing_tiers.map((t) => {
              const recommended = t.features.some((f) => f === '__recommended__');
              const features = t.features.filter((f) => f !== '__recommended__');
              return (
                <div
                  key={t.position}
                  className={`p-4 rounded-lg border ${
                    recommended
                      ? 'border-[var(--brand-green-primary)]/60 bg-[var(--brand-green-primary)]/5'
                      : 'border-[var(--border-default)] bg-[var(--bg-card-hover)]/40'
                  }`}
                >
                  <div className="flex items-baseline justify-between mb-1">
                    <div className="font-semibold text-[var(--text-primary)]">
                      {t.tier_name ?? 'Tier'}
                    </div>
                    {recommended && (
                      <Badge variant="success">Recommended</Badge>
                    )}
                  </div>
                  <div className="text-sm text-[var(--text-secondary)] mb-3">
                    {t.price_text ?? '—'}
                    {t.period && (
                      <span className="text-[var(--text-tertiary)]"> · {t.period}</span>
                    )}
                  </div>
                  {features.length > 0 && (
                    <ul className="space-y-1 text-sm text-[var(--text-secondary)]">
                      {features.map((f, idx) => (
                        <li key={idx} className="flex gap-2">
                          <span className="text-[var(--text-tertiary)]">•</span>
                          <span>{f}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              );
            })}
          </div>
        </Section>
      )}

      {/* Videos */}
      {videos.length > 0 && (
        <Section
          title={
            <span className="inline-flex items-center gap-2">
              <VideoIcon className="w-4 h-4" />
              Demo {videos.length === 1 ? 'video' : 'videos'}
            </span>
          }
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {videos.map((v, idx) => {
              const embed = toYouTubeEmbed(v.url);
              return embed ? (
                <div
                  key={idx}
                  className="aspect-video rounded-lg overflow-hidden border border-[var(--border-default)]"
                >
                  <iframe
                    src={embed}
                    className="w-full h-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    title={`${app.name ?? app.slug} demo ${idx + 1}`}
                  />
                </div>
              ) : (
                <a
                  key={idx}
                  href={v.url}
                  target="_blank"
                  rel="noreferrer"
                  className="px-4 py-3 rounded border border-[var(--border-default)] text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] break-all"
                >
                  {v.url}
                </a>
              );
            })}
          </div>
        </Section>
      )}

      {/* Screenshots */}
      {screenshots.length > 0 && (
        <Section
          title={`Screenshots (${screenshots.length})`}
        >
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {screenshots.map((s, idx) => (
              <a
                key={idx}
                href={s.url}
                target="_blank"
                rel="noreferrer"
                className="block aspect-[4/3] rounded-lg overflow-hidden border border-[var(--border-default)] bg-[var(--bg-card-hover)] hover:border-[var(--border-hover)] transition-colors"
              >
                <Image
                  src={s.url}
                  alt={s.alt_text ?? `Screenshot ${idx + 1}`}
                  width={480}
                  height={360}
                  className="w-full h-full object-cover"
                  unoptimized
                />
              </a>
            ))}
          </div>
        </Section>
      )}

      {/* Brands using */}
      {app.brands_using.length > 0 && (
        <Section
          title={`Brands using (${app.brands_using.length.toLocaleString()})`}
        >
          <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2">
            {app.brands_using.slice(0, brandLimit).map((b, idx) =>
              b.brand_logo_url ? (
                <div
                  key={idx}
                  title={b.brand_name ?? ''}
                  className="aspect-square rounded border border-[var(--border-default)] bg-white/5 flex items-center justify-center overflow-hidden"
                >
                  <Image
                    src={b.brand_logo_url}
                    alt={b.brand_name ?? ''}
                    width={80}
                    height={80}
                    className="w-full h-full object-contain p-1"
                    unoptimized
                  />
                </div>
              ) : null,
            )}
          </div>
          {brandLimit < app.brands_using.length && (
            <button
              type="button"
              onClick={() =>
                setBrandLimit((l) =>
                  Math.min(l + BRAND_BATCH, app.brands_using.length),
                )
              }
              className="mt-3 text-xs text-[var(--brand-green-primary)] hover:underline"
            >
              Show {Math.min(BRAND_BATCH, app.brands_using.length - brandLimit)} more
            </button>
          )}
        </Section>
      )}

      {/* Case studies */}
      {app.case_studies.length > 0 && (
        <Section title="Case studies">
          <div className="space-y-3">
            {app.case_studies.map((cs, idx) => (
              <a
                key={idx}
                href={cs.url ?? '#'}
                target="_blank"
                rel="noreferrer"
                className="block p-4 rounded-lg border border-[var(--border-default)] bg-[var(--bg-card-hover)]/40 hover:border-[var(--border-hover)] transition-colors"
              >
                <div className="text-sm text-[var(--text-primary)] mb-1">
                  {cs.title ?? 'Case study'}
                </div>
                {cs.url && (
                  <div className="text-xs text-[var(--text-tertiary)] truncate flex items-center gap-1">
                    <ExternalLink className="w-3 h-3" /> {cs.url}
                  </div>
                )}
              </a>
            ))}
          </div>
        </Section>
      )}
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div>
      <h3 className="text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-wider mb-3">
        {title}
      </h3>
      {children}
    </div>
  );
}
