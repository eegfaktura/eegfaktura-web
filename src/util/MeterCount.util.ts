import {EegParticipant} from "../models/members.model";
import {Metering} from "../models/meteringpoint.model";
import {entryRank} from "../components/notification/EnergyRequestSummary.functions";

// Metering points of the period counted once per metering point number (platform#211): after an owner change the
// period holds two participations of one metering point. Direction and tariff come from its current participation:
// first by status as for the energy data request (entryRank: ACTIVE, then others, INIT last), then the latest
// participantState.activeSince (one without a start date counts last); on a full tie the first one in the list wins.
// So the tariff counts add up to the counted metering points that have a known tariff.
export type MeterCount = {consumers: number, producers: number, tariffs: Record<string, number>}

const activeSince = (m: Metering) => {
  const t = m.participantState?.activeSince ? new Date(m.participantState.activeSince).getTime() : NaN
  return isNaN(t) ? -Infinity : t
}

export const countMeters = (participants: EegParticipant[], tariffIds: string[]): MeterCount => {
  const current = new Map<string, Metering>()
  participants.forEach(p => p.meters.forEach(m => {
    const c = current.get(m.meteringPoint)
    const d = c ? entryRank(m) - entryRank(c) : 1
    if (d > 0 || (d === 0 && activeSince(m) > activeSince(c!))) current.set(m.meteringPoint, m)
  }))

  const r: MeterCount = {consumers: 0, producers: 0, tariffs: Object.fromEntries(tariffIds.map(id => [id, 0]))}
  current.forEach(m => {
    m.direction === 'CONSUMPTION' ? r.consumers += 1 : r.producers += 1
    if (m.tariff_id) {
      r.tariffs[m.tariff_id] = (r.tariffs[m.tariff_id] ?? 0) + 1
    }
  })
  return r
}

// a registration is running (the rule of memberActivity in MemberActivity.util)
const REGISTERING: string[] = ['NEW', 'INIT', 'PENDING', 'APPROVED']
const inUse = (m: Metering) => m.status === 'ACTIVE' || (m.status !== 'INACTIVE' && REGISTERING.includes(m.processState))

// Inactive metering points for the dashboard (platform#228): over all members (state today, like the member counts),
// each metering point number once: it has left (a participation with status INACTIVE: left, revoked) and is neither
// active nor being registered at any member. A metering point that moved to another member is not inactive.
export const countInactiveMeters = (participants: EegParticipant[]): number => {
  const left = new Set<string>()
  const used = new Set<string>()
  participants.forEach(p => (p.meters ?? []).forEach(m => {
    if (inUse(m)) used.add(m.meteringPoint)
    else if (m.status === 'INACTIVE') left.add(m.meteringPoint)
  }))
  let n = 0
  left.forEach(mp => { if (!used.has(mp)) n += 1 })
  return n
}
