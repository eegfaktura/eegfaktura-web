import {EegParticipant} from "../models/members.model";

const MAX_NAMES = 10

const shortList = (names: string[]) => names.length > MAX_NAMES
  ? `${names.slice(0, MAX_NAMES).join(", ")} und ${names.length - MAX_NAMES} weitere`
  : names.join(", ")

// Why a tariff cannot be archived: the members and the metering points that still use it, or undefined if none
// does. The backend's own check (code 900) does not stop the archive, so this is the only guard (261024-ca16).
export const tariffInUseMessage = (participants: EegParticipant[], tariffId: string): string | undefined => {
  const name = (p: EegParticipant) => `${p.firstname} ${p.lastname}`
  const members = participants.filter(p => p.tariffId === tariffId).map(name)
  const meters = participants.flatMap(p => p.meters.filter(m => m.tariff_id === tariffId).map(m => `${m.meteringPoint} (${name(p)})`))
  if (members.length === 0 && meters.length === 0) return undefined

  const uses = [
    members.length > 0 ? `Mitglieder: ${shortList(members)}` : undefined,
    meters.length > 0 ? `Zählpunkte: ${shortList(meters)}` : undefined,
  ].filter(u => u !== undefined).join("; ")
  return `Der Tarif wird noch verwendet (${uses}) und kann daher nicht gelöscht werden. Bitte weisen Sie einen anderen Tarif zu.`
}
