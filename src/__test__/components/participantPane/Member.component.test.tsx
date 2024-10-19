import React from "react";
import {screen} from "@testing-library/react";
import MemberComponent from "../../../components/participantPane/Member.component";
import {EegParticipant} from "../../../models/members.model";
import {renderWithProviders} from "../../test-utils";
import {AccountInfo, Address, Contact, Optionals} from "../../../models/eeg.model";
import {Metering} from "../../../models/meteringpoint.model";
import { describe, beforeAll, it, expect, vi } from "vitest";

const defaultParticipant: EegParticipant = {
  accountInfo: {} as AccountInfo,
  billingAddress: {} as Address,
  residentAddress: {} as Address,
  businessRole: 'EEG_PRIVATE',
  contact: {} as Contact,
  firstname: "Max",
  id: "1234567890",
  lastname: "Mustermann",
  meters: [{meteringPoint: "AT0000000000000000000000000000001", direction: 'CONSUMPTION', status: 'ACTIVE'} as Metering],
  optionals: {} as Optionals,
  participantNumber: "001",
  participantSince: new Date(2023, 0, 1),
  role: 'EEG_USER',
  status: 'ACTIVE',
  tariffId: "",
  taxNumber: "",
  titleAfter: "",
  titleBefore: ""
}

describe("<MemberComponent />", () => {
  beforeAll(() => {

  })

  it("displays the header", async () => {

    const { container, findAllByRole  } = renderWithProviders(
      <MemberComponent hideMember={false} hideMeter={false} isChecked={false} participant={defaultParticipant}
                       showDetailsPage={(e) => {}}
                       showAmount={false}
                       onCheck={(e) => {}}
                       onShowAddMeterPage={(e) => () => vi.fn()} />);
    // console.log(container)
    // const role = screen.getByText(/Max Mustermann/)
    expect(screen.getByText(/Max Mustermann/)).toBeInTheDocument();
  });
})