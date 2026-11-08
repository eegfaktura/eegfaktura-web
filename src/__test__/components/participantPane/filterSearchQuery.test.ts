// @vitest-environment node
import {describe, expect, it} from "vitest";
import {filterSearchQuery} from "../../../components/participantPane/ParticipantPane.functions";
import {EegParticipant} from "../../../models/members.model";
import {Metering} from "../../../models/meteringpoint.model";

// platform#244: several terms are combined with AND, each in any field of the member or its metering points

const meter = (meteringPoint: string, equipmentName = "") => ({meteringPoint, equipmentName} as Metering)
const member = (id: string, firstname: string, lastname: string, participantNumber: string, email: string,
                ...meters: Metering[]) =>
  ({id, firstname, lastname, participantNumber, contact: {email}, meters} as unknown as EegParticipant)

const mariaHuber = member("1", "Maria", "Huber", "0815", "maria@example.org",
  meter("AT0030000000000000000000000000001", "Haus"), meter("AT0030000000000000000000000000002", "PV Dach"))
const josefHuber = member("2", "Josef", "Huber", "0816", "josef@example.org", meter("AT0030000000000000000000000000003"))
const mariaMayr = member("3", "Maria", "Mayr", "0900", "mm@example.org", meter("AT0030000000000000000000000000004"))
const all = [mariaHuber, josefHuber, mariaMayr]
const ids = (r: EegParticipant[]) => r.map(p => p.id)

describe("member search with several terms (platform#244)", () => {
  it("finds the member that has all terms, in any order", () => {
    expect(ids(filterSearchQuery(all, "huber maria"))).toEqual(["1"])
    expect(ids(filterSearchQuery(all, "maria huber"))).toEqual(["1"])
  })

  it("combines the name with the member number or a metering point", () => {
    expect(ids(filterSearchQuery(all, "huber 0816"))).toEqual(["2"])
    const r = filterSearchQuery(all, "huber dach")
    expect(ids(r)).toEqual(["1"])
    expect(r[0].meters.map(m => m.equipmentName)).toEqual(["PV Dach"])   // narrowed to the metering point hit
  })

  it("keeps all metering points when no term hits one", () => {
    expect(filterSearchQuery(all, "huber maria")[0].meters).toHaveLength(2)
  })

  it("finds nothing when one term matches no field", () => {
    expect(filterSearchQuery(all, "huber xyz")).toEqual([])
  })

  it("ignores spaces at the edges and between the terms", () => {
    expect(ids(filterSearchQuery(all, "  huber   maria "))).toEqual(["1"])
    expect(filterSearchQuery(all, "   ")).toBe(all)
  })

  it("a single term behaves as before: any field, metering point hits narrow the list", () => {
    expect(ids(filterSearchQuery(all, "maria"))).toEqual(["1", "3"])
    expect(ids(filterSearchQuery(all, "example.org"))).toEqual(["1", "2", "3"])
    const r = filterSearchQuery(all, "0000000000000000000000000002")
    expect(ids(r)).toEqual(["1"])
    expect(r[0].meters.map(m => m.meteringPoint)).toEqual(["AT0030000000000000000000000000002"])
    expect(filterSearchQuery(all, undefined)).toBe(all)
  })
})
