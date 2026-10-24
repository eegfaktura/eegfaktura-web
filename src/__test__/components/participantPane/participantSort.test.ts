import {describe, it, expect, beforeEach} from "vitest";
import {EegParticipant} from "../../../models/members.model";
import {Metering} from "../../../models/meteringpoint.model";
import {
  MEMBER_SORT_KEY,
  readMemberSort,
  sortMembers,
  writeMemberSort
} from "../../../components/participantPane/participantSort";

const meter = (processState: string) => ({meteringPoint: "AT" + processState, processState} as Metering)

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
  it("standard keeps today's order: inactive members first, then open metering points, then input order", () => {
    const list = [
      member("ok1"),
      member("activeOpen", {meters: [meter("ACTIVE"), meter("REJECTED")]}),
      member("newOk", {status: "NEW"}),
      member("ok2"),
      member("newOpen", {status: "NEW", meters: [meter("PENDING")]}),
    ]
    expect(ids(sortMembers(list, "standard"))).toEqual(["newOpen", "newOk", "activeOpen", "ok1", "ok2"])
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

  it("is standard when nothing or an unknown value is stored", () => {
    expect(readMemberSort()).toBe("standard")
    localStorage.setItem(MEMBER_SORT_KEY, "shoeSize")
    expect(readMemberSort()).toBe("standard")
  })

  it("reads back the stored choice", () => {
    writeMemberSort("sinceOldest")
    expect(readMemberSort()).toBe("sinceOldest")
  })
})
