// Per Sean's preference + dtcmvp brand convention: tags are all lowercase,
// hyphens become spaces, no acronym-uppercasing. Examples:
//   "workflow-automation" -> "workflow automation"
//   "ai" -> "ai"
//   "klaviyo" -> "klaviyo"

function normalizeTag(slugTag) {
  if (!slugTag) return '';
  return String(slugTag).toLowerCase().trim().replace(/-+/g, ' ').replace(/\s+/g, ' ');
}

function normalizeTags(tags) {
  if (!Array.isArray(tags)) return [];
  return [...new Set(tags.map(normalizeTag).filter(Boolean))];
}

module.exports = { normalizeTag, normalizeTags };
