import {afterEach, describe, expect, it, vi} from "vitest";
import {act, cleanup, screen} from "@testing-library/react";
import React from "react";
import {MemoryRouter} from "react-router";
import "../../util/I18n";
import {renderWithProviders} from "../test-utils";
import {EegContext, EegState} from "../../store/hook/Eeg.provider";
import {Eeg} from "../../models/eeg.model";
import {EegParticipant} from "../../models/members.model";
import {fetchEegModel, selectTenant} from "../../store/eeg";
import {fetchParticipantModel} from "../../store/participant";
import {ParticipantContext} from "../../store/hook/ParticipantProvider";
import {MemberViewContext} from "../../store/hook/MemberViewProvider";

vi.mock("react-oidc-context", () => ({useAuth: () => ({})}))
// one list for every render: the EEG page sorts it in an effect on it
const tenants = vi.hoisted(() => ["PP100100"])
vi.mock("../../store/hook/AuthProvider", () => ({useTenants: () => tenants}))
vi.mock("../../components/EegBillingConfigCard.component", () => ({default: () => <div>Abrechnungs-Einstellungen</div>}))
// jsdom has no layout: the virtual list renders every row
vi.mock("react-virtuoso", () => ({
  Virtuoso: ({totalCount, itemContent, context}: any) =>
    <div>{Array.from({length: totalCount}, (_, i) => <div key={i}>{itemContent(i, undefined, context)}</div>)}</div>,
}))
// bought and sold with two metering points without a tariff, without energy data in the store
vi.mock("../../components/dashboard/EnergyOverview.functions", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../components/dashboard/EnergyOverview.functions")>()),
  tradedSummary: () => ({taken: 5, spent: 3, withoutTariff: 2, withoutTariffKwh: 10}),
}))

import EegPage from "../../pages/Eeg.page";
import ParticipantPaneComponent from "../../components/participantPane/ParticipantPane.component";
import EegOverviewComponent from "../../components/dashboard/EegOverview.component";
import EnergyOverviewComponent from "../../components/dashboard/EnergyOverview.component";
import {PieSeriesType} from "../../pages/Dashboard.page";

// platform#229: no billing for P2P and EVA on the EEG page, in the member list and on the dashboard
const TENANT = "PP100100"
const eegOf = (area: string) => ({id: TENANT, name: "Test", rcNumber: TENANT, area, allocationMode: "DYNAMIC",
  settlementInterval: "MONTHLY", online: true, address: {}, contact: {}, accountInfo: {}, optionals: {}} as unknown as Eeg)
const ctx = (area: string) => ({tenant: TENANT, eeg: eegOf(area), getTenants: () => [],
  isAdmin: () => true, isOwner: () => false, isUser: () => false, setTenant: () => {}, refresh: () => {}} as unknown as EegState)

const member = {id: "001", firstname: "Anna", lastname: "Muster", businessRole: "EEG_PRIVATE", status: "ACTIVE",
  participantNumber: "001", meters: [{meteringPoint: "AT0030000000000000000000000000001", direction: "CONSUMPTION",
    status: "ACTIVE", processState: "ACTIVE"}]} as unknown as EegParticipant

