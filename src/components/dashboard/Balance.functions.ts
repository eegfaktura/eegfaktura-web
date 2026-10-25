// Bilanzdifferenz: with complete energy data, Produktion = Eigendeckung + Überschuss — also with multiple
// participation, the producers deliver this community's share (checked on pilot data, 25.10.2026). A difference means
// energy data of single metering points is missing: negative → probably producers, positive → probably consumers.

// Below this the difference counts as rounding: values come with 3 decimals per metering point and quarter hour, so
// the residual grows with the period (0.001 kWh on a complete pilot day). At least 0.01 kWh, else 0.01 % of production.
export const BALANCE_MIN_TOLERANCE_KWH = 0.01
export const BALANCE_RELATIVE_TOLERANCE = 0.0001

export const BALANCE_HELP = "Bilanzdifferenz = Produktion − Eigendeckung − Überschuss. Bei vollständigen Energiedaten " +
  "ist sie 0 (sehr kleine Werte sind Rundung). Negativ: vermutlich fehlen Daten von Einspeisern; positiv: vermutlich " +
  "fehlen Daten von Beziehern. Für die jüngsten Tage ist eine Differenz normal, solange noch nicht alle Daten " +
  "eingetroffen sind."

export const BALANCE_LINE_COLOR = "#333333"

export const balanceOf = (v: { produced: number, distributed: number, unused: number }) =>
  v.produced - v.distributed - v.unused

export const isBalanced = (difference: number, produced: number) =>
  Math.abs(difference) < Math.max(BALANCE_MIN_TOLERANCE_KWH, Math.abs(produced) * BALANCE_RELATIVE_TOLERANCE)

export const formatKwh = (v: number) =>
  `${v.toLocaleString("de-AT", {minimumFractionDigits: 3, maximumFractionDigits: 3})} kWh`

export const balanceText = (difference: number, produced: number) =>
  isBalanced(difference, produced) ? "Bilanz ausgeglichen" : `Bilanzdifferenz ${formatKwh(difference)}`

// The period sum, only when every bar carries the difference (a report without surplus shows nothing, not a part).
export const periodBalance = (bars: { produced: number, balance?: number }[]) =>
  bars.length > 0 && bars.every(b => b.balance !== undefined)
    ? {difference: bars.reduce((s, b) => s + b.balance!, 0), produced: bars.reduce((s, b) => s + b.produced, 0)}
    : undefined
