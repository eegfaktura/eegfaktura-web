import {EegTariff, JoiningFeeState} from "../models/eeg.model";
import {EegParticipant} from "../models/members.model";
import {isActiveMeter} from "../components/participantPane/memberFilter.functions";
import {parseDecimal} from "./Number.util";

// One-time joining fee of a membership fee tariff (platform#217). billing charges it with the member's first final
// energy billing in the community; the rules are billing's, web only shows, warns and passes data on.

const percent = (v: unknown): number => typeof v === "string" ? parseDecimal(v) || 0 : Number(v ?? 0) || 0

/** A membership fee tariff with a joining fee above 0. */
export const hasJoiningFee = (tariff?: EegTariff): boolean =>
  !!tariff && tariff.type === "EEG" && Number(tariff.joiningFee ?? 0) > 0

// The VAT rates above 0 % a tariff puts on documents: its own rate (energy, membership fee, a consumer's metering
// point fee) and the metering point fee rate of a producer tariff.
const vatRates = (t: EegTariff): number[] => [
  t.useVat ? percent(t.vatInPercent) : 0,
  t.type === "EZP" && t.useMeteringPointFee ? percent(t.meteringPointVat) : 0,
].filter(r => r > 0)

/**
 * The joining fee's VAT rate is above 0 % and no tariff of the community uses it (energy, metering point fee and
 * membership fee rates; the edited tariff with its unsaved values). An invoice can hold at most two rates above 0 %,
 * a third one stops the billing run. Only a warning: saving stays possible (decision 2026-10-25).
 */
export const joiningFeeVatUnusual = (tariff: EegTariff, tariffs: EegTariff[]): boolean => {
  if (!hasJoiningFee(tariff) || !tariff.joiningFeeUseVat) return false
  const rate = percent(tariff.joiningFeeVatInPercent)
  if (rate <= 0) return false
  const used = [tariff, ...tariffs.filter(t => t.id !== tariff.id)].flatMap(vatRates)
  return !used.includes(rate)
}

/**
 * The active members (an active metering point, the member list's "Aktive" rule) with this membership fee tariff that
 * have no final document with energy in eegfaktura yet: they get the joining fee with their next final billing.
 * Members whose fee was recorded as paid outside eegfaktura get none and do not count.
 */
export const membersNotYetEnergyBilled = (participants: EegParticipant[], tariffId: string,
                                          state: JoiningFeeState[]): number => {
  const billed = new Set(state.filter(s => s.energyBilled || s.paidExternally).map(s => s.participantId.toLowerCase()))
  return participants.filter(p => p.tariffId === tariffId
    && (p.meters ?? []).some(isActiveMeter)
    && !billed.has(p.id.toLowerCase())).length
}

/** The member's entry in billing's joiningFeeState; a member without a final document has none. */
export const joiningFeeStateOf = (state: JoiningFeeState[], participantId: string): JoiningFeeState | undefined =>
  state.find(s => s.participantId.toLowerCase() === participantId.toLowerCase())

/**
 * Hint at the member's tariff (decision 2026-10-27): the member was billed with energy already, was never charged a
 * joining fee, and the chosen tariff has one — billing will not charge it automatically any more (it can be requested,
 * see joiningFeeActions). Not when the fee is requested already or was paid outside eegfaktura. Assigning stays possible.
 */
export const showJoiningFeeHint = (state: JoiningFeeState | undefined, tariff?: EegTariff): boolean =>
  hasJoiningFee(tariff) && !!state?.energyBilled && !state.joiningFee && !state.requested && !state.paidExternally

// Status of a member's joining fee (extension 2026-10-27), in this order: a final document with the fee wins, then a
// payment recorded as made outside eegfaktura, then the tariff (no fee: nothing will be charged, also not a request),
// then a request for the next final run, then whether the member was billed with energy already.
export type JoiningFeeStatus =
  | { kind: "BILLED", documentNumber: string, documentDate: string }
  | { kind: "PAID_EXTERNALLY", paidOn: string, note: string | null }
  | { kind: "NO_FEE" }
  | { kind: "REQUESTED" }
  | { kind: "NOT_BILLED" }
  | { kind: "OPEN" }

