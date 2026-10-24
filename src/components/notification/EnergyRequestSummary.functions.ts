import moment from "moment";
import {Metering} from "../../models/meteringpoint.model";
import {EegNotification} from "../../models/eeg.model";
import {EegParticipant} from "../../models/members.model";
import {CheckedMeter} from "../participantPane/BillingCheck.functions";

// Summary of an energy data request (backend energyrequest.Summary, platform#173)
export interface RequestedMeter {
  meteringPoint: string
  from: number
  to: number
}

export interface EnergyRequestSummary {
  type: "ZUSAMMENFASSUNG_PT"
  runId: string
  from: number
  to: number
  requested: number
  accepted: RequestedMeter[]
  rejected: { meteringPoint: string, codes: string[] }[]
  noAnswer: string[]
  skipped: { meteringPoint: string, reason: string, until?: number }[]
  superseded: string[]
  // the current state of a still running request (smart re-request); a stored summary has no live
  live?: boolean
}

export interface SummaryLine {
  meteringPoint: string
  detail?: string
}

export interface SummaryGroup {
  title: string
  lines: SummaryLine[]
}

const SKIP_REASONS: Record<string, string> = {
  NOT_FOUND: "nicht gefunden",
  NOT_REGISTERED: "noch nicht registriert",
  NOT_ASSIGNED: "nicht zugeordnet",
  NO_ACTIVE_PERIOD: "ohne Aktivzeitraum",
  NOT_ACTIVE_IN_PERIOD: "im Zeitraum nicht aktiv",
}

// skip reasons with their own group
const COMPLETE = "COMPLETE"
const ALREADY_REQUESTED = "ALREADY_REQUESTED"

export const formatDay = (ms: number) => moment(ms).format("DD.MM.YYYY")

// a time of today as 14:32, of another day with the date
export const formatUntil = (ms: number, now = Date.now()) =>
  moment(ms).format(moment(ms).isSame(now, 'day') ? "HH:mm" : "DD.MM.YYYY HH:mm")

// The problem groups in display order, the complete metering points last; groups without metering points are left
// out. While the request runs, the metering points without an answer are still open.
export const summaryGroups = (s: EnergyRequestSummary, now = Date.now()): SummaryGroup[] => {
  const skipped = s.skipped ?? []
  return [
    {
      title: "Abgelehnt",
      lines: (s.rejected ?? []).map(r => ({meteringPoint: r.meteringPoint, detail: (r.codes ?? []).join(", ")})),
    },
    {
      title: s.live ? "Antwort noch offen" : "Keine Antwort",
      lines: (s.noAnswer ?? []).map(m => ({meteringPoint: m})),
    },
    {
      title: "Bereits angefordert",
      lines: skipped.filter(k => k.reason === ALREADY_REQUESTED)
        .map(k => ({meteringPoint: k.meteringPoint, detail: k.until ? `frei ab ${formatUntil(k.until, now)}` : undefined})),
    },
    {
      title: "Nicht angefordert",
      lines: skipped.filter(k => k.reason !== COMPLETE && k.reason !== ALREADY_REQUESTED)
        .map(k => ({meteringPoint: k.meteringPoint, detail: SKIP_REASONS[k.reason] ?? k.reason})),
    },
    {
      title: "In einer späteren Anforderung erneut angefordert",
      lines: (s.superseded ?? []).map(m => ({meteringPoint: m})),
    },
    {
      title: "Daten vollständig (nicht angefordert)",
      lines: skipped.filter(k => k.reason === COMPLETE).map(k => ({meteringPoint: k.meteringPoint})),
    },
  ].filter(g => g.lines.length > 0)
}

// The accepted metering points for the energy data check before billing (platform#148), each over the period the
// backend requested for it. The direction and the name come from the loaded metering points (the active entry first);
// a metering point that is not loaded cannot be checked and is listed instead of counting as complete.
export const acceptedMetersToCheck = (s: EnergyRequestSummary, participants: EegParticipant[]):
  { toCheck: CheckedMeter[], notCheckable: string[] } => {
  const byId = new Map<string, { meter: Metering, name: string }>()
  for (const p of participants) {
    const name = [p.firstname, p.lastname].filter(n => !!n).join(" ")
    for (const m of p.meters) {
      const known = byId.get(m.meteringPoint)
      if (!known || entryRank(m) > entryRank(known.meter)) {
        byId.set(m.meteringPoint, {meter: m, name})
      }
    }
  }
  const toCheck: CheckedMeter[] = []
  const notCheckable: string[] = []
  for (const a of s.accepted ?? []) {
    const e = byId.get(a.meteringPoint)
    if (!e) {
      notCheckable.push(a.meteringPoint)
      continue
    }
    toCheck.push({
      participantName: e.name,
      meteringPoint: a.meteringPoint,
      equipmentName: e.meter.equipmentName,
      direction: e.meter.direction,
      activeSince: moment(a.from).startOf('day').valueOf(),
      inactiveSince: moment(a.to).startOf('day').valueOf(),
    })
  }
  return {toCheck, notCheckable}
}

// Of several entries of a metering point (owner change, new registration) the active one counts, a not yet
// registered (INIT) one last. Used for the name and the data check, so both show the same entry.
const entryRank = (m: Metering) => m.status === 'ACTIVE' ? 2 : m.status === 'INIT' ? 0 : 1

// the name of a metering point, from the entry that counts
export const meterNames = (meters: Metering[]): Map<string, string> => {
  const chosen = new Map<string, Metering>()
  for (const m of meters) {
    const known = chosen.get(m.meteringPoint)
    if (!known || entryRank(m) > entryRank(known)) {
      chosen.set(m.meteringPoint, m)
    }
  }
  const names = new Map<string, string>()
  chosen.forEach((m, id) => {
    if (m.equipmentName && m.equipmentName.length > 0) names.set(id, m.equipmentName)
  })
  return names
}

// whether the list shows a still running energy request
export const hasLiveEntry = (notifications: EegNotification[]) =>
  notifications.some(n => n.message?.properties?.type === "ZUSAMMENFASSUNG_PT" && n.message.properties.live === true)

export const meterCount = (n: number) => n === 1 ? "1 Zählpunkt" : `${n} Zählpunkte`
