import {afterEach, describe, expect, it, vi} from "vitest";
import {act, cleanup} from "@testing-library/react";
import React from "react";
import {MemoryRouter} from "react-router";
import "../../util/I18n";
import {renderWithProviders} from "../test-utils";
import {EegContext, EegState} from "../../store/hook/Eeg.provider";
import {Eeg} from "../../models/eeg.model";
import {fetchEegModel, selectTenant} from "../../store/eeg";

vi.mock("react-oidc-context", () => ({useAuth: () => ({})}))
// one list for every render: the EEG page sorts it in an effect on it
const tenants = vi.hoisted(() => ["RC100100"])
vi.mock("../../store/hook/AuthProvider", () => ({useTenants: () => tenants}))
vi.mock("../../components/EegBillingConfigCard.component", () => ({default: () => <div>Abrechnungs-Einstellungen</div>}))

import EegPage from "../../pages/Eeg.page";

// platform#281: the grid operator fields are read only for non-admins, like the other fields of the page
const TENANT = "RC100100"
const eeg = {id: TENANT, name: "Test", rcNumber: TENANT, area: "LOCAL", allocationMode: "DYNAMIC",
  settlementInterval: "MONTHLY", online: true, gridOperator: "AT003000", operatorName: "Netz NÖ",
  address: {}, contact: {}, accountInfo: {}, optionals: {}} as unknown as Eeg
const ctx = (admin: boolean) => ({tenant: TENANT, eeg, getTenants: () => [],
  isAdmin: () => admin, isOwner: () => false, isUser: () => !admin, setTenant: () => {}, refresh: () => {}} as unknown as EegState)

describe("EEG page: grid operator fields (platform#281)", () => {
  afterEach(() => cleanup())

  it.each([[true, false], [false, true]])("admin %s: grid operator ID and name read only %s", (admin, readonly) => {
    const r = renderWithProviders(<MemoryRouter><EegContext.Provider value={ctx(admin)}><EegPage/></EegContext.Provider></MemoryRouter>)
    act(() => {
      r.store.dispatch(selectTenant(TENANT))
      r.store.dispatch(fetchEegModel.fulfilled({eeg}, "req", {tenant: TENANT}))
    })
    const input = (label: string) => r.container.querySelector(`ion-input[label="${label}"]`) as any
    expect(input("Netzbetreiber-ID").readonly).toBe(readonly)
    expect(input("Netzbetreiber-Name").readonly).toBe(readonly)
    // the same as the other fields of the page
    expect(input("Firmennummer").readonly).toBe(readonly)
  })
})
