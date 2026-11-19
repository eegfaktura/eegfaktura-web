import {EegParticipant} from "../../models/members.model";
import {Metering} from "../../models/meteringpoint.model";
import {debitInstrument} from "../../util/MandateReference.util";

// Sort options of the member list (platform#214, energy platform#259). The first one is the default.
export type MemberSort = 'participantNumber' | 'lastname' | 'firstname' | 'sinceNewest' | 'sinceOldest'
  | 'activeSince' | 'debitType' | 'city' | 'energyHighest' | 'energyLowest'

export const MEMBER_SORT_OPTIONS: MemberSort[] =
  ['participantNumber', 'lastname', 'firstname', 'sinceNewest', 'sinceOldest', 'activeSince', 'debitType', 'city',
    'energyHighest', 'energyLowest']

export const DEFAULT_MEMBER_SORT: MemberSort = 'participantNumber'

export const isEnergySort = (sort: MemberSort) => sort === 'energyHighest' || sort === 'energyLowest'

// The energy sorts (decided 14.11.2026 with Harald): not offered in „Nur Mitglieder“ (no metering points shown), and
// greyed out until „Nur Erzeuger“ or „Nur Verbraucher“ says which energy counts.
export type EnergySortState = 'available' | 'disabled' | 'hidden'

export const energySortState = (hideMeter: boolean, hideProducers: boolean, hideConsumers: boolean): EnergySortState =>
  hideMeter ? 'hidden' : hideProducers || hideConsumers ? 'available' : 'disabled'

/** The sort the list uses: a chosen energy sort counts only while it is available, else the default. */
export const effectiveMemberSort = (sort: MemberSort, state: EnergySortState): MemberSort =>
  isEnergySort(sort) && state !== 'available' ? DEFAULT_MEMBER_SORT : sort

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

const time = (d: unknown) => {
  const t = d ? new Date(d as string).getTime() : NaN
  return isNaN(t) ? undefined : t
}

// Missing times always go to the end, in both directions.
const byTime = (value: (p: EegParticipant) => number | undefined, newestFirst: boolean): Compare => (a, b) => {
  const ta = value(a)
  const tb = value(b)
  if (ta === undefined || tb === undefined) return (ta === undefined ? 1 : 0) - (tb === undefined ? 1 : 0)
  return newestFirst ? tb - ta : ta - tb
}

// The earliest "Aktiv ab" of the member's metering points, undefined when none has one.
const firstActiveSince = (p: EegParticipant) => (p.meters ?? [])
  .map(m => time(m.participantState?.activeSince))
  .reduce<number | undefined>((min, t) => t === undefined || (min !== undefined && min <= t) ? min : t, undefined)

const DEBIT_RANK = {CORE: 0, B2B: 1, NONE: 2, UNSET: 3}

const lastname = byText(p => p.lastname)
const firstname = byText(p => p.firstname)
const byName: Compare = (a, b) => lastname(a, b) || firstname(a, b)
const city = byText(p => p.residentAddress?.city)

const compareBy: Record<MemberSort, Compare> = {
  participantNumber: byText(p => p.participantNumber),
  lastname: byName,
  firstname: (a, b) => firstname(a, b) || lastname(a, b),
  sinceNewest: byTime(p => time(p.participantSince), true),
  sinceOldest: byTime(p => time(p.participantSince), false),
  activeSince: byTime(firstActiveSince, true),
  debitType: (a, b) => DEBIT_RANK[debitInstrument(a.accountInfo?.sepaDirectDebit)]
    - DEBIT_RANK[debitInstrument(b.accountInfo?.sepaDirectDebit)] || byName(a, b),
  city: (a, b) => city(a, b) || byName(a, b),
  // the energy order is applied on the shown list (sortByEnergy); here the member number, its tie-break
  energyHighest: byText(p => p.participantNumber),
  energyLowest: byText(p => p.participantNumber),
}

