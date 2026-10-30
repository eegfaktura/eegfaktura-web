// Parses a number typed in German notation. With a comma present, the comma is the decimal separator and
// dots are thousand separators ("1.234,56" -> 1234.56). Without a comma the input is read as before
// ("1.5" -> 1.5, "12" -> 12), so dot-only input keeps its meaning.
export const parseDecimal = (value: string): number => {
  const v = value.trim()
  return parseFloat(v.includes(",") ? v.replace(/\./g, "").replace(",", ".") : v)
}

// One number notation for the screen (platform#228): decimal comma, thousands dot ("1.234,56") - what Austrian users
// write and what parseDecimal reads back. Not "de-AT": current CLDR groups de-AT with a no-break space
// ("1 234,56"), which parseDecimal cannot read and which browsers and Node show differently.
// For the screen only: files and the API keep their own format (e.g. SEPA amounts with a dot).
const NUMBER_LOCALE = "de-DE"

// Strings (tariff values may arrive as text) are read like typed input. +0 turns -0 into 0 (261024-ca20).
export const formatNumber = (v: number | string, minFractionDigits = 0, maxFractionDigits = minFractionDigits): string =>
  ((typeof v === "string" ? parseDecimal(v) : v) + 0)
    .toLocaleString(NUMBER_LOCALE, {minimumFractionDigits: minFractionDigits, maximumFractionDigits: maxFractionDigits})

// Two decimals ("1.234,56"), e.g. euro amounts.
export const formatDecimal2 = (v: number): string => formatNumber(v, 2)

// Energy with three decimals: "185,337 kWh", "12.345,678 kWh".
export const formatKwh = (v: number): string => `${formatNumber(v, 3)} kWh`

// Tariff prices keep all their decimals: "12,5 Cent", "0,125 €".
export const formatCent = (v: number | string): string => `${formatNumber(v, 0, 6)} Cent`
export const formatTariffEuro = (v: number | string): string => `${formatNumber(v, 2, 6)} €`
