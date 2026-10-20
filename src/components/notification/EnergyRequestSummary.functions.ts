import moment from "moment";
import {Metering} from "../../models/meteringpoint.model";
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
  skipped: { meteringPoint: string, reason: string }[]
  superseded: string[]
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

export const formatDay = (ms: number) => moment(ms).format("DD.MM.YYYY")

// The problem groups in display order; groups without metering points are left out.
export const summaryGroups = (s: EnergyRequestSummary): SummaryGroup[] => [
  {
    title: "Abgelehnt",
    lines: (s.rejected ?? []).map(r => ({meteringPoint: r.meteringPoint, detail: (r.codes ?? []).join(", ")})),
  },
  {
    title: "Keine Antwort",
    lines: (s.noAnswer ?? []).map(m => ({meteringPoint: m})),
  },
  {
    title: "Nicht angefordert",
    lines: (s.skipped ?? []).map(k => ({meteringPoint: k.meteringPoint, detail: SKIP_REASONS[k.reason] ?? k.reason})),
  },
  {
    title: "In einer späteren Anforderung erneut angefordert",
    lines: (s.superseded ?? []).map(m => ({meteringPoint: m})),
  },
].filter(g => g.lines.length > 0)

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
      if (!known || (known.meter.status !== 'ACTIVE' && m.status === 'ACTIVE')) {
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

// the name of a metering point, from its active entry if there are several
export const meterNames = (meters: Metering[]): Map<string, string> => {
  const names = new Map<string, string>()
  for (const m of [...meters].sort((x, y) => (x.status === 'ACTIVE' ? 1 : 0) - (y.status === 'ACTIVE' ? 1 : 0))) {
    if (m.equipmentName && m.equipmentName.length > 0) {
      names.set(m.meteringPoint, m.equipmentName)
    }
  }
  return names
}

export const meterCount = (n: number) => n === 1 ? "1 Zählpunkt" : `${n} Zählpunkte`
