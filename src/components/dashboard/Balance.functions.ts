// Bilanzdifferenz: with complete energy data, Produktion = Eigendeckung + Überschuss (checked on pilot data
// 25.10.2026, also for one EEG with multiple participation; production check open, platform#220). A difference means
// energy data of single metering points is missing: negative → probably producers, positive → probably consumers.

// Below this the difference counts as rounding: values come with 3 decimals per metering point and quarter hour, so
// the residual grows with the length of the period (0.001 kWh on a complete pilot day). 0.01 kWh per day keeps a
// tenfold margin and still shows a producer missing for a day in a year view.
export const BALANCE_TOLERANCE_KWH_PER_DAY = 0.01

export const BALANCE_HELP = "Bilanzdifferenz = Produktion − Eigendeckung − Überschuss. Bei vollständigen Energiedaten " +
  "ist sie 0 (sehr kleine Werte sind Rundung). Negativ: vermutlich fehlen Daten von Einspeisern; positiv: vermutlich " +
  "fehlen Daten von Beziehern. Für die jüngsten Tage ist eine Differenz normal, solange noch nicht alle Daten " +
  "eingetroffen sind."

export const BALANCE_LINE_COLOR = "#333333"

export const balanceOf = (v: { produced: number, distributed: number, unused: number }) =>
  v.produced - v.distributed - v.unused

export const isBalanced = (difference: number, days: number) =>
  Math.abs(difference) < BALANCE_TOLERANCE_KWH_PER_DAY * Math.max(1, days)

// Days of a load-curve bar from its name ("D:..." day, "W:..." week, "M:..." month; upper bound for a month).
export const daysOfBar = (name: string) => {
  switch (name.split(':')[0]) {
    case 'W': return 7
    case 'M': return 31
    default: return 1
  }
}

export const formatKwh = (v: number) =>
  `${v.toLocaleString("de-AT", {minimumFractionDigits: 3, maximumFractionDigits: 3})} kWh`

export const balanceText = (difference: number, days: number) =>
  isBalanced(difference, days) ? "Bilanz ausgeglichen" : `Bilanzdifferenz ${formatKwh(difference)}`

// The period sum, only when every bar carries the difference (a report without surplus shows nothing, not a part).
export const periodBalance = (bars: { balance?: number, days?: number }[]) =>
  bars.length > 0 && bars.every(b => b.balance !== undefined)
    ? {difference: bars.reduce((s, b) => s + b.balance!, 0), days: bars.reduce((s, b) => s + (b.days ?? 1), 0)}
    : undefined

// For the curve: rounded to the shown 3 decimals, so a balanced quarter hour reads 0 and not "-0.000".
export const roundKwh = (v: number) => Math.round(v * 1000) / 1000 || 0
