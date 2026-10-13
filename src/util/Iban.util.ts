// IBAN check digits (ISO 13616, mod 97): catches typos and swapped digits before the IBAN is saved
// and later rejected by the bank. Spaces are ignored; the country code and length are not checked
// against a country table.
export const isValidIban = (iban: string | null | undefined): boolean => {
  const s = (iban ?? "").replace(/\s/g, "").toUpperCase()
  if (!/^[A-Z]{2}\d{2}[A-Z0-9]{11,30}$/.test(s)) return false
  const digits = (s.slice(4) + s.slice(0, 4)).replace(/[A-Z]/g, c => String(c.charCodeAt(0) - 55))
  let rest = 0
  for (let i = 0; i < digits.length; i += 7) {
    rest = Number(String(rest) + digits.slice(i, i + 7)) % 97
  }
  return rest === 1
}