describe("no billing for P2P and EVA (platform#229): pages", () => {
  afterEach(() => cleanup())

  it.each([["P2P", false], ["LOCAL", true]])("EEG page of %s: interval and billing settings shown = %s", (area, shown) => {
    const r = renderWithProviders(<MemoryRouter><EegContext.Provider value={ctx(area)}><EegPage/></EegContext.Provider></MemoryRouter>)
    act(() => {
      r.store.dispatch(selectTenant(TENANT))
      r.store.dispatch(fetchEegModel.fulfilled({eeg: eegOf(area)}, "req", {tenant: TENANT}))
    })
    expect(!!r.container.querySelector('ion-select[label="Abrechnungsintervall"]')).toBe(shown)
    expect(!!screen.queryByText("Abrechnungs-Einstellungen")).toBe(shown)
    const model = r.container.querySelector('ion-input[label="Modell"]') as any
    expect(model.value).toBe(area === "P2P" ? "P2P (Peer-to-Peer)" : "EEG lokal (Erneuerbare-Energie-Gemeinschaft, lokal)")
  })

  // platform#245: no card „Einstellungen“ and no second community select; the interval is in „Allgemeines“
  it("EEG page: interval in „Allgemeines“, no card „Einstellungen“", () => {
    const r = renderWithProviders(<MemoryRouter><EegContext.Provider value={ctx("LOCAL")}><EegPage/></EegContext.Provider></MemoryRouter>)
    act(() => {
      r.store.dispatch(selectTenant(TENANT))
      r.store.dispatch(fetchEegModel.fulfilled({eeg: eegOf("LOCAL")}, "req", {tenant: TENANT}))
    })
    expect(screen.queryByText("Einstellungen")).toBeNull()
    expect(r.container.querySelector('ion-select[label="Auswahl Gemeinschaft"]')).toBeNull()
    const card = r.container.querySelector('ion-select[label="Abrechnungsintervall"]')!.closest(".eeg-property-card")!
    expect(card.querySelector(".header")!.textContent).toBe("Allgemeines")
  })

  // eegfaktura-dev#56 #13: the creditor ID serves direct debit only; the bank account stays
  it.each([["P2P", false], ["EVA", false], ["LOCAL", true]])("EEG page of %s: creditor ID shown = %s", (area, shown) => {
    const r = renderWithProviders(<MemoryRouter><EegContext.Provider value={ctx(area)}><EegPage/></EegContext.Provider></MemoryRouter>)
    act(() => {
      r.store.dispatch(selectTenant(TENANT))
      r.store.dispatch(fetchEegModel.fulfilled({eeg: eegOf(area)}, "req", {tenant: TENANT}))
    })
    const input = (label: string) => !!r.container.querySelector(`ion-input[label="${label}"]`)
    expect(input("Creditor-ID")).toBe(shown)
    expect(["IBAN", "BIC", "Kontoinhaber", "Bankverbindung"].map(input)).toEqual([true, true, true, true])
  })

  // addendum 05.11.2026: the zone level from the metering point list, read only
  it.each([[3, "3 (Lokalbereich – gleiche Trafostation)"], [null, "unbekannt"]])("EEG page with zone level %s shows „%s“", (level, text) => {
    const eeg = {...eegOf("LOCAL"), ecZoneLevel: level} as Eeg
    const r = renderWithProviders(<MemoryRouter><EegContext.Provider value={ctx("LOCAL")}><EegPage/></EegContext.Provider></MemoryRouter>)
    act(() => {
      r.store.dispatch(selectTenant(TENANT))
      r.store.dispatch(fetchEegModel.fulfilled({eeg}, "req", {tenant: TENANT}))
    })
    const zone = r.container.querySelector('ion-input[label="Nahebereich"]') as any
    expect(zone.value).toBe(text)
    expect(zone.readonly).toBe(true)
  })

  it.each([["EVA", false], ["LOCAL", true]])("member list of %s: billing switch and footer shown = %s", (area, shown) => {
    const r = renderWithProviders(
      <EegContext.Provider value={ctx(area)}>
        <ParticipantContext.Provider value={{participants: [member], allParticipants: [member], billingEnabled: true,
          unsaved: {}, setUnsaved: vi.fn(), setBillingEnabled: vi.fn(), setShowAddMeterPane: vi.fn(),
          showDetailsPage: vi.fn(), reloadEnergyReport: vi.fn()} as any}>
          <MemberViewContext.Provider value={{showAmount: true, toggleShowAmount: vi.fn(), toggleMembersMeter: vi.fn(),
            toggleMetering: vi.fn(), hideMeter: false, hideMember: false, hideConsumers: false, hideProducers: false} as any}>
            <ParticipantPaneComponent/>
          </MemberViewContext.Provider>
        </ParticipantContext.Provider>
      </EegContext.Provider>)
    act(() => { r.store.dispatch(fetchParticipantModel.fulfilled({participants: [member]}, "req", {tenant: TENANT})) })
    expect(screen.getAllByText(/Muster/).length).toBeGreaterThan(0)
    expect(!!r.container.querySelector(".eeg-sliding-box")).toBe(shown)
    expect(!!screen.queryByText(/Saldo Zahlungen/)).toBe(shown)
  })

  it.each([["P2P", false], ["GEA", true]])("dashboard of %s: tariff block shown = %s", (area, shown) => {
    renderWithProviders(<EegContext.Provider value={ctx(area)}>
      <EegOverviewComponent rateMap={{}}/></EegContext.Provider>)
    expect(screen.getByText("Übersicht EEG")).toBeTruthy()
    expect(!!screen.queryByText("Tarife")).toBe(shown)
  })

  // both count only metering points with a tariff: without billing they would always read 0 kWh
  it.each([["EVA", false], ["LOCAL", true]])("dashboard of %s: bought/sold and the hint on metering points without a tariff shown = %s",
    (area, shown) => {
      const series = {name: "", value: 0, fill: ""} as PieSeriesType
      renderWithProviders(<EegContext.Provider value={ctx(area)}>
        <EnergyOverviewComponent consumed={series} produced={series} allocated={series}
                                 rates={{t1: {id: "t1"} as any}}/></EegContext.Provider>)
      expect(screen.getByText("Verteilt")).toBeTruthy()
      expect(!!screen.queryByText("Eingekauft")).toBe(shown)
      expect(!!screen.queryByText("Verkauft")).toBe(shown)
      expect(!!screen.queryByText(/2 Zählpunkte ohne gültigen Tarif sind hier nicht enthalten/)).toBe(shown)
    })
})
