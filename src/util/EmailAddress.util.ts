/**
 * Shared e-mail address rule of the eegfaktura suite (backend, eda-xp,
 * billing, web): per ';'-separated part — outer whitespace trimmed
 * (JS trim() covers NBSP), ASCII local part, TLD of at least two
 * letters, no TLD allowlist. Canonical storage format: parts joined
 * with ';' and no spaces.
 */
export const EMAIL_PART_PATTERN = /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/i

/** react-hook-form pattern for a ';'-separated address list (no spaces). */
export const EMAIL_LIST_PATTERN =
  /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}(?:;[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,})*$/i

/** Trim each ';'-part, drop empties, re-join with ';' (no spaces). */
export const normalizeEmailList = (raw?: string | null): string =>
  (raw ?? "")
    .split(";")
    .map(p => p.trim())
    .filter(p => p.length > 0)
    .join(";")

/**
 * True when the (normalized) list is well-formed. An empty value is
 * valid — a member without an e-mail address is not an error.
 */
export const isValidEmailList = (raw?: string | null): boolean => {
  const normalized = normalizeEmailList(raw)
  if (normalized === "") return true
  return normalized.split(";").every(p => EMAIL_PART_PATTERN.test(p))
}
