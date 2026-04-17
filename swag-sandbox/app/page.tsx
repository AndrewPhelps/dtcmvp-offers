import Link from 'next/link'
import { PARTNER_LIST } from '@/lib/partners-registry'

export default function Home() {
  return (
    <main className="min-h-screen px-6 py-16 max-w-6xl mx-auto">
      <header className="mb-16">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-2 h-2 rounded-full bg-accent-green" />
          <span className="text-xs uppercase tracking-widest text-text-muted font-grotesk">
            dtcmvp · SWAG directory
          </span>
        </div>
        <h1 className="text-5xl font-bold font-grotesk mb-4 text-balance">
          Shopify app ROI,{' '}
          <span className="text-accent-green">SWAGged by dtcmvp.</span>
        </h1>
        <p className="text-lg text-text-secondary max-w-2xl font-grotesk">
          First-party ROI analysis for every Shopify app worth considering.
          Point at a website, generate a SWAG, see the numbers.
        </p>
      </header>

      <section>
        <h2 className="text-sm uppercase tracking-widest text-text-muted font-grotesk mb-6">
          SWAGs ({PARTNER_LIST.length})
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {PARTNER_LIST.map((p) => (
            <Link
              key={p.slug}
              href={`/calculators/${p.slug}`}
              className="metric-card block no-underline"
            >
              <h3 className="text-xl font-grotesk font-semibold text-text-primary mb-1">
                {p.name}
              </h3>
              <span className="text-xs text-accent-blue font-mono">/calculators/{p.slug}</span>
            </Link>
          ))}
        </div>
      </section>

      <footer className="mt-24 pt-8 border-t border-border">
        <p className="text-xs text-text-muted font-grotesk">
          SWAG admin sandbox · add partners via /generate-swag skill
        </p>
      </footer>
    </main>
  )
}
