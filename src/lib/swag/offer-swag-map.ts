/**
 * Maps partner names (from Airtable offers) to SWAG spec slugs.
 *
 * One SWAG per partner — every offer from a partner with a SWAG spec
 * gets the "See the SWAG" button, regardless of which specific offer
 * the brand is viewing.
 */

const PARTNER_TO_SWAG: Record<string, string> = {
  'aftersell': 'aftersell',
  'gorgias': 'gorgias',
  'klaviyo': 'klaviyo',
  'order editing': 'orderediting',
  'postscript': 'postscript',
  'postpilot': 'postpilot',
  'superfiliate': 'superfiliate',
  'videowise': 'videowise',
  'aix': 'aix',
}

export function getSwagSlugForPartner(partnerName: string): string | null {
  return PARTNER_TO_SWAG[partnerName.toLowerCase().trim()] ?? null
}
