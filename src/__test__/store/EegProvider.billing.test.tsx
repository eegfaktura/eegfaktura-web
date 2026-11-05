import {beforeEach, describe, expect, it, vi} from "vitest";
import {act, fireEvent, screen, waitFor} from "@testing-library/react";
import React, {useContext} from "react";
import {renderWithProviders} from "../test-utils";
import {Api} from "../../service";

// one list for every render: a new array would activate the community again on each render
const tenants = vi.hoisted(() => ["PP100100"])
vi.mock("react-oidc-context", () => ({useAuth: () => ({})}))
vi.mock("../../store/hook/AuthProvider", () => ({useTenants: () => tenants, useGroups: () => [], useRoles1: () => []}))
vi.mock("../../store/user/userApi", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../store/user/userApi")>()),
  useLazyGetUserQuery: () => [vi.fn().mockResolvedValue({})],
}))

import {EegContext, EegProvider} from "../../store/hook/Eeg.provider";

// platform#229: tariffs are loaded only for a community with billing, decided by the type its own EEG load returned
const fetchEeg = vi.fn(async (tenant: string) =>
  ({id: tenant, area: tenant.startsWith("PP") ? "P2P" : "LOCAL", settlementInterval: "MONTHLY"}))
const fetchRates = vi.fn().mockResolvedValue([])

const SwitchButton = () => {
  const {setTenant} = useContext(EegContext)
  return <button onClick={() => setTenant("RC100100")}>wechseln</button>
}

describe("EegProvider: tariffs only with billing (platform#229)", () => {
  beforeEach(() => {
    localStorage.removeItem("tenant")
    fetchEeg.mockClear()
    fetchRates.mockClear()
    Api.eegService = {fetchEeg, fetchRates} as unknown as typeof Api.eegService
    Api.participantService = {fetchParicipants: vi.fn().mockResolvedValue([])} as unknown as typeof Api.participantService
  })

  it("loads no tariffs for P2P, and loads them after a switch to a LOCAL community", async () => {
    renderWithProviders(<EegProvider><SwitchButton/></EegProvider>)
    await waitFor(() => expect(fetchEeg).toHaveBeenCalledWith("PP100100", undefined))
    await act(async () => { await new Promise(r => setTimeout(r, 0)) })
    expect(fetchRates).not.toHaveBeenCalled()

    fireEvent.click(screen.getByText("wechseln"))
    await waitFor(() => expect(fetchRates).toHaveBeenCalledTimes(1))
    expect(fetchRates.mock.calls[0][0]).toBe("RC100100")
  })
})
