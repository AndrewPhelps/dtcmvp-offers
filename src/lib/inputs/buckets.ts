// Standardized numeric buckets. A raw answer (emailListSize = 67_000) maps to a
// stable band label ("25k-100k") so partners can express thresholds against a
// shared vocabulary regardless of how granular the brand's own number is.

export type Bucket = {
  label: string
  min: number // inclusive
  max: number // exclusive (Infinity for the open-ended top band)
}

function bands(edges: number[], label: (lo: number, hi: number) => string): Bucket[] {
  const bounds = [...edges, Infinity]
  const out: Bucket[] = []
  for (let i = 0; i < bounds.length - 1; i++) {
    out.push({ min: bounds[i], max: bounds[i + 1], label: label(bounds[i], bounds[i + 1]) })
  }
  return out
}

const k = (n: number): string => {
  if (n >= 1_000_000) return `${n / 1_000_000}M`
  if (n >= 1_000) return `${n / 1_000}k`
  return String(n)
}

const countLabel = (lo: number, hi: number) =>
  lo === 0 ? `<${k(hi)}` : hi === Infinity ? `${k(lo)}+` : `${k(lo)}-${k(hi)}`

const dollarLabel = (lo: number, hi: number) =>
  lo === 0 ? `<$${k(hi)}` : hi === Infinity ? `$${k(lo)}+` : `$${k(lo)}-${k(hi)}`

const pct = (n: number): string => `${Math.round(n * 100)}%`
const pctLabel = (lo: number, hi: number) =>
  lo === 0 ? `<${pct(hi)}` : hi === Infinity ? `${pct(lo)}+` : `${pct(lo)}-${pct(hi)}`

// Keyed by BrandProfile numeric field name.
export const BUCKETS: Record<string, Bucket[]> = {
  annualOrders: bands([0, 1_000, 10_000, 50_000, 250_000, 1_000_000], countLabel),
  aov: bands([0, 25, 50, 100, 200, 500], dollarLabel),
  avgCostPerItem: bands([0, 10, 25, 50, 100, 250], dollarLabel),
  returnRate: bands([0, 0.05, 0.1, 0.2, 0.35], pctLabel),
  emailListSize: bands([0, 1_000, 5_000, 25_000, 100_000, 500_000], countLabel),
  smsListSize: bands([0, 1_000, 5_000, 25_000, 100_000, 500_000], countLabel),
  monthlyWebTraffic: bands([0, 10_000, 50_000, 250_000, 1_000_000, 5_000_000], countLabel),
}

/** Map a raw numeric value to its bucket label, or null if no bucket fits. */
export function toBucket(value: number, buckets: Bucket[]): string | null {
  if (!Number.isFinite(value)) return null
  const hit = buckets.find((b) => value >= b.min && value < b.max)
  return hit ? hit.label : null
}
