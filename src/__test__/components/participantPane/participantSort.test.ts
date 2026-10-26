import {describe, it, expect, beforeEach} from "vitest";
import {EegParticipant} from "../../../models/members.model";
import {Metering} from "../../../models/meteringpoint.model";
import {
  MEMBER_ACTION_FIRST_KEY,
  MEMBER_SORT_KEY,
  readActionFirst,
  readMemberSort,
  sortMembers,
  writeActionFirst,
  writeMemberSort
} from "../../../components/participantPane/participantSort";

const meter = (processState: string, fields: Partial<Metering> = {}) =>
  ({meteringPoint: "AT" + processState, processState, ...fields} as Metering)

const member = (id: string, fields: Partial<EegParticipant> = {}) => ({
  id,
  firstname: "",
  lastname: "",
  participantNumber: "",
  status: "ACTIVE",
  meters: [meter("ACTIVE")],
  ...fields,
} as EegParticipant)

const ids = (list: EegParticipant[]) => list.map(p => p.id)

describe("sortMembers", () => {
  it("groups inactive members first, then open metering points, then the rest", () => {
    const list = [
      member("ok1"),
      member("activeOpen", {meters: [meter("ACTIVE"), meter("REJECTED")]}),
      member("newOk", {status: "NEW"}),
      member("ok2"),
      member("newOpen", {status: "NEW", meters: [meter("PENDING")]}),
    ]
    expect(ids(sortMembers(list, "participantNumber"))).toEqual(["newOpen", "newOk", "activeOpen", "ok1", "ok2"])
  })

  it("does not change the given array", () => {
    const list = [member("b", {lastname: "B"}), member("a", {lastname: "A"})]
    sortMembers(list, "lastname")
    expect(ids(list)).toEqual(["b", "a"])
  })

  it("sorts by last name in German collation, umlauts next to their base letter", () => {
    const list = [
      member("zeller", {lastname: "Zeller"}),
      member("oberer", {lastname: "Oberer"}),
      member("oesterle", {lastname: "Österle"}),
      member("mueller", {lastname: "Müller"}),
      member("muster", {lastname: "Muster"}),
      member("aaa", {lastname: "aaa"}),
    ]
    expect(ids(sortMembers(list, "lastname"))).toEqual(["aaa", "mueller", "muster", "oberer", "oesterle", "zeller"])
  })

  it("sorts equal last names by first name, empty last names at the end", () => {
    const list = [
      member("noLast", {firstname: "Anna"}),
      member("maxHuber", {firstname: "Max", lastname: "Huber"}),
      member("undefinedLast", {firstname: "Bert", lastname: undefined}),
      member("annaHuber", {firstname: "Anna", lastname: "Huber"}),
    ]
    expect(ids(sortMembers(list, "lastname"))).toEqual(["annaHuber", "maxHuber", "noLast", "undefinedLast"])
  })

  it("sorts by first name, then last name, empty first names at the end", () => {
    const list = [
      member("empty", {firstname: "", lastname: "Adam"}),
      member("evaZ", {firstname: "Eva", lastname: "Zach"}),
      member("aeon", {firstname: "Äon"}),
      member("evaA", {firstname: "Eva", lastname: "Aigner"}),
    ]
    expect(ids(sortMembers(list, "firstname"))).toEqual(["aeon", "evaA", "evaZ", "empty"])
  })

  it("sorts member numbers as numbers, empty numbers at the end", () => {
    const list = [
      member("n10", {participantNumber: "10"}),
      member("none", {participantNumber: ""}),
      member("n2", {participantNumber: "2"}),
      member("n007", {participantNumber: "007"}),
      member("m9", {participantNumber: "M-9"}),
      member("m10", {participantNumber: "M-10"}),
    ]
    expect(ids(sortMembers(list, "participantNumber"))).toEqual(["n2", "n007", "n10", "m9", "m10", "none"])
  })

  it("sorts alphanumeric member numbers by their number part", () => {
    const list = [
      member("a10", {participantNumber: "A10"}),
      member("b1", {participantNumber: "B1"}),
      member("a006", {participantNumber: "A006"}),
      member("a7", {participantNumber: "a7"}),
    ]
    expect(ids(sortMembers(list, "participantNumber"))).toEqual(["a006", "a7", "a10", "b1"])
  })

  it("sorts by join date newest or oldest first, missing or invalid dates at the end", () => {
    const list = [
      member("2023", {participantSince: "2023-05-01T00:00:00Z" as unknown as Date}),
      member("none", {participantSince: undefined}),
      member("2021", {participantSince: new Date(2021, 0, 1)}),
      member("bad", {participantSince: "kein Datum" as unknown as Date}),
      member("2024", {participantSince: "2024-01-15" as unknown as Date}),
    ]
    expect(ids(sortMembers(list, "sinceNewest"))).toEqual(["2024", "2023", "2021", "none", "bad"])
    expect(ids(sortMembers(list, "sinceOldest"))).toEqual(["2021", "2023", "2024", "none", "bad"])
  })

  it("keeps members needing an action on top and sorts within both groups", () => {
    const list = [
      member("okB", {lastname: "Berger"}),
      member("openZ", {lastname: "Zach", meters: [meter("INVALID")]}),
      member("okA", {lastname: "Auer"}),
      member("pendingM", {lastname: "Mayr", status: "PENDING"}),
      member("openC", {lastname: "Clement", meters: [meter("NEW")]}),
    ]
    expect(ids(sortMembers(list, "lastname"))).toEqual(["pendingM", "openC", "openZ", "okA", "okB"])
  })

  it("sorts over all members without the action grouping", () => {
    const list = [
      member("okB", {lastname: "Berger"}),
      member("openZ", {lastname: "Zach", meters: [meter("INVALID")]}),
      member("okA", {lastname: "Auer"}),
      member("pendingM", {lastname: "Mayr", status: "PENDING"}),
    ]
    expect(ids(sortMembers(list, "lastname", false))).toEqual(["okA", "okB", "pendingM", "openZ"])
  })

  it("keeps the input order for equal keys (stable)", () => {
    const list = [
      member("first", {lastname: "Gruber", firstname: "Hans"}),
      member("second", {lastname: "gruber", firstname: "hans"}),
      member("third", {lastname: "Gruber", firstname: "Hans"}),
    ]
    expect(ids(sortMembers(list, "lastname"))).toEqual(["first", "second", "third"])
  })
})

