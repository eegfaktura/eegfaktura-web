// Direct debit type of a member (platform#143): NONE ("Kein SEPA") means no direct debit, an empty
// or unknown type counts as CORE. Used by the forms and the SEPA export alike.
export const debitInstrument = (debitType: string | undefined | null): 'CORE' | 'B2B' | 'NONE' => {
  const t = (debitType ?? '').trim().toUpperCase()
  return t === 'NONE' || t === 'B2B' ? t : 'CORE'
}

export const isDirectDebit = (sepaDirectDebit: string | null | undefined) =>
  debitInstrument(sepaDirectDebit) !== 'NONE'

// SEPA mandate id (MndtId): max 35 characters of the restricted set, no blanks.
export const isValidMandateReference = (ref: string) => /^[A-Za-z0-9+?\/\-:().,']{1,35}$/.test(ref)

// platform#143: the member number is the suggested SEPA mandate reference. A reference is only
// filled in while the field is empty, or while it still holds an earlier suggestion that nobody
// changed by hand; a reference typed in, or already used for a direct debit, is never replaced.
// A member number that is no valid SEPA mandate id (blanks, umlauts, "_", > 35 characters) is not
// suggested. Returns the new value, or undefined when the field stays as it is.
export const suggestMandateReference = (
  current: string | null | undefined,
  participantNumber: string | null | undefined,
  lastSuggestion?: string,
): string | undefined => {
  const cur = (current ?? "").trim()
  const nr = (participantNumber ?? "").trim()
  if (nr === "" || cur === nr || !isValidMandateReference(nr)) return undefined
  if (cur === "" || (lastSuggestion !== undefined && cur === lastSuggestion)) return nr
  return undefined
}
