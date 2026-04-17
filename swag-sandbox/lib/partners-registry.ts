import type { SwagSpec } from './swag-types'

// Import specs statically so they bundle with the client
import orderEditingSpec from '@/partners/orderediting.json'
import gorgiasSpec from '@/partners/gorgias.json'
import klaviyoSpec from '@/partners/klaviyo.json'
import aftersellSpec from '@/partners/aftersell.json'
import postscriptSpec from '@/partners/postscript.json'
import superfiliateSpec from '@/partners/superfiliate.json'
import postpilotSpec from '@/partners/postpilot.json'
import videowiseSpec from '@/partners/videowise.json'
import aixSpec from '@/partners/aix.json'

export const PARTNER_SPECS: Record<string, SwagSpec> = {
  orderediting: orderEditingSpec as unknown as SwagSpec,
  gorgias: gorgiasSpec as unknown as SwagSpec,
  klaviyo: klaviyoSpec as unknown as SwagSpec,
  aftersell: aftersellSpec as unknown as SwagSpec,
  postscript: postscriptSpec as unknown as SwagSpec,
  superfiliate: superfiliateSpec as unknown as SwagSpec,
  postpilot: postpilotSpec as unknown as SwagSpec,
  videowise: videowiseSpec as unknown as SwagSpec,
  aix: aixSpec as unknown as SwagSpec,
}

export const PARTNER_LIST = Object.values(PARTNER_SPECS).map((s) => ({
  slug: s.slug,
  name: s.partnerName,
}))

export function getSpec(slug: string): SwagSpec | null {
  return PARTNER_SPECS[slug] ?? null
}
