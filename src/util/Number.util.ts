// Parses a number typed in German notation. With a comma present, the comma is the decimal separator and
// dots are thousand separators ("1.234,56" -> 1234.56). Without a comma the input is read as before
// ("1.5" -> 1.5, "12" -> 12), so dot-only input keeps its meaning.
export const parseDecimal = (value: string): number => {
  const v = value.trim()
  return parseFloat(v.includes(",") ? v.replace(/\./g, "").replace(",", ".") : v)
}
