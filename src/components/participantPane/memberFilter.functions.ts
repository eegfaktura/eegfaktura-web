import {EegParticipant} from "../../models/members.model";
import {Metering} from "../../models/meteringpoint.model";

// Filters of the member list's choice „Anzeige“ besides „Standard“ (platform#214). The view shows all members of the community, independent of
// the period, each with exactly the metering points that match; a member with none is not listed.
export type MemberFilter = 'all' | 'active' | 'inactive'

export const MEMBER_FILTER_OPTIONS: MemberFilter[] = ['all', 'active', 'inactive']

// Fallback of toMemberFilter for an unknown value (the list itself starts with „Standard“, see FilterSegment).
export const DEFAULT_MEMBER_FILTER: MemberFilter = 'inactive'

// Active by its status, the rule of the dashboard's "Aktive" count (memberActivity). Anything else (registration in
// progress, rejected, invalid, revoked, left) is shown under "Inaktive", where the metering point shows its reason.
export const isActiveMeter = (m: Metering) => m.status === 'ACTIVE'

// An active metering point whose process is not active (revocation running or rejected, invalid …) needs action — the
// rule of "Aktion nötig" (participantSort). It is shown under "Aktive" and under "Inaktive" (decided 2026-10-26), so the
// attention view finds every metering point that needs a look.
const needsAction = (m: Metering) => m.processState !== undefined && m.processState !== 'ACTIVE'

// A member waiting for admission is listed under "Alle" and "Inaktive" even without a matching metering point.
const waitsForAdmission = (p: EegParticipant) => p.status === 'NEW' || p.status === 'PENDING'

const matches: Record<MemberFilter, (m: Metering) => boolean> = {
  all: () => true,
  active: isActiveMeter,
  inactive: m => !isActiveMeter(m) || needsAction(m),
}

/**
 * The members of a filter, in the given order, each with its matching metering points. The producer / consumer
 * toggles apply on top: a member whose matching metering points are all hidden is not listed (unless it waits for
 * admission, see above).
 */
export const filterMembers = (participants: EegParticipant[], filter: MemberFilter,
                              hideProducers: boolean, hideConsumers: boolean): EegParticipant[] =>
  participants
    .map(p => ({
      ...p,
      meters: (p.meters ?? []).filter(m => matches[filter](m)
        && !(m.direction === "GENERATION" && hideProducers)
        && !(m.direction === "CONSUMPTION" && hideConsumers)),
    }))
    .filter(p => p.meters.length > 0 || (filter !== 'active' && waitsForAdmission(p)))

/** The filter of a view value; anything unknown is the fallback. */
export const toMemberFilter = (value: string): MemberFilter =>
  MEMBER_FILTER_OPTIONS.find(o => o === value) ?? DEFAULT_MEMBER_FILTER
