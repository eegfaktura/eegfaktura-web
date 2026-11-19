import {describe, it, expect} from "vitest";
import {EegParticipant} from "../../../models/members.model";
import {Metering} from "../../../models/meteringpoint.model";
import {
  appliedMemberSort,
  DEFAULT_MEMBER_SORT,
  effectiveMemberSort,
  energySortState,
  MeterEnergy,
  sortByEnergy,
} from "../../../components/participantPane/participantSort";

// Energy sort of the member list (platform#259)

const meter = (meteringPoint: string, fields: Partial<Metering> = {}) =>
  ({meteringPoint, processState: "ACTIVE", direction: "CONSUMPTION", ...fields} as Metering)

const member = (id: string, meters: Metering[], fields: Partial<EegParticipant> = {}) =>
  ({id, firstname: "", lastname: "", participantNumber: id, status: "ACTIVE", meters, ...fields} as EegParticipant)

const ids = (list: EegParticipant[]) => list.map(p => p.id)
const meterIds = (list: EegParticipant[]) => list.flatMap(p => p.meters.map(m => m.meteringPoint))

describe("energySortState", () => {
  it("is hidden in „Nur Mitglieder“, also with a direction chosen", () => {
    expect(energySortState(true, false, false)).toBe("hidden")
    expect(energySortState(true, true, false)).toBe("hidden")
  })

  it("is greyed out without „Nur Erzeuger“ or „Nur Verbraucher“", () => {
    expect(energySortState(false, false, false)).toBe("disabled")
  })

  it("is available with a direction chosen", () => {
    expect(energySortState(false, true, false)).toBe("available")
    expect(energySortState(false, false, true)).toBe("available")
  })
})

describe("effectiveMemberSort", () => {
  it("keeps an energy sort while it is available", () => {
    expect(effectiveMemberSort("energyHighest", "available")).toBe("energyHighest")
  })

  it("uses the default while an energy sort is not available", () => {
    expect(effectiveMemberSort("energyLowest", "disabled")).toBe(DEFAULT_MEMBER_SORT)
    expect(effectiveMemberSort("energyHighest", "hidden")).toBe(DEFAULT_MEMBER_SORT)
  })

  it("leaves the other sorts unchanged", () => {
    expect(effectiveMemberSort("city", "disabled")).toBe("city")
  })
})

describe("appliedMemberSort", () => {
  it("keeps a waiting energy sort when the menu is applied unchanged", () => {
    expect(appliedMemberSort("energyHighest", DEFAULT_MEMBER_SORT, "disabled")).toBe("energyHighest")
  })

  it("takes another sort picked in the menu", () => {
    expect(appliedMemberSort("energyHighest", "city", "disabled")).toBe("city")
    expect(appliedMemberSort("energyHighest", "energyLowest", "available")).toBe("energyLowest")
    expect(appliedMemberSort("city", "lastname", "available")).toBe("lastname")
  })
})

describe("sortByEnergy", () => {
  const energy: MeterEnergy = {
    a: {a1: 10, a2: 300},
    b: {b1: 200},
    c: {c1: 50},
  }
  const list = [
    member("a", [meter("a1"), meter("a2")]),
    member("b", [meter("b1")]),
    member("c", [meter("c1")]),
  ]

  it("„Nur Zählpunkte“: one entry per metering point, across all members", () => {
    const sorted = sortByEnergy(list, energy, "energyHighest", {perMeter: true, actionFirst: false})
    expect(meterIds(sorted)).toEqual(["a2", "b1", "c1", "a1"])
    expect(ids(sorted)).toEqual(["a", "b", "c", "a"])
  })

  it("smallest first in the other direction", () => {
    expect(meterIds(sortByEnergy(list, energy, "energyLowest", {perMeter: true, actionFirst: false}))).toEqual(["a1", "c1", "b1", "a2"])
  })

  it("with members shown: members by the sum of their metering points, these sorted within", () => {
    const sorted = sortByEnergy(list, energy, "energyHighest", {perMeter: false, actionFirst: false})
    expect(ids(sorted)).toEqual(["a", "b", "c"])
    expect(sorted[0].meters.map(m => m.meteringPoint)).toEqual(["a2", "a1"])
    expect(ids(sortByEnergy(list, energy, "energyLowest", {perMeter: false, actionFirst: false}))).toEqual(["c", "b", "a"])
  })

  it("a metering point without energy in the period counts as 0 kWh", () => {
    const withEmpty = [...list, member("d", [meter("d1")]), member("e", [meter("e1")])]
    const sorted = sortByEnergy(withEmpty, {...energy, e: {e1: NaN}}, "energyLowest", {perMeter: true, actionFirst: false})
    expect(meterIds(sorted).slice(0, 2)).toEqual(["d1", "e1"])
    expect(meterIds(sortByEnergy(withEmpty, energy, "energyHighest", {perMeter: true, actionFirst: false})).slice(-2)).toEqual(["d1", "e1"])
  })

  it("keeps the given order for equal energy", () => {
    const same = [member("x", [meter("x1")]), member("y", [meter("y1")]), member("z", [meter("z1")])]
    expect(ids(sortByEnergy(same, {x: {x1: 5}, y: {y1: 5}, z: {z1: 5}}, "energyHighest", {perMeter: true, actionFirst: false}))).toEqual(["x", "y", "z"])
  })

  it("with actionFirst, entries needing an action stay on top, judged by the shown metering point", () => {
    const open = member("open", [meter("o1", {processState: "REJECTED"}), meter("o2")])
    const sorted = sortByEnergy([...list, open], {...energy, open: {o1: 1, o2: 1000}}, "energyHighest", {perMeter: true, actionFirst: true})
    expect(meterIds(sorted)).toEqual(["o1", "o2", "a2", "b1", "c1", "a1"])
    expect(meterIds(sortByEnergy([...list, open], {...energy, open: {o1: 1, o2: 1000}}, "energyHighest", {perMeter: true, actionFirst: false}))[0])
      .toBe("o2")
  })

  it("does not change the given members", () => {
    sortByEnergy(list, energy, "energyHighest", {perMeter: false, actionFirst: false})
    expect(list[0].meters.map(m => m.meteringPoint)).toEqual(["a1", "a2"])
  })
})
