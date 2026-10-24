import moment from "moment";
import {Metering} from "../../models/meteringpoint.model";
import {BillingCheckResponse} from "../../models/billingCheck.model";
import {SyncEnergyMeter, SyncEnergyResult, SyncEnergySkipped} from "../../service/eeg.service";
import {CheckedMeter, evaluateBillingChecks, metersActiveInPeriod} from "../participantPane/BillingCheck.functions";
import {formatUntil} from "../notification/EnergyRequestSummary.functions";

// Smart re-request (konzept-smart-nachfordern): only the metering points with missing energy data are requested,
// each from its first to its last missing day.

export interface SmartPlan {
  checked: number              // metering points whose data could be checked
  missing: SyncEnergyMeter[]   // with their period from the first to the last missing day
  missingDays: number
  complete: string[]           // no gap: not requested, recorded as COMPLETE
  notChecked: SyncEnergyMeter[] // energystore failed or did not answer for them: full period, only if confirmed
}

// The entries billing-check can check for the selected metering points: registered and active in the period, by the
// same rules as the check before billing. All entries of a metering point count (owner change, new registration:
// the backend requests every entry over its own active part), also those of other members. Not registered or
// inactive ones have nothing to request in the period and are left out.
export const metersToCheck = (ids: string[], all: Metering[], start: Date, end: Date): CheckedMeter[] => {
  const selected = new Set(ids)
  return metersActiveInPeriod(all.filter(m => selected.has(m.meteringPoint)), "", start, end)
}

const day = (d: string) => moment(d, "YYYY-MM-DD").startOf('day').valueOf()

/**
 * The plan from the billing-check answer, per metering point over all its entries. A metering point with a gap is
 * requested from its first to its last missing day over its entries (local midnight of both days, like the dates
 * of the date picker; the backend cuts to the start and the end of the day and to each entry's active part). An
 * entry with a gap but without missing days (no value at all, or an older energystore) gets the request period.
 * A metering point counts as complete only if every entry is, and as not checked if one entry is not.
 */
export const smartPlan = (entries: CheckedMeter[], energy: BillingCheckResponse | { error: string }): SmartPlan => {
  // energystore answers in request order; entries beyond its answer are not checked
  const answered = 'error' in energy ? [] : entries.slice(0, energy.meters.length)
  const incomplete = 'error' in energy ? [] : evaluateBillingChecks(answered, {}, energy).completeness.incomplete
  const unchecked = new Set(entries.slice(answered.length).map(m => m.meteringPoint))

  const ids: string[] = []
  const direction = new Map<string, string>()
  for (const m of entries) {
    if (!direction.has(m.meteringPoint)) {
      ids.push(m.meteringPoint)
      direction.set(m.meteringPoint, m.direction)
    }
  }
  // per metering point with a gap: the period over its entries (undefined: the request period) and the days
  const gaps = new Map<string, { from?: number, to?: number, full: boolean, days: number }>()
  for (const i of incomplete) {
    const g = gaps.get(i.meter.meteringPoint) ?? {full: false, days: 0}
    const days = [...i.missingDays].sort()
    if (days.length === 0) {
      g.full = true
      g.days += moment(i.expectedEnd).startOf('day').diff(moment(i.expectedStart).startOf('day'), 'days') + 1
    } else {
      g.from = Math.min(g.from ?? Infinity, day(days[0]))
      g.to = Math.max(g.to ?? -Infinity, day(days[days.length - 1]))
      g.days += days.length
    }
    gaps.set(i.meter.meteringPoint, g)
  }

  const full = (id: string): SyncEnergyMeter => ({meter: id, direction: direction.get(id)!})
  const plan: SmartPlan = {checked: 0, missing: [], missingDays: 0, complete: [], notChecked: []}
  for (const id of ids) {
    const g = gaps.get(id)
    if (unchecked.has(id)) {
      plan.notChecked.push(full(id))
      continue
    }
    plan.checked++
    if (!g) {
      plan.complete.push(id)
      continue
    }
    plan.missingDays += g.days
    plan.missing.push(g.full ? full(id) : {...full(id), from: g.from, to: g.to})
  }
  return plan
}

// Energy data of today cannot exist yet, and billing-check counts today and later days as missing: Smart checks
// and requests up to yesterday (local midnight, like the dates of the date picker). Undefined: nothing before today.
export const smartPeriod = (start: Date, end: Date, now = Date.now()): { start: Date, end: Date, capped: boolean } | undefined => {
  const today = moment(now).startOf('day')
  if (start.getTime() >= today.valueOf()) return undefined
  if (end.getTime() < today.valueOf()) return {start, end, capped: false}
  return {start, end: today.subtract(1, 'day').toDate(), capped: true}
}

export const NOTHING_BEFORE_TODAY = "Für heute und spätere Tage gibt es noch keine Energiedaten, es wird nichts angefordert."

