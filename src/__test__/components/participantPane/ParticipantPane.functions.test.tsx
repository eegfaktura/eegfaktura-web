import ParticipantPaneComponent from "../../../components/participantPane/ParticipantPane.component";
import {render} from "@testing-library/react";
import {renderWithProviders} from "../../test-utils";
import React from "react";
import {AccountInfo, Address, Contact, Optionals} from "../../../models/eeg.model";
import {Metering} from "../../../models/meteringpoint.model";
import {buildAllocationMapFromSelected} from "../../../components/participantPane/ParticipantPane.functions";
import {EegParticipant} from "../../../models/members.model"; // ES6

describe("<ParticipantPane/> Functions", () => {
  beforeAll(() => {

  })

  it("allocate invoice member and metering points", async () => {
    const participants = [{
      accountInfo: {} as AccountInfo,
      billingAddress: {} as Address,
      residentAddress: {} as Address,
      businessRole: 'EEG_PRIVATE',
      contact: {} as Contact,
      firstname: "Max",
      id: "1234567890",
      lastname: "Mustermann",
      meters: [{
        meteringPoint: "AT0000000000000000000000000000001",
        direction: 'CONSUMPTION',
        processState: 'ACTIVE'
      } as Metering,
      {
        meteringPoint: "AT0000000000000000000000000000002",
        direction: 'CONSUMPTION',
        processState: 'ACTIVE'
      } as Metering],
      optionals: {} as Optionals,
      participantNumber: "001",
      participantSince: new Date(2023, 0, 1),
      role: 'EEG_USER',
      status: 'ACTIVE',
      tariffId: "",
      taxNumber: "",
      titleAfter: "",
      titleBefore: ""} as EegParticipant
    ]

    const checkedParticipants = {"1234567890": true}
    const meterGroup = {"AT0000000000000000000000000000001": 10, "AT0000000000000000000000000000002": 0}

    const r = buildAllocationMapFromSelected(participants, checkedParticipants)
    expect(r.length).toEqual(1)
    expect(r).toEqual([{meteringPoint: 'AT0000000000000000000000000000001', allocationKWh: 10}])
  });
})