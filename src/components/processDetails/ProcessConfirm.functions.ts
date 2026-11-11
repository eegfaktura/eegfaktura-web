import moment from "moment";
import {Metering} from "../../models/meteringpoint.model";
import {meterCount} from "../notification/EnergyRequestSummary.functions";

// Summaries for the confirmation before an EDA process goes to the grid operator (platform#228 step 3): what is sent,
// for which metering point(s), with which period or value. Text only, the request itself is unchanged.

const MAX_LISTED = 5

const date = (d: Date) => moment(d).format("DD.MM.YYYY")

// the metering points by number; a long selection names the first ones and counts the rest
export const meterList = (meteringPoints: string[]) => meteringPoints.length <= MAX_LISTED
  ? meteringPoints.join(", ")
  : `${meteringPoints.slice(0, MAX_LISTED).join(", ")} und ${meteringPoints.length - MAX_LISTED} weitere`

const forMeters = (meteringPoints: string[]) => meteringPoints.length === 1
  ? `für den Zählpunkt ${meteringPoints[0]}`
  : `für ${meterCount(meteringPoints.length)} (${meterList(meteringPoints)})`

export const partFactSummary = (meters: Metering[], partFact: number) => meters.length === 1
  ? `Teilnahmefaktor für den Zählpunkt ${meters[0].meteringPoint} von ${meters[0].partFact} % auf ${partFact} % `
    + `ändern? Die Änderung geht an den Netzbetreiber.`
  : `Teilnahmefaktor für ${meterCount(meters.length)} auf ${partFact} % ändern? Die Änderung geht an den Netzbetreiber. `
    + `(${meterList(meters.map(m => `${m.meteringPoint}: bisher ${m.partFact} %`))})`

export const requestValuesSummary = (meters: Metering[], start: Date, end: Date, entire: boolean) => {
  const period = `${date(start)} – ${date(end)}`
  return entire
    ? `Energiedaten für die ganze Gemeinschaft (${meterCount(meters.length)}) für ${period} beim Netzbetreiber anfordern?`
    : `Energiedaten ${forMeters(meters.map(m => m.meteringPoint))} für ${period} beim Netzbetreiber anfordern?`
}

// the CMRevoke schema allows 50 characters in Reason; the backend refuses a longer one
export const REVOKE_REASON_MAX = 50

// the reason as the backend sends it: format characters (U+200B, U+FEFF, U+202E …) and what XML 1.0 does not allow
// are dropped, control characters and runs of white space become one space, ends trimmed
export const cleanRevokeReason = (raw?: string) => (raw ?? "")
  .replace(/[\p{Cf}\uFFFE\uFFFF\uD800-\uDFFF]/gu, "")
  .replace(/[\u0000-\u001f\u007f-\u009f\s]+/g, " ")
  .trim()

// its length as the backend and CMRevoke count it: characters (code points), not UTF-16 units
export const revokeReasonLength = (raw?: string) => [...cleanRevokeReason(raw)].length

export const revokeSummary = (meters: Metering[], consentEnd: Date, reason?: string) =>
  `Soll die Datenfreigabe ${forMeters(meters.map(m => m.meteringPoint))} beim Netzbetreiber aufgehoben werden? `
  + `Ende der Datenfreigabe: ${date(consentEnd)}.`
  + (reason ? ` Begründung: „${reason}“.` : "")

export const registerSummary = (meteringPoint: string, member: string) =>
  `Zählpunkt ${meteringPoint} (${member}) online beim Netzbetreiber anmelden?`

export const podListSummary = (operatorId: string) =>
  `Zählpunktliste beim Netzbetreiber ${operatorId} anfordern?`