// the note for a period cut at yesterday
export const cappedNote = (end: Date) =>
  `Geprüft wird bis gestern (${moment(end).format("DD.MM.YYYY")}), für heute gibt es noch keine Energiedaten.`

// Counts with a dot as thousands separator, as in "2.380"
export const count = (n: number) => n.toLocaleString("de-DE")
const meters = (n: number) => n === 1 ? "1 Zählpunkt" : `${count(n)} Zählpunkte`
const metersDative = (n: number) => n === 1 ? "1 Zählpunkt" : `${count(n)} Zählpunkten`
const days = (n: number) => n === 1 ? "1 Tag" : `${count(n)} Tage`

export type SmartChoice = 'missing' | 'all'

export interface SmartConfirmation {
  message: string
  buttons: { text: string, role: SmartChoice }[]
}

export const NOTHING_TO_CHECK = "Keiner der gewählten Zählpunkte ist im Zeitraum aktiv, es wird nichts angefordert."
export const NOTHING_MISSING = "Für den Zeitraum sind alle Daten da, es wird nichts angefordert."

// The question before sending; undefined when nothing is to be requested.
// cappedTo: the period was cut at yesterday (smartPeriod)
export const smartConfirmation = (p: SmartPlan, cappedTo?: Date): SmartConfirmation | undefined => {
  const m = p.missing.length
  const n = p.notChecked.length
  if (m === 0 && n === 0) return undefined
  const parts: string[] = cappedTo ? [cappedNote(cappedTo)] : []
  if (p.checked > 0) {
    parts.push(m > 0
      ? `Von ${metersDative(p.checked)} fehlen bei ${count(m)} Daten (zusammen ${days(p.missingDays)}).`
      : `Bei ${metersDative(p.checked)} sind alle Daten da.`)
  }
  if (n === 0) {
    parts.push(m === 1 ? "Diesen jetzt anfordern?" : `Diese ${count(m)} jetzt anfordern?`)
    return {message: parts.join(" "), buttons: [{text: "Anfordern", role: 'missing'}]}
  }
  parts.push(`Bei ${metersDative(n)} konnte der Datenstand nicht geprüft werden. `
    + `${n === 1 ? "Soll er" : "Sollen sie"} für den ganzen Zeitraum angefordert werden?`)
  const buttons: SmartConfirmation['buttons'] = []
  if (m > 0) buttons.push({text: `Nur die ${count(m)} mit Lücken`, role: 'missing'})
  buttons.push({text: m > 0 ? `Alle ${count(m + n)} anfordern` : `${meters(n)} anfordern`, role: 'all'})
  return {message: parts.join(" "), buttons}
}

// The request for the chosen answer: the complete metering points go along so the summary lists them.
// The backend has no field for metering points left out unchecked; with 'missing' the note names them.
export const smartRequest = (p: SmartPlan, choice: SmartChoice): { meters: SyncEnergyMeter[], complete: string[], note?: string } => ({
  meters: choice === 'all' ? [...p.missing, ...p.notChecked] : p.missing,
  complete: p.complete,
  note: choice === 'missing' && p.notChecked.length > 0
    ? `${meters(p.notChecked.length)} ohne geprüften Datenstand ${p.notChecked.length === 1 ? "wurde" : "wurden"} nicht angefordert.`
    : undefined,
})

// The message after sending: 'sent' confirms with an optional detail, 'info' replaces the confirmation.
export const sendFeedback = (r: SyncEnergyResult, note?: string): { kind: 'sent' | 'info', text?: string } => {
  const detail = [alreadyRequestedInfo(r.skipped), note].filter(t => !!t).join(" ")
  if (r.requested === 0) {  // all skipped, e.g. requested in the last hour: nothing went to the grid operator
    return {kind: 'info', text: ["Es wurde nichts angefordert.", detail].filter(t => !!t).join(" ")}
  }
  return {kind: 'sent', text: detail || undefined}
}

export const entireConfirmation = (n: number) =>
  `Für die ganze Gemeinschaft werden ${meters(n)} für den ganzen Zeitraum angefordert. Jetzt anfordern?`

// After sending: the metering points the backend skipped because they were requested in the last hour
export const alreadyRequestedInfo = (skipped: SyncEnergySkipped[], now = Date.now()): string | undefined => {
  const locked = skipped.filter(s => s.reason === 'ALREADY_REQUESTED')
  if (locked.length === 0) return undefined
  const untils = locked.map(s => s.until).filter((u): u is number => !!u)
  const verb = locked.length === 1 ? "wurde" : "wurden"
  // the latest time: from then on all of them are free again
  const free = untils.length > 0
    ? `, ${locked.length === 1 ? "" : "alle "}wieder frei ab ${formatUntil(Math.max(...untils), now)}` : ""
  return `${meters(locked.length)} ${verb} in der letzten Stunde schon angefordert${free}.`
}
