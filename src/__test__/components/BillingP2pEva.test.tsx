import {afterEach, describe, expect, it, vi} from "vitest";
import {act, cleanup, screen} from "@testing-library/react";
import React from "react";
import {MemoryRouter} from "react-router";
import "../../util/I18n";
import {renderWithProviders, renderWithReactHookForm} from "../test-utils";
import {EegContext, EegState} from "../../store/hook/Eeg.provider";
import {Eeg} from "../../models/eeg.model";
import {EegParticipant} from "../../models/members.model";
import {Metering} from "../../models/meteringpoint.model";
import {fetchParticipantModel, selectMetering, selectParticipant} from "../../store/participant";
import {ParticipantContext} from "../../store/hook/ParticipantProvider";

vi.mock("react-oidc-context", () => ({useAuth: () => ({})}))
vi.mock("../../store/hook/AuthProvider", () => ({useUser: () => undefined}))
vi.mock("../../components/core/JoiningFeeMember.component", () => ({default: () => <div>Beitrittsgebühr</div>}))
vi.mock("../../components/RateDetailPane.component", () => ({default: () => <div/>}))
vi.mock("../../components/core/MeterForm.component", () => ({default: () => <div/>}))
vi.mock("../../components/participantPane/ContractDocument.component", () => ({default: () => <div/>}))
vi.mock("../../components/participantPane/MeterChart.component", () => ({default: () => <div/>}))

import Menu from "../../components/Menu";
import MemberFormComponent from "../../components/core/MemberForm.component";
import MeterFormElement from "../../components/core/MeterForm.element";
import ParticipantDetailsPaneComponent from "../../components/participantPane/ParticipantDetailsPane.component";
import RatesPage from "../../pages/Rates.page";
import ParticipantRegisterCommonPaneComponent from "../../components/ParticipantRegisterCommonPane.component";
import {FormProvider, useForm} from "react-hook-form";

// the new-member form with a stored direct debit and no IBAN; „prüfen“ validates like the submit does
const RegisterForm: React.FC = () => {
  const methods = useForm<EegParticipant>({defaultValues: {status: "NEW",
    accountInfo: {iban: "", owner: "", sepaDirectDebit: "CORE"}} as unknown as EegParticipant})
  return <FormProvider {...methods}>
    <ParticipantRegisterCommonPaneComponent participant={{status: "NEW"} as EegParticipant} submitId="" onAdd={vi.fn()}/>
    <button onClick={() => methods.trigger()}>prüfen</button>
  </FormProvider>
}

// Peer-to-peer and self-supply get every billing function like the other types (platform#255; until then hidden,
// platform#229): tariffs, billing, invoices, joining fee, for admins and members. Only the final run is missing.
const ctx = (area: string, admin = false) => ({
  tenant: "RC100100",
  eeg: {name: "Test", area, allocationMode: "DYNAMIC", online: true} as unknown as Eeg,
  getTenants: () => [],
  isAdmin: () => admin, isOwner: () => false, isUser: () => !admin,
  setTenant: () => {}, refresh: () => {},
} as unknown as EegState)

const withEeg = (area: string, ui: React.ReactElement, admin = false) =>
  <MemoryRouter><EegContext.Provider value={ctx(area, admin)}>{ui}</EegContext.Provider></MemoryRouter>

const participant = {
  id: "p1", participantNumber: "001", firstname: "Anna", lastname: "Muster", businessRole: "EEG_PRIVATE",
  status: "ACTIVE", billingAddress: {}, residentAddress: {}, contact: {phone: "", email: "anna@example.org"},
  accountInfo: {iban: "", owner: "", sepaDirectDebit: "NONE"},
  meters: [{meteringPoint: "AT0030000000000000000000000000001", direction: "CONSUMPTION", status: "ACTIVE", processState: "ACTIVE"}],
} as unknown as EegParticipant

describe("P2P and EVA have the billing functions (platform#255)", () => {
  afterEach(() => cleanup())

  it.each(["P2P", "EVA", "LOCAL", "BEG"])("the menu has „Tarife“ for %s, also for members", (area) => {
    renderWithProviders(withEeg(area, <Menu/>))
    expect(screen.getByText("Tarife")).toBeTruthy()
  })

  it("the tariffs page of P2P is the normal page, no „no billing“ text", () => {
    renderWithProviders(withEeg("P2P", <RatesPage/>))
    expect(screen.queryByText(/keine Abrechnung vorgesehen/)).toBeNull()
  })

  it.each([["P2P", true], ["LOCAL", true]])("member details of %s: tariff, joining fee and direct debit shown = %s", (area, shown) => {
    const {container} = renderWithProviders(withEeg(area,
      <ParticipantContext.Provider value={{setUnsaved: vi.fn()} as any}>
        <MemberFormComponent participant={participant} rates={[]} formId="" onSubmit={vi.fn()}
                             onSubmitPartial={vi.fn()} changeable={false}/>
      </ParticipantContext.Provider>, true))
    expect(!!container.querySelector('ion-select[label="Mitglieds-Tarif"]')).toBe(shown)
    expect(!!screen.queryByText("Beitrittsgebühr")).toBe(shown)
    expect(!!container.querySelector('ion-select[label="Einzugsart"]')).toBe(shown)
  })

  it.each([["EVA", true], ["LOCAL", true]])("new member of %s: direct debit shown and IBAN required = %s", async (area, shown) => {
    const {container} = renderWithProviders(withEeg(area, <RegisterForm/>))
    expect(!!container.querySelector('ion-select[label="Einzugsart"]')).toBe(shown)
    await act(async () => { screen.getByText("prüfen").click() })
    const iban = container.querySelector('ion-input[label="IBAN"]') as any
    expect(iban.helperText === "IBAN fehlt").toBe(shown)
  })

  it.each([["EVA", true], ["GEA", true]])("metering point of %s: tariff shown = %s", (area, shown) => {
    const {container} = renderWithReactHookForm(
      <EegContext.Provider value={ctx(area, true)}><MeterFormElement rates={[]}/></EegContext.Provider>,
      {defaultValues: {status: "INIT", processState: "NEW", direction: "CONSUMPTION"} as Metering})
    expect(!!container.querySelector('ion-select[label="Tarif"]')).toBe(shown)
  })

  it.each([["P2P", true], ["REGIONAL", true]])("member pane of %s: „Meine Rechnungen“ shown = %s", (area, shown) => {
    const r = renderWithProviders(withEeg(area,
      <ParticipantContext.Provider value={{unsaved: {}, setUnsaved: vi.fn()} as any}>
        <ParticipantDetailsPaneComponent/>
      </ParticipantContext.Provider>))
    act(() => {
      r.store.dispatch(fetchParticipantModel.fulfilled({participants: [participant]}, "req", {tenant: "RC100100"}))
      r.store.dispatch(selectParticipant("p1"))
      r.store.dispatch(selectMetering(participant.meters[0].meteringPoint))
    })
    expect(!!screen.queryByText("Meine Rechnungen")).toBe(shown)
    expect(screen.getByText("Dokumente")).toBeTruthy()
  })
})
