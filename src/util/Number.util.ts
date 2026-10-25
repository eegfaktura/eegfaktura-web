// Parses a number typed in German notation. With a comma present, the comma is the decimal separator and
// dots are thousand separators ("1.234,56" -> 1234.56). Without a comma the input is read as before
// ("1.5" -> 1.5, "12" -> 12), so dot-only input keeps its meaning.
export const parseDecimal = (value: string): number => {
  const v = value.trim()
  return parseFloat(v.includes(",") ? v.replace(/\./g, "").replace(",", ".") : v)
}

// Shows a number with two decimals in Austrian notation ("12,34"). For the screen only: files and the API keep
// their own format (e.g. SEPA amounts with a dot). +0 turns -0 into 0 (261024-ca20).
export const formatDecimal2 = (v: number): string =>
  (v + 0).toLocaleString("de-AT", {minimumFractionDigits: 2, maximumFractionDigits: 2})
