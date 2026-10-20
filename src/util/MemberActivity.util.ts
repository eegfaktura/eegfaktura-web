import {EegParticipant} from "../models/members.model";
import {MeteringProcessStateType} from "../models/meteringpoint.model";

// Status of a member derived from its metering points (platform#165, same rule as the backend's master data export):
// ACTIVE with at least one active metering point; PENDING without one but with one being registered, or with no
// metering point yet; INACTIVE when all of them have left, were archived or rejected. The stored status is not used.
export type MemberActivity = 'ACTIVE' | 'PENDING' | 'INACTIVE'

const ENDED: string[] = ['REJECTED', 'INVALID', 'REVOKED', 'ARCHIVED', 'ABORTED', 'INACTIVE'] as MeteringProcessStateType[]

export const memberActivity = (p: EegParticipant): MemberActivity => {
  const meters = p.meters ?? []
  if (meters.some(m => m.status === 'ACTIVE')) return 'ACTIVE'
  if (meters.length === 0 || meters.some(m => m.status === 'INIT' && !ENDED.includes(m.processState))) return 'PENDING'
  return 'INACTIVE'
}

export const countMemberActivity = (participants: EegParticipant[]): Record<MemberActivity, number> =>
  participants.reduce((r, p) => {
    r[memberActivity(p)] += 1
    return r
  }, {ACTIVE: 0, PENDING: 0, INACTIVE: 0} as Record<MemberActivity, number>)
