import moment from "moment";
import {EegParticipant} from "../../models/members.model";
import {activeMetersInPeriod, CheckedMeter} from "../participantPane/BillingCheck.functions";

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

// The accepted metering points as the energy data check before billing (platform#148) sees them in the requested
// period: same active periods, same completeness rule.
export const acceptedMetersToCheck = (s: EnergyRequestSummary, participants: EegParticipant[]): CheckedMeter[] => {
  const accepted = new Set((s.accepted ?? []).map(m => m.meteringPoint))
  return activeMetersInPeriod(participants, new Date(s.from), new Date(s.to))
    .filter(m => accepted.has(m.meteringPoint))
}