export const joiningFeeStatus = (state: JoiningFeeState | undefined, tariff?: EegTariff): JoiningFeeStatus => {
  if (state?.joiningFee) return {kind: "BILLED", ...state.joiningFee}
  if (state?.paidExternally) return {kind: "PAID_EXTERNALLY", paidOn: state.paidExternally.paidOn, note: state.paidExternally.note}
  if (!hasJoiningFee(tariff)) return {kind: "NO_FEE"}
  if (state?.requested) return {kind: "REQUESTED"}
  return state?.energyBilled ? {kind: "NOT_BILLED"} : {kind: "OPEN"}
}

/** "2026-01-15" -> "15.01.2026" */
export const formatIsoDate = (iso: string): string => {
  const [y, m, d] = iso.substring(0, 10).split("-")
  return d && m && y ? `${d}.${m}.${y}` : iso
}

/** The status texts of the concept (member details; the backend writes the same into the export). */
export const joiningFeeStatusText = (status: JoiningFeeStatus): string => {
  switch (status.kind) {
    case "BILLED":
      return `verrechnet mit ${status.documentNumber} vom ${formatIsoDate(status.documentDate)}`
    case "PAID_EXTERNALLY":
      return `außerhalb bezahlt am ${formatIsoDate(status.paidOn)}` + (status.note ? ` (${status.note})` : "")
    case "REQUESTED":
      return "zur Verrechnung im nächsten Abrechnungslauf vorgemerkt"
    case "OPEN":
      return "offen – wird mit der ersten Energieabrechnung verrechnet"
    case "NOT_BILLED":
      return "nicht verrechnet – Mitglied wurde schon abgerechnet"
    case "NO_FEE":
      return "kein Tarif mit Beitrittsgebühr"
  }
}

export interface JoiningFeeActions {
  // „Beitrittsgebühr nachverrechnen“: never charged, not paid outside, not requested yet, the member's tariff has a fee
  request: boolean
  // „Vormerkung zurücknehmen“: requested and not charged yet
  withdraw: boolean
  // „Außerhalb bezahlt erfassen“: never charged and not requested (both exclude each other)
  recordPaid: boolean
  // correct or remove the recorded payment: recorded and not charged yet
  changePaid: boolean
}

/** What an EEG admin may do with the member's joining fee; billing checks the same and answers 409 after charging. */
export const joiningFeeActions = (state: JoiningFeeState | undefined, tariff?: EegTariff): JoiningFeeActions => {
  const billed = !!state?.joiningFee
  const requested = !!state?.requested
  const paid = !!state?.paidExternally
  return {
    request: !billed && !paid && !requested && hasJoiningFee(tariff),
    withdraw: !billed && requested,
    recordPaid: !billed && !requested && !paid,
    changePaid: !billed && paid,
  }
}

export const JOINING_FEE_EXPORT_WITHOUT_BILLING =
  "Die Abrechnung ist nicht erreichbar: Der Export enthält alle Mitglieder, die Spalte „Beitrittsgebühr Status“ bleibt aber leer."

/**
 * Member export (decision 2026-10-27, web orchestrates): billing's joiningFeeState goes to the backend with the export
 * call. When billing fails, the export still runs without it and the user is told the column stays empty.
 */
export const exportMasterdataWithJoiningFees = async <T>(
  fetchState: () => Promise<JoiningFeeState[]>,
  exportMasterdata: (state?: JoiningFeeState[]) => Promise<T>,
  billingUnavailable: () => void,
): Promise<T> => {
  let state: JoiningFeeState[] | undefined
  try {
    state = await fetchState()
  } catch {
    billingUnavailable()
  }
  return exportMasterdata(state)
}