describe("member sort storage", () => {
  beforeEach(() => localStorage.clear())

  it("is the member number when nothing, the former 'standard' or an unknown value is stored", () => {
    expect(readMemberSort()).toBe("participantNumber")
    localStorage.setItem(MEMBER_SORT_KEY, "standard")
    expect(readMemberSort()).toBe("participantNumber")
    localStorage.setItem(MEMBER_SORT_KEY, "shoeSize")
    expect(readMemberSort()).toBe("participantNumber")
  })

  it("keeps a stored choice of 1.9.0", () => {
    localStorage.setItem(MEMBER_SORT_KEY, "lastname")
    expect(readMemberSort()).toBe("lastname")
  })

  it("keeps members needing an action on top unless it was switched off", () => {
    expect(readActionFirst()).toBe(true)
    localStorage.setItem(MEMBER_ACTION_FIRST_KEY, "garbage")
    expect(readActionFirst()).toBe(true)
    writeActionFirst(false)
    expect(readActionFirst()).toBe(false)
    writeActionFirst(true)
    expect(readActionFirst()).toBe(true)
  })

  it("reads back the stored choice", () => {
    writeMemberSort("sinceOldest")
    expect(readMemberSort()).toBe("sinceOldest")
  })
})

describe("sortMembers: new sorts (platform#214)", () => {
  const since = (activeSince: string | undefined, direction = "CONSUMPTION") =>
    meter("ACTIVE", {direction, status: "ACTIVE", participantState: {activeSince} as unknown as Metering["participantState"]} as Partial<Metering>)

  it("'Aktiviert seit': earliest active date of the metering points, newest first, none at the end", () => {
    const list = [
      member("2022", {meters: [since("2024-03-01"), since("2022-06-01", "GENERATION")]}),
      member("none", {meters: [since(undefined)]}),
      member("2025", {meters: [since("2025-01-01")]}),
      member("bad", {meters: [since("kein Datum")]}),
      member("2023", {meters: [since("2023-02-01"), since(undefined)]}),
    ]
    expect(ids(sortMembers(list, "activeSince"))).toEqual(["2025", "2023", "2022", "none", "bad"])
  })

  it("'Einzugsart': CORE, B2B, Kein SEPA, none, then by last name", () => {
    const debit = (sepaDirectDebit: string | undefined) => ({accountInfo: {sepaDirectDebit}} as Partial<EegParticipant>)
    const list = [
      member("unsetA", {lastname: "Auer", ...debit("")}),
      member("noneB", {lastname: "Berger", ...debit("NONE")}),
      member("coreZ", {lastname: "Zach", ...debit("CORE")}),
      member("b2b", {lastname: "Mayr", ...debit("B2B")}),
      member("coreA", {lastname: "Aigner", ...debit("core")}),
      member("missing", {lastname: "Adam", accountInfo: undefined}),
    ]
    expect(ids(sortMembers(list, "debitType"))).toEqual(["coreA", "coreZ", "b2b", "noneB", "missing", "unsetA"])
  })

  it("'Ort': city of the residence in German collation, empty at the end, then by last name (Abel before Aigner)", () => {
    const city = (c: string | undefined, lastname: string) =>
      ({lastname, residentAddress: {city: c}} as Partial<EegParticipant>)
    const list = [
      member("wien", city("Wien", "Auer")),
      member("empty", city("", "Aigner")),
      member("oedB", city("Ödenburg", "Berger")),
      member("linz", city("linz", "Zach")),
      member("oedA", city("Ödenburg", "Adam")),
      member("noAddress", {lastname: "Abel", residentAddress: undefined} as unknown as Partial<EegParticipant>),
    ]
    expect(ids(sortMembers(list, "city"))).toEqual(["linz", "oedA", "oedB", "wien", "noAddress", "empty"])
  })
})

describe("sortMembers: metering points of a member", () => {
  const m = (id: string, direction: string) => ({meteringPoint: id, direction, processState: "ACTIVE"} as Metering)

  it("lists consumers before producers, the order within each direction unchanged", () => {
    const list = [member("x", {meters: [m("P1", "GENERATION"), m("C1", "CONSUMPTION"), m("P2", "GENERATION"), m("C2", "CONSUMPTION")]})]
    const [sorted] = sortMembers(list, "participantNumber")
    expect(sorted.meters.map(x => x.meteringPoint)).toEqual(["C1", "C2", "P1", "P2"])
    expect(list[0].meters.map(x => x.meteringPoint)).toEqual(["P1", "C1", "P2", "C2"])
  })

  it("keeps the member object when the order is already right", () => {
    const list = [member("x", {meters: [m("C1", "CONSUMPTION"), m("P1", "GENERATION")]})]
    expect(sortMembers(list, "participantNumber")[0]).toBe(list[0])
  })
})
