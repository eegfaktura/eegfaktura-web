// Bilanzdifferenz: with complete energy data, Produktion = Eigendeckung + Überschuss — also with multiple
// participation, the producers deliver this community's share (checked on pilot data, 25.10.2026). A difference means
// energy data of single metering points is missing: negative → probably producers, positive → probably consumers.

// Below this the difference counts as rounding (values come with 3 decimals per metering point).
export const BALANCE_TOLERANCE_KWH = 0.01

export const BALANCE_HELP = "Bilanzdifferenz = Produktion − Eigendeckung − Überschuss. Bei vollständigen Energiedaten 0 " +
  "(kleine Werte sind Rundung). Negativ: vermutlich fehlen Daten von Einspeisern; positiv: vermutlich fehlen Daten " +
  "von Beziehern."

export const balanceOf = (v: { produced: number, distributed: number, unused: number }) =>
  v.produced - v.distributed - v.unused

export const isBalanced = (difference: number) => Math.abs(difference) < BALANCE_TOLERANCE_KWH

const kwh = (v: number) => `${v.toLocaleString("de-AT", {minimumFractionDigits: 3, maximumFractionDigits: 3})} kWh`

export const balanceText = (difference: number) =>
  isBalanced(difference) ? "Bilanz ausgeglichen" : `Bilanzdifferenz ${kwh(difference)}`
