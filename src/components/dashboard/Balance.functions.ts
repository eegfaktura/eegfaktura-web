import {formatKwh} from "../../util/Number.util";

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

// Warning colour of an unbalanced value, darker than the EVU red of the bars.
export const BALANCE_WARN_COLOR = "#B71C1C"

export const balanceOf = (v: { produced: number, distributed: number, unused: number }) =>
  v.produced - v.distributed - v.unused

export const isBalanced = (difference: number, days: number) =>
  Math.abs(difference) < BALANCE_TOLERANCE_KWH_PER_DAY * Math.max(1, days)

// Days of a load-curve bar from its name ("D:..." day, "W:..." week, "M:..." month; upper bound for a month).
// The hourly report of the "Tagesverlauf" card has no names (energystore IntraDay): one day.
export const daysOfBar = (name: string | undefined) => {
  switch ((name ?? "").split(':')[0]) {
    case 'W': return 7
    case 'M': return 31
    default: return 1
  }
}

export {formatKwh}

// marked: number of bars that do not balance; a period with such a bar is not "ausgeglichen", even if the signed
// differences of its bars cancel out (missing producer data on one day, missing consumer data on another).
export const balanceText = (difference: number, days: number, marked = 0) =>
  isBalanced(difference, days) && marked === 0
    ? "Bilanz ausgeglichen"
    : `Bilanzdifferenz ${formatKwh(difference)}${marked > 0 ? ` (${marked} Balken auffällig)` : ""}`

// Bars whose difference is more than rounding, by their axis name (marked red under the bar).
export const unbalancedBars = (bars: { name: string, balance?: number, days?: number }[]) =>
  new Set(bars.filter(b => b.balance !== undefined && !isBalanced(b.balance, b.days ?? 1)).map(b => b.name))

// The value of one bar in the chart tooltip.
export const balanceTooltip = (difference: number, days: number) =>
  isBalanced(difference, days) ? "ausgeglichen" : formatKwh(difference)

// The period sum, only when every bar carries the difference (a report without surplus shows nothing, not a part),
// with the number of bars that do not balance.
export const periodBalance = (bars: { name: string, balance?: number, days?: number }[]) =>
  bars.length > 0 && bars.every(b => b.balance !== undefined)
    ? {difference: bars.reduce((s, b) => s + b.balance!, 0), days: bars.reduce((s, b) => s + (b.days ?? 1), 0),
       marked: unbalancedBars(bars).size}
    : undefined
