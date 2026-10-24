import {EegParticipant} from "../../models/members.model";

// Sort options of the member list (platform#214). "standard" is the order the list always had.
export type MemberSort = 'standard' | 'lastname' | 'firstname' | 'participantNumber' | 'sinceNewest' | 'sinceOldest'

export const MEMBER_SORT_OPTIONS: MemberSort[] = ['standard', 'lastname', 'firstname', 'participantNumber', 'sinceNewest', 'sinceOldest']

// German collation, case-insensitive, umlauts right after their base letter, digits compared as numbers ("2" < "10")
const collator = new Intl.Collator('de', {sensitivity: 'accent', numeric: true})

type Compare = (a: EegParticipant, b: EegParticipant) => number

// Empty values always go to the end, in both directions.
const byText = (value: (p: EegParticipant) => string | undefined): Compare => (a, b) => {
  const va = value(a)?.trim() ?? ""
  const vb = value(b)?.trim() ?? ""
  if (!va || !vb) return (va ? 0 : 1) - (vb ? 0 : 1)
  return collator.compare(va, vb)
}

const sinceTime = (p: EegParticipant) => {
  const t = p.participantSince ? new Date(p.participantSince as unknown as string).getTime() : NaN
  return isNaN(t) ? undefined : t
}

const bySince = (newestFirst: boolean): Compare => (a, b) => {
  const ta = sinceTime(a)
  const tb = sinceTime(b)
  if (ta === undefined || tb === undefined) return (ta === undefined ? 1 : 0) - (tb === undefined ? 1 : 0)
  return newestFirst ? tb - ta : ta - tb
}

const lastname = byText(p => p.lastname)
const firstname = byText(p => p.firstname)

const compareBy: Record<MemberSort, Compare> = {
  standard: () => 0,
  lastname: (a, b) => lastname(a, b) || firstname(a, b),
  firstname: (a, b) => firstname(a, b) || lastname(a, b),
  participantNumber: byText(p => p.participantNumber),
  sinceNewest: bySince(true),
  sinceOldest: bySince(false),
}

// The groups of the former list order, unchanged: members that are not active first, then members with a metering
// point that is not active (open problem, registration in progress), then the rest.
const actionRank = (p: EegParticipant) =>
  (p.status === "ACTIVE" ? 2 : 0) + (p.meters.every(m => m.processState === "ACTIVE") ? 1 : 0)

/** Members needing an action stay on top; the chosen sort applies within the groups. Stable, returns a new array. */
export const sortMembers = (participants: EegParticipant[], sort: MemberSort) =>
  [...participants].sort((a, b) => actionRank(a) - actionRank(b) || compareBy[sort](a, b))

// Each viewer's choice is kept in the browser. Storage can be missing or blocked: then it is the standard order.
export const MEMBER_SORT_KEY = "eegfaktura.memberSort"

export const readMemberSort = (): MemberSort => {
  try {
    const value = localStorage.getItem(MEMBER_SORT_KEY)
    return MEMBER_SORT_OPTIONS.find(o => o === value) ?? 'standard'
  } catch {
    return 'standard'
  }
}

export const writeMemberSort = (sort: MemberSort) => {
  try {
    localStorage.setItem(MEMBER_SORT_KEY, sort)
  } catch {
    // not kept, still works for this page
  }
}
