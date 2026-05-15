// Maps a brand's interestedFunctions / currentObjectives onto the canonical
// listing tag vocabulary so the marketplace can rank listings by relevance.
// Both sides are small fixed vocabularies (20 functions, 10 objectives, 51
// canonical listing tags), so an explicit map is precise and maintainable —
// fuzzy token matching misses short tags like "ai".

export const FUNCTION_TAGS: Record<string, string[]> = {
  'Bundles & Upsells': ['bundles', 'upsell', 'aov'],
  'Product Discovery': ['search', 'merchandising', 'personalization'],
  'Landing Pages': ['design', 'content'],
  'Popups & Lead Capture': ['lead gen', 'forms', 'email'],
  'Discounts & Promos': ['discounts', 'gift cards'],
  'Email & SMS': ['email', 'sms'],
  'Loyalty & Referrals': ['loyalty', 'affiliate'],
  Subscriptions: ['subscriptions'],
  'Reviews & UGC': ['reviews', 'video'],
  'Help Desk & Chat': ['cx', 'chat'],
  'Returns & Exchanges': ['returns', 'wismo'],
  'Attribution & Ads': ['attribution', 'paid ads'],
  'Affiliate & Influencer': ['affiliate', 'influencer'],
  'SEO & Site Speed': ['seo'],
  'Shipping & Fulfillment': ['shipping', 'wismo'],
  'Inventory & Ops': ['inventory'],
  'Analytics & Dashboards': ['analytics'],
  'AI Tools': ['ai', 'automation'],
  'Themes & Site Builder': ['design', 'platform'],
  'Compliance & Localization': ['compliance', 'localization', 'tax'],
}

export const OBJECTIVE_TAGS: Record<string, string[]> = {
  Profitability: ['aov', 'payments'],
  Acquisition: ['paid ads', 'lead gen', 'seo'],
  Retention: ['loyalty', 'subscriptions', 'winback', 'cart recovery'],
  Conversion: ['conversion', 'cart recovery', 'personalization'],
  Experience: ['cx', 'chat', 'design'],
  Reporting: ['analytics', 'attribution'],
  'Artificial Intelligence': ['ai', 'automation'],
  Fulfillment: ['shipping', 'inventory', 'wismo'],
  Compliance: ['compliance', 'localization', 'tax'],
  Developer: ['platform', 'b2b'],
}

/** The set of listing tags a brand cares about, from their saved Inputs. */
export function brandInterestTags(
  interestedFunctions: string[] = [],
  currentObjectives: string[] = [],
): Set<string> {
  const out = new Set<string>()
  for (const f of interestedFunctions) for (const t of FUNCTION_TAGS[f] || []) out.add(t)
  for (const o of currentObjectives) for (const t of OBJECTIVE_TAGS[o] || []) out.add(t)
  return out
}

/** How many of a listing's tags intersect the brand's interest tags. */
export function relevanceScore(listingTags: string[], interestTags: Set<string>): number {
  if (interestTags.size === 0) return 0
  let n = 0
  for (const t of listingTags) if (interestTags.has(t)) n++
  return n
}