// The groups of the former list order: members that are not active first, then members with a metering point that is
// not active (open problem, registration in progress), then the rest.
const actionRank = (p: EegParticipant) =>
  (p.status === "ACTIVE" ? 2 : 0) + ((p.meters ?? []).every(m => m.processState === "ACTIVE") ? 1 : 0)

const directionRank = (m: Metering) => m.direction === "GENERATION" ? 1 : 0

/** Consumers before producers, the order within each direction unchanged. The same member when nothing moves. */
export const consumersFirst = (p: EegParticipant): EegParticipant => {
  const meters = [...(p.meters ?? [])].sort((a, b) => directionRank(a) - directionRank(b))
  return p.meters && meters.every((m, i) => m === p.meters[i]) ? p : {...p, meters}
}

/**
 * Sorts the members, stable, returns a new array. With actionFirst, members needing an action stay on top and the sort
 * applies within the groups; without, it is the pure sort over all members. Metering points: consumers first.
 */
export const sortMembers = (participants: EegParticipant[], sort: MemberSort, actionFirst: boolean = true) => {
  const compare = compareBy[sort] ?? compareBy[DEFAULT_MEMBER_SORT]
  return participants
    .map(consumersFirst)
    .sort((a, b) => (actionFirst ? actionRank(a) - actionRank(b) : 0) || compare(a, b))
}

// kWh of the period per member and metering point, as the metering point card shows them (meteringEnergyGroup11).
export type MeterEnergy = Record<string, Record<string, number>>

/**
 * The energy sort of the shown list (platform#259), stable: equal values keep their order. A metering point without
 * energy in the period counts as 0 kWh. perMeter („Nur Zählpunkte“): one entry per metering point, sorted across all
 * members; else members by the sum of their shown metering points, these sorted within the member. With actionFirst
 * the entries needing an action stay on top, judged by the shown metering points.
 */
export const sortByEnergy = (participants: EegParticipant[], energy: MeterEnergy, highestFirst: boolean,
                             perMeter: boolean, actionFirst: boolean): EegParticipant[] => {
  const kWh = (p: EegParticipant, m: Metering) => {
    const v = energy[p.id]?.[m.meteringPoint]
    return v === undefined || isNaN(v) ? 0 : v
  }
  const order = highestFirst ? -1 : 1
  const entries = perMeter
    ? participants.flatMap(p => (p.meters ?? []).map(m => ({p: {...p, meters: [m]}, value: kWh(p, m)})))
    : participants.map(p => {
      const meters = [...(p.meters ?? [])].sort((a, b) => order * (kWh(p, a) - kWh(p, b)))
      return {p: {...p, meters}, value: meters.reduce((s, m) => s + kWh(p, m), 0)}
    })
  return entries
    .sort((a, b) => (actionFirst ? actionRank(a.p) - actionRank(b.p) : 0) || order * (a.value - b.value))
    .map(e => e.p)
}

// Each viewer's choice is kept in the browser. Storage can be missing or blocked: then it is the default. A value that
// is no longer an option ("standard" of 1.9.0) also falls back to the default.
export const MEMBER_SORT_KEY = "eegfaktura.memberSort"
export const MEMBER_ACTION_FIRST_KEY = "eegfaktura.memberSortActionFirst"

const read = (key: string) => {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

const write = (key: string, value: string) => {
  try {
    localStorage.setItem(key, value)
  } catch {
    // not kept, still works for this page
  }
}

export const readMemberSort = (): MemberSort => {
  const value = read(MEMBER_SORT_KEY)
  return MEMBER_SORT_OPTIONS.find(o => o === value) ?? DEFAULT_MEMBER_SORT
}

export const writeMemberSort = (sort: MemberSort) => write(MEMBER_SORT_KEY, sort)

// default on: only a stored "false" turns it off
export const readActionFirst = (): boolean => read(MEMBER_ACTION_FIRST_KEY) !== "false"

export const writeActionFirst = (actionFirst: boolean) => write(MEMBER_ACTION_FIRST_KEY, String(actionFirst))
