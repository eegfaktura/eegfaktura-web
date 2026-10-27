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
 */
export const membersNotYetEnergyBilled = (participants: EegParticipant[], tariffId: string,
                                          state: JoiningFeeState[]): number => {
  const billed = new Set(state.filter(s => s.energyBilled).map(s => s.participantId.toLowerCase()))
  return participants.filter(p => p.tariffId === tariffId
    && (p.meters ?? []).some(isActiveMeter)
    && !billed.has(p.id.toLowerCase())).length
}

/** The member's entry in billing's joiningFeeState; a member without a final document has none. */
export const joiningFeeStateOf = (state: JoiningFeeState[], participantId: string): JoiningFeeState | undefined =>
  state.find(s => s.participantId.toLowerCase() === participantId.toLowerCase())

/**
 * Hint at the member's tariff (decision 2026-10-27): the member was billed with energy already, was never charged a
 * joining fee, and the chosen tariff has one — billing will not charge it any more. Assigning stays possible.
 */
export const showJoiningFeeHint = (state: JoiningFeeState | undefined, tariff?: EegTariff): boolean =>
  hasJoiningFee(tariff) && !!state?.energyBilled && !state.joiningFee
