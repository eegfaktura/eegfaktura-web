// Direct debit type of a member (platform#143): only CORE and B2B are collected by direct debit.
// NONE ("Kein SEPA") means no direct debit; an empty or unknown type (UNSET) is not collected either,
// because nobody chose it consciously — a debit needs a signed mandate. Used by the forms and the
// SEPA export alike.
export const debitInstrument = (debitType: string | undefined | null): 'CORE' | 'B2B' | 'NONE' | 'UNSET' => {
  const t = (debitType ?? '').trim().toUpperCase()
  return t === 'CORE' || t === 'B2B' || t === 'NONE' ? t : 'UNSET'
}

export const isDirectDebit = (sepaDirectDebit: string | null | undefined) => {
  const t = debitInstrument(sepaDirectDebit)
  return t === 'CORE' || t === 'B2B'
}

// SEPA mandate id (MndtId): max 35 characters of the restricted set, no blanks.
export const isValidMandateReference = (ref: string) => /^[A-Za-z0-9+?\/\-:().,']{1,35}$/.test(ref)

// platform#143: the member number is the suggested SEPA mandate reference. A reference is only
// filled in while the field is empty, or while it still holds an earlier suggestion that nobody
// changed by hand; a reference typed in, or already used for a direct debit, is never replaced.
// A member number that is no valid SEPA mandate id (blanks, umlauts, "_", > 35 characters), or that
// another member of the community already uses as mandate reference (unique per creditor id), is not
// suggested; an earlier suggestion that nobody changed is then cleared again (""), so no half-typed or
// foreign number stays behind. Returns the new value, or undefined when the field stays as it is.
export const suggestMandateReference = (
  current: string | null | undefined,
  participantNumber: string | null | undefined,
  lastSuggestion?: string,
  taken?: ReadonlySet<string>,
): string | undefined => {
  const cur = (current ?? "").trim()
  const nr = (participantNumber ?? "").trim()
  const untouched = cur === "" || (lastSuggestion !== undefined && cur === lastSuggestion)
  if (nr === "" || !isValidMandateReference(nr) || taken?.has(nr.toUpperCase())) {
    return untouched && cur !== "" ? "" : undefined
  }
  if (cur === nr) return undefined
  return untouched ? nr : undefined
}
