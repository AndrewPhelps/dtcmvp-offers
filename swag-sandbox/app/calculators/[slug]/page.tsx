import { notFound } from 'next/navigation'
import { getSpec, PARTNER_LIST } from '@/lib/partners-registry'
import SwagCalculator from '@/components/SwagCalculator'

export function generateStaticParams() {
  return PARTNER_LIST.map((p) => ({ slug: p.slug }))
}

export default async function CalculatorPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const spec = getSpec(slug)
  if (!spec) notFound()

  return <SwagCalculator spec={spec} />
}
