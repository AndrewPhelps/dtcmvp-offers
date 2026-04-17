import type { SwagSpec, BrandProfile } from './swag-types'
import type { SwagResults } from './swag-types'
import { fmtMoney, fmtMoneyCompact } from './format'

function buildPromptText(
  spec: SwagSpec,
  profile: BrandProfile,
  results: SwagResults
): string {
  const r = results.hundred
  const benefitLines = r.benefits
    .map((b) => `- ${b.label}: ${fmtMoney(b.annualValue)}/yr`)
    .join('\n')

  const bookingUrl = `https://offers.dtcmvp.com/offers/${spec.slug}`

  return `I'm ${profile.contactName || 'evaluating tools'} from ${profile.brandName} (${profile.primaryCategory !== 'Other' ? profile.primaryCategory + ', ' : ''}${profile.annualOrders.toLocaleString()} orders/yr, ${fmtMoney(profile.aov)} AOV). I'm evaluating ${spec.partnerName}, ${spec.tagline.toLowerCase()}.

A dtcmvp SWAG analysis estimates ${fmtMoneyCompact(r.totalAnnualValue)}/yr in potential impact for my store, with a break-even ceiling of ${fmtMoney(r.maxMonthlyPrice)}/mo at my ${profile.targetRoiMultiple}x ROI target. The value comes from:
${benefitLines}

I need your help with three things:

1. Search Reddit, the Shopify community, G2, and any forums for honest merchant reviews of ${spec.partnerName}. What are real users saying about results, implementation, and whether the claims hold up?

2. Based on what you know about my business, does this make sense for us right now? What would you prioritize or deprioritize?

3. If this looks promising, I can book a call with ${spec.partnerName} through dtcmvp at ${bookingUrl}. What questions should I bring to that call to validate the ROI estimate?`
}

export type AiPlatform = 'claude' | 'chatgpt' | 'gemini'

export const AI_PLATFORMS: { id: AiPlatform; name: string; icon: string }[] = [
  { id: 'claude', name: 'Claude', icon: 'claude' },
  { id: 'chatgpt', name: 'ChatGPT', icon: 'chatgpt' },
  { id: 'gemini', name: 'Gemini', icon: 'gemini' },
]

export function buildAiUrl(
  platform: AiPlatform,
  spec: SwagSpec,
  profile: BrandProfile,
  results: SwagResults
): string {
  const prompt = buildPromptText(spec, profile, results)
  const encoded = encodeURIComponent(prompt)

  switch (platform) {
    case 'claude':
      return `https://claude.ai/new?q=${encoded}`
    case 'chatgpt':
      return `https://chat.openai.com/?q=${encoded}`
    case 'gemini':
      return `https://google.com/search?udem=50&aep=11&q=${encoded}`
  }
}
