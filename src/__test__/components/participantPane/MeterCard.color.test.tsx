import React from "react";
import {screen} from "@testing-library/react";
import {describe, expect, it} from "vitest";
import MeterCardComponent from "../../../components/participantPane/MeterCard.component";
import {EegParticipant} from "../../../models/members.model";
import {Metering, MeteringProcessStateType} from "../../../models/meteringpoint.model";
import {renderWithProviders} from "../../test-utils";

// platform#277: colour of the metering point card by its process state
const GREEN = "rgb(30, 70, 64)"
const ORANGE = "rgb(220, 99, 30)"
const RED = "rgb(220, 30, 30)"

const participant = {id: "p1", status: "ACTIVE", meters: []} as unknown as EegParticipant

const rowColor = (processState: MeteringProcessStateType) => {
  const meter = {meteringPoint: "AT0030000000000000000000000000001", equipmentName: "Haus",
    direction: "CONSUMPTION", processState} as Metering
  renderWithProviders(<MeterCardComponent participant={participant} meter={meter} hideMeter={true}/>)
  return (screen.getByText("Haus").closest("ion-row") as HTMLElement).style.color
}

describe("MeterCard colour per process state", () => {
  it.each([
    ["ACTIVE", GREEN],
    ["INACTIVE", GREEN],
    ["NEW", ORANGE],
    ["INIT", ORANGE],
    ["PENDING", ORANGE],
    ["APPROVED", ORANGE],
    ["REJECTED", RED],
    ["REVOKED", RED],
    ["INVALID", RED],
  ] as [MeteringProcessStateType, string][])("%s is shown in %s", (state, color) => {
    expect(rowColor(state)).toBe(color)
  })

  it("a meter of a pending member is orange", () => {
    const meter = {meteringPoint: "AT0030000000000000000000000000001", equipmentName: "Haus",
      direction: "CONSUMPTION", processState: "REJECTED"} as Metering
    renderWithProviders(<MeterCardComponent participant={{...participant, status: "PENDING"} as EegParticipant}
                                            meter={meter} hideMeter={true}/>)
    expect((screen.getByText("Haus").closest("ion-row") as HTMLElement).style.color).toBe(ORANGE)
  })
})
