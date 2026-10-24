import {EegParticipant} from "../models/members.model";
import {Metering} from "../models/meteringpoint.model";

// Metering points of the period counted once per metering point number (platform#211): after an owner change the
// period holds two participations of one metering point. Direction and tariff come from its current participation,
// the one with the latest participantState.activeSince; one without a start date counts last, on a tie the first
// one in the list wins. So the tariff counts add up to the counted metering points (those with a tariff).
export type MeterCount = {consumers: number, producers: number, tariffs: Record<string, number>}

const activeSince = (m: Metering) => {
  const t = m.participantState?.activeSince ? new Date(m.participantState.activeSince).getTime() : NaN
  return isNaN(t) ? -Infinity : t
}

export const countMeters = (participants: EegParticipant[], tariffIds: string[]): MeterCount => {
  const current = new Map<string, Metering>()
  participants.forEach(p => p.meters.forEach(m => {
    const c = current.get(m.meteringPoint)
    if (!c || activeSince(m) > activeSince(c)) current.set(m.meteringPoint, m)
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
