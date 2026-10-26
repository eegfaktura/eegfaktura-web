import {EegParticipant} from "../models/members.model";

// Status of a member derived from its metering points (platform#165, the rule of the backend's master data export):
// ACTIVE with at least one active metering point; PENDING without one but with one being registered, or with no
// metering point yet; INACTIVE when all of them have left, were archived or rejected. A member without metering
// points whose stored status is ACTIVE had some and they were moved away: INACTIVE (web only; the export has no row
// for members without metering points). Pass the member with all its
// metering points (the store entity), not a filtered list entry.
export type MemberActivity = 'ACTIVE' | 'PENDING' | 'INACTIVE'

// a registration is running; a metering point with status INACTIVE never counts (stale registration states in prod,
// 20.10.2026), a re-registered one counts once it is active again
const REGISTERING: string[] = ['NEW', 'INIT', 'PENDING', 'APPROVED']

export const memberActivity = (p: EegParticipant): MemberActivity => {
  const meters = p.meters ?? []
  if (meters.some(m => m.status === 'ACTIVE')) return 'ACTIVE'
  if (meters.length === 0) return p.status === 'ACTIVE' ? 'INACTIVE' : 'PENDING'
  if (meters.some(m => m.status !== 'INACTIVE' && REGISTERING.includes(m.processState))) return 'PENDING'
  return 'INACTIVE'
}

export const countMemberActivity = (participants: EegParticipant[]): Record<MemberActivity, number> =>
  participants.reduce((r, p) => {
    r[memberActivity(p)] += 1
    return r
  }, {ACTIVE: 0, PENDING: 0, INACTIVE: 0} as Record<MemberActivity, number>)

// Membership fees of the active members (platform#223, the dashboard's "Tarife"): the active members (as counted
// above and listed by the member filter "Aktive") per membership-fee tariff (EegParticipant.tariffId), and the active
// members without one.
export type MemberFeeCount = {tariffs: Record<string, number>, withoutFee: number}

export const countMemberFees = (participants: EegParticipant[]): MemberFeeCount =>
  participants.filter(p => memberActivity(p) === 'ACTIVE').reduce((r, p) => {
    if (p.tariffId) {
      r.tariffs[p.tariffId] = (r.tariffs[p.tariffId] ?? 0) + 1
    } else {
      r.withoutFee += 1
    }
    return r
  }, {tariffs: {}, withoutFee: 0} as MemberFeeCount)
