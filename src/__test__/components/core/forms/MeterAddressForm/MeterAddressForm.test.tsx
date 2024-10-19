import { describe, expect, it } from "vitest";
import {renderWithReactHookForm} from "../../../../test-utils";
import {screen, waitFor} from "@testing-library/react";
import React from "react";
import MeterAddressFormElement from "../../../../../components/core/forms/MeterAddressForm/MeterAddressForm.element";
import {EegParticipant} from "../../../../../models/members.model";
import {AccountInfo, Address, Contact, Optionals} from "../../../../../models/eeg.model";
import {Metering} from "../../../../../models/meteringpoint.model";
import {EegContext, EegState} from "../../../../../store/hook/Eeg.provider";
import userEvent from "@testing-library/user-event";

const defaultParticipant: EegParticipant = {
  accountInfo: {} as AccountInfo,
  billingAddress: {city: "Solarcity", street: "Sonnenweg", streetNumber: "1", zip: "1111", type: "BILLING" } as Address,
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


const ctxValue = (admin: boolean, owner: boolean, user: boolean) => { return {
  eeg: undefined,
  isAdmin: () => {return admin},
  isOwner: () => owner,
  isUser: () => user,
  setTenant: (tenant: string) => {},
  refresh: async () => 1
} as EegState }

const findByName = (container: HTMLElement | null, value: string) => {
  if (container === null) return null
  return container.querySelector(`[name=${value}]`)
}


const renderElement = (online: boolean, admin: boolean, owner: boolean, status: string = 'ACTIVE', isEditable?: boolean) => {
  return renderWithReactHookForm(
    <EegContext.Provider value={ctxValue(admin, owner, false)} >
      <MeterAddressFormElement participant={defaultParticipant} isOnline={online} isEditable={isEditable} showActivationMode={false}/>
    </EegContext.Provider>, { defaultValues: {
        status: status,
        participantId: "",
        meteringPoint: "",
        direction: "CONSUMPTION",
        registeredSince: new Date(2023, 0, 1, 0, 0, 0, 0)
      } as Metering }
    )
}

describe("<MeterAddressForm />", () => {

  it("display all address related inputs without admin privilege for online meters", async () => {
    renderElement(true, false, false )

    await screen.findByText("Adresse")
    await screen.findAllByText("Hausnummer")
    await screen.findAllByText("Straße")
    await screen.findAllByText("Postleitzahl")
    await screen.findAllByText("Ort")

    expect(screen.queryByText('Noch nicht registriert')).not.toBeInTheDocument()
    expect(screen.queryByText('Bereits registriert')).not.toBeInTheDocument()
  });

  it("display all address related inputs for offline meters", async () => {
    renderElement(false, true, false, 'ACTIVE' )

    await screen.findByText("Adresse")
    await screen.findAllByText("Hausnummer")
    await screen.findAllByText("Straße")
    await screen.findAllByText("Postleitzahl")
    await screen.findAllByText("Ort")

    screen.getByText('Noch nicht registriert')
    const stateBox = screen.getByText((content, element) => element!.tagName.toLowerCase() === 'ion-select');
    expect(stateBox).toHaveAttribute('label', 'Status')
    expect(stateBox).toHaveValue("ACTIVE")
  });

  it("render inputs for offline meters, status NEW", async () => {
    renderElement(false, true, false, 'NEW')

    await screen.findByText("Adresse")
    await screen.findAllByText("Hausnummer")
    await screen.findAllByText("Straße")
    await screen.findAllByText("Postleitzahl")
    await screen.findAllByText("Ort")

    screen.getByText('Noch nicht registriert')
    const stateBox = screen.getByText((content, element) => element!.tagName.toLowerCase() === 'ion-select');
    expect(stateBox).toHaveAttribute('label', 'Status')
    expect(stateBox).toHaveValue("NEW")
  });

  it("render checkbox take over address", async () => {
    const {container} = renderElement(false, true, false, 'NEW', true)
    const checkhbox = screen.getByText(/Adresse vom Besitzer übernehmen/i)

    userEvent.click(checkhbox)

    await waitFor(() => {
      const streetNumber = findByName(container, "street")
      expect(streetNumber).toHaveValue("Sonnenweg")
    })
  });
})