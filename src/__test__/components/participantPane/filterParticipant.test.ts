import {describe, it, expect} from "vitest";
import {renderHook} from "@testing-library/react";
import {EegParticipant} from "../../../models/members.model";
import {Metering} from "../../../models/meteringpoint.model";
import {filterParticipant} from "../../../components/participantPane/ParticipantPane.effects";

const meter = (id: string, status: string, direction = "CONSUMPTION") =>
  ({meteringPoint: id, status, processState: status, direction} as Metering)

const member = (id: string, meters: Metering[]) => ({id, status: "ACTIVE", meters} as EegParticipant)

const run = (selectedFilter: string, participants: EegParticipant[], hideProducers = false) =>
  renderHook(() => filterParticipant({
    selectedFilter, participants, sortedParticipants: participants,
    hideProducers, hideConsumers: false, hideMeter: true, memberSort: "standard",
  })).result.current

describe("filterParticipant 'active'", () => {
  const list = [
    member("mixed", [meter("AT1", "ACTIVE"), meter("AT2", "INACTIVE"), meter("AT3", "NEW")]),
    member("left", [meter("AT4", "INACTIVE")]),
    member("producer", [meter("AT5", "ACTIVE", "GENERATION")]),
  ]

  it("keeps members with an active metering point and shows only the active ones", () => {
    const result = run("active", list)
    expect(result.map(p => p.id)).toEqual(["mixed", "producer"])
    expect(result[0].meters.map(m => m.meteringPoint)).toEqual(["AT1"])
  })

  it("drops a member whose only active metering points are hidden producers", () => {
    expect(run("active", list, true).map(p => p.id)).toEqual(["mixed"])
  })
})
