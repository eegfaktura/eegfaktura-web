// platform#143: the member number is the suggested SEPA mandate reference. A reference is only
// filled in while the field is empty, or while it still holds an earlier suggestion that nobody
// changed by hand; a reference typed in, or already used for a direct debit, is never replaced.
// Returns the new value, or undefined when the field stays as it is.
export const suggestMandateReference = (
  current: string | null | undefined,
  participantNumber: string | null | undefined,
  lastSuggestion?: string,
): string | undefined => {
  const cur = (current ?? "").trim()
  const nr = (participantNumber ?? "").trim()
  if (nr === "" || cur === nr) return undefined
  if (cur === "" || (lastSuggestion !== undefined && cur === lastSuggestion)) return nr
  return undefined
}

// An empty direct debit type counts as CORE (platform#143); only NONE ("Kein SEPA") means no debit.
export const isDirectDebit = (sepaDirectDebit: string | null | undefined) =>
  (sepaDirectDebit ?? "").trim().toUpperCase() !== "NONE"
