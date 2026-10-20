import moment from "moment";

// Summary of an energy data request (backend energyrequest.Summary, platform#173)
export interface EnergyRequestSummary {
  type: "ZUSAMMENFASSUNG_PT"
  runId: string
  from: number
  to: number
  requested: number
  complete: number
  rejected: { meteringPoint: string, codes: string[] }[]
  noAnswer: string[]
  incomplete: { meteringPoint: string, dataFrom?: number, dataTo?: number }[]
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

// a delivery ends at the start of the next day (exclusive): show the last day it covers
const lastDataDay = (dataTo: number) => formatDay(dataTo - 1)

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
    title: "Angenommen, aber Daten unvollständig",
    lines: (s.incomplete ?? []).map(i => ({
      meteringPoint: i.meteringPoint,
      detail: i.dataFrom && i.dataTo ? `Daten ${formatDay(i.dataFrom)} – ${lastDataDay(i.dataTo)}` : "keine Daten",
    })),
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
