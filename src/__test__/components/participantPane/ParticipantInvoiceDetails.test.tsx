import {describe, expect, it} from "vitest";
import {act, screen} from "@testing-library/react";
import React from "react";
import {renderWithProviders} from "../../test-utils";
import ParticipantInvoiceDetailsComponent from "../../../components/participantPane/ParticipantInvoiceDetails.component";
import {fetchParticipantModel, selectParticipant} from "../../../store/participant";
import {fetchParticipantAmounts} from "../../../store/billing";
import {ParticipantBillType} from "../../../models/meteringpoint.model";

// platform#217: the joining fee is an own line of the member's billing amounts and counts in the sum

const show = (bill: ParticipantBillType) => {
  const r = renderWithProviders(<ParticipantInvoiceDetailsComponent/>)
  act(() => {
    r.store.dispatch(fetchParticipantModel.fulfilled({participants: [{id: "p1", firstname: "Anna", lastname: "M", meters: []}] as any},
      "req", {tenant: "TE100200"}))
    r.store.dispatch(selectParticipant("p1"))
    r.store.dispatch(fetchParticipantAmounts.fulfilled({participantAmounts: [bill]}, "req", {tenant: "TE100200", billingRunId: "r"}))
  })
  return r
}

describe("ParticipantInvoiceDetails: joining fee", () => {
  it("shows „Beitrittsgebühr“ next to the membership fee and adds it to the sum", () => {
    show({id: "p1", amount: 0, participantFee: 2, joiningFee: 60, meteringPoints: []})
    expect(screen.getByText("Mitgliedsbeitrag:")).toBeInTheDocument()
    expect(screen.getByText("Beitrittsgebühr:")).toBeInTheDocument()
    expect(screen.getByText("60,00 €")).toBeInTheDocument()
    expect(screen.getByText("62,00")).toBeInTheDocument()
  })

  it("shows a member with only the joining fee (membership fee 0)", () => {
    show({id: "p1", amount: 0, participantFee: 0, joiningFee: 49.9, meteringPoints: []})
    expect(screen.getByText("Beitrittsgebühr:")).toBeInTheDocument()
    expect(screen.queryByText("Mitgliedsbeitrag:")).toBeNull()
    expect(screen.getByText("49,90")).toBeInTheDocument()
  })

  it("has no line without a joining fee (older billing without the field)", () => {
    show({id: "p1", amount: 0, participantFee: 2, meteringPoints: []})
    expect(screen.queryByText("Beitrittsgebühr:")).toBeNull()
  })
})
