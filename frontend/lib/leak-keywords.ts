export const CUSTOM_KEYWORDS_STORAGE_KEY = "projectos_context_leak_keywords"

export function normalizeLeakKeywords(items: unknown) {
  if (!Array.isArray(items)) return []
  return items
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter(Boolean)
}
