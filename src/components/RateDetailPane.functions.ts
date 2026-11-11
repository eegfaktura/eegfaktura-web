import {EegParticipant} from "../models/members.model";
import {Metering} from "../models/meteringpoint.model";

const MAX_NAMES = 10

const shortList = (names: string[]) => names.length > MAX_NAMES
  ? `${names.slice(0, MAX_NAMES).join(", ")} und ${names.length - MAX_NAMES} weitere`
  : names.join(", ")

type MeterEntry = { p: EegParticipant, m: Metering }

// The current entry of each metering point (backend flag 1). The participant list also holds the old owner's entry
// after an owner change (flag 0) and archived entries (flag 2), without the flag: archived entries are recognised by
// processState ARCHIVED, the current one is the entry with the latest start. Entries that cannot be told apart
// (same or missing start) count as not current: the backend checks the flag itself (backend#106).
const currentEntries = (participants: EegParticipant[]): MeterEntry[] => {
  const byMeter = new Map<string, MeterEntry[]>()
  participants.forEach(p => p.meters
    .filter(m => (m.processState as string) !== "ARCHIVED")
    .forEach(m => byMeter.set(m.meteringPoint, [...(byMeter.get(m.meteringPoint) || []), {p, m}])))
  return Array.from(byMeter.values()).flatMap(entries => {
    if (entries.length === 1) return entries
    const start = (e: MeterEntry) => new Date(e.m.participantState?.activeSince).getTime()
    const latest = Math.max(...entries.map(start))
    const newest = entries.filter(e => start(e) === latest)
    return Number.isFinite(latest) && newest.length === 1 ? newest : []
  })
}

// Why a tariff cannot be archived: the members (any status) and the current metering point entries that still use
// it, or undefined if none does (261024-ca16, the rule of backend#106).
export const tariffInUseMessage = (participants: EegParticipant[], tariffId: string): string | undefined => {
  const name = (p: EegParticipant) => `${p.firstname} ${p.lastname}`
  const members = participants.filter(p => p.tariffId === tariffId).map(name)
  const meters = currentEntries(participants).filter(({m}) => m.tariff_id === tariffId).map(({p, m}) => `${m.meteringPoint} (${name(p)})`)
  if (members.length === 0 && meters.length === 0) return undefined

  const uses = [
    members.length > 0 ? `Mitglieder: ${shortList(members)}` : undefined,
    meters.length > 0 ? `Zählpunkte: ${shortList(meters)}` : undefined,
  ].filter(u => u !== undefined).join("; ")
  return `Der Tarif wird noch verwendet (${uses}) und kann daher nicht gelöscht werden. Bitte weisen Sie einen anderen Tarif zu.`
}
