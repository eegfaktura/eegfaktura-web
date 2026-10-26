import {describe, it, expect} from "vitest";
import {renderHook} from "@testing-library/react";
import {EegParticipant} from "../../../models/members.model";
import {Metering} from "../../../models/meteringpoint.model";
import {filterParticipant} from "../../../components/participantPane/ParticipantPane.effects";

const meter = (id: string, status: string, direction = "CONSUMPTION", processState = status) =>
  ({meteringPoint: id, status, processState, direction} as Metering)

const member = (id: string, meters: Metering[], status = "ACTIVE") => ({id, status, meters} as EegParticipant)

// without the action grouping and with equal member numbers the input order stays (stable sort)
const run = (selectedFilter: string, participants: EegParticipant[], hideProducers = false, hideConsumers = false) =>
  renderHook(() => filterParticipant({
    selectedFilter, participants, sortedParticipants: participants,
    hideProducers, hideConsumers, hideMeter: true, memberSort: "participantNumber", actionFirst: false,
  })).result.current

const view = (list: EegParticipant[]) => list.map(p => p.id + ":" + p.meters.map(m => m.meteringPoint).join(","))

describe("filterParticipant 'active'", () => {
  const list = [
    member("mixed", [meter("AT1", "ACTIVE"), meter("AT2", "INACTIVE"), meter("AT3", "NEW")]),
    member("left", [meter("AT4", "INACTIVE")]),
    member("producer", [meter("AT5", "ACTIVE", "GENERATION")]),
    member("reRegistering", [meter("AT6", "INACTIVE", "CONSUMPTION", "PENDING")]),
    member("activeRejected", [meter("AT7", "ACTIVE", "CONSUMPTION", "REJECTED")]),
  ]

  it("keeps members with an active metering point and shows only the active ones", () => {
    const result = run("active", list)
    expect(result.map(p => p.id)).toEqual(["mixed", "producer", "activeRejected"])
    expect(result[0].meters.map(m => m.meteringPoint)).toEqual(["AT1"])
  })

  it("drops a member whose only active metering points are hidden producers", () => {
    expect(run("active", list, true).map(p => p.id)).toEqual(["mixed", "activeRejected"])
  })
})

describe("filterParticipant 'all' / 'active' / 'inactive' (platform#214)", () => {
  const list = [
    member("mixed", [meter("AT3", "INIT", "GENERATION", "NEW"), meter("AT1", "ACTIVE"), meter("AT2", "INACTIVE")]),
    member("onlyRejected", [meter("AT4", "INIT", "CONSUMPTION", "REJECTED")]),
    member("left", [meter("AT5", "INACTIVE")]),
    member("producer", [meter("AT6", "ACTIVE", "GENERATION")]),
    member("waiting", [], "PENDING"),
    member("newWithMeter", [meter("AT7", "INIT", "CONSUMPTION", "NEW")], "NEW"),
    member("noMeters", []),
  ]

  it("'all' lists every metering point, consumers first; members without one only while they wait for admission", () => {
    expect(view(run("all", list))).toEqual([
      "mixed:AT1,AT2,AT3", "onlyRejected:AT4", "left:AT5", "producer:AT6", "waiting:", "newWithMeter:AT7"])
  })

  it("'active' lists only active metering points and members having one", () => {
    expect(view(run("active", list))).toEqual(["mixed:AT1", "producer:AT6"])
  })

  it("'inactive' lists every metering point that is not active, and the members waiting for admission", () => {
    expect(view(run("inactive", list))).toEqual(
      ["mixed:AT2,AT3", "onlyRejected:AT4", "left:AT5", "waiting:", "newWithMeter:AT7"])
  })

  it("a member with only a rejected metering point is under 'Inaktive' with it, not under 'Aktive'", () => {
    const rejected = [member("onlyRejected", [meter("AT4", "INIT", "CONSUMPTION", "REJECTED")])]
    expect(view(run("inactive", rejected))).toEqual(["onlyRejected:AT4"])
    expect(view(run("active", rejected))).toEqual([])
  })

  it("hides producers or consumers on top of the filter", () => {
    expect(view(run("inactive", list, true))).toEqual(["mixed:AT2", "onlyRejected:AT4", "left:AT5", "waiting:", "newWithMeter:AT7"])
    // a member waiting for admission stays, also when its metering points are hidden
    expect(view(run("all", list, false, true))).toEqual(["mixed:AT3", "producer:AT6", "waiting:", "newWithMeter:"])
    expect(view(run("active", list, false, true))).toEqual(["producer:AT6"])
  })

  it("an unknown filter value is 'Inaktive'", () => {
    expect(view(run("init", list))).toEqual(view(run("inactive", list)))
  })

  it("sorts with all metering points of a member: action grouping and consumers first", () => {
    const sorted = renderHook(() => filterParticipant({
      selectedFilter: "all", participants: list, sortedParticipants: list,
      hideProducers: false, hideConsumers: false, hideMeter: true, memberSort: "participantNumber", actionFirst: true,
    })).result.current
    expect(view(sorted)).toEqual([
      "newWithMeter:AT7", "waiting:", "mixed:AT1,AT2,AT3", "onlyRejected:AT4", "left:AT5", "producer:AT6"])
  })
})

describe("filterParticipant 'period'", () => {
  it("shows the sorted period list, the producer toggle applied", () => {
    const list = [member("a", [meter("AT1", "ACTIVE", "GENERATION")]), member("b", [meter("AT2", "ACTIVE")])]
    const result = renderHook(() => filterParticipant({
      selectedFilter: "period", participants: [], sortedParticipants: list,
      hideProducers: true, hideConsumers: false, hideMeter: false, memberSort: "participantNumber", actionFirst: true,
    })).result.current
    expect(view(result)).toEqual(["b:AT2"])
  })
})
