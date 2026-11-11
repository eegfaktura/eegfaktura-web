import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
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
import {ratesSelector} from "../../store/rate";

// platform#229: tariffs are loaded only for a community with billing, decided by the type its own EEG load returned
const eegOf = (tenant: string) => ({id: tenant, area: tenant.startsWith("PP") ? "P2P" : "LOCAL", settlementInterval: "MONTHLY"})
const fetchEeg = vi.fn(async (tenant: string): Promise<any> => eegOf(tenant))
const fetchRates = vi.fn(async (tenant: string): Promise<any> => [{id: `${tenant}-t1`, name: `Tarif ${tenant}`, type: "EEG"}])

const SwitchButton = ({to}: {to: string}) => {
  const {setTenant} = useContext(EegContext)
  return <button onClick={() => setTenant(to)}>wechseln</button>
}
const flush = () => act(async () => { await new Promise(r => setTimeout(r, 0)) })

describe("EegProvider: tariffs only with billing (platform#229)", () => {
  const eegService = Api.eegService
  const participantService = Api.participantService
  beforeEach(() => {
    localStorage.removeItem("tenant")
    tenants[0] = "PP100100"
    fetchEeg.mockReset().mockImplementation(async (tenant: string) => eegOf(tenant))
    fetchRates.mockReset().mockImplementation(async (tenant: string) =>
      [{id: `${tenant}-t1`, name: `Tarif ${tenant}`, type: "EEG"}])
    Api.eegService = {fetchEeg, fetchRates} as unknown as typeof Api.eegService
    Api.participantService = {fetchParicipants: vi.fn().mockResolvedValue([])} as unknown as typeof Api.participantService
  })
  afterEach(() => {
    Api.eegService = eegService
    Api.participantService = participantService
  })

  it("loads the tariffs for P2P as well (platform#255), and again after a switch", async () => {
    renderWithProviders(<EegProvider><SwitchButton to="RC100100"/></EegProvider>)
    await waitFor(() => expect(fetchRates).toHaveBeenCalledWith("PP100100", undefined))

    fireEvent.click(screen.getByText("wechseln"))
    await waitFor(() => expect(fetchRates).toHaveBeenCalledTimes(2))
    expect(fetchRates.mock.calls[1][0]).toBe("RC100100")
  })

  it("a failed EEG load loads the tariffs as before; the previous community's tariffs do not stay", async () => {
    tenants[0] = "RC100100"
    const r = renderWithProviders(<EegProvider><SwitchButton to="RC300300"/></EegProvider>)
    await waitFor(() => expect(ratesSelector(r.store.getState()).map(t => t.id)).toEqual(["RC100100-t1"]))

    fetchEeg.mockImplementation(async (tenant: string) => { throw new Error(`Bad Gateway ${tenant}`) })
    fetchRates.mockImplementation(() => new Promise(() => undefined))  // C's tariffs still on their way
    fireEvent.click(screen.getByText("wechseln"))
    await waitFor(() => expect(fetchRates).toHaveBeenCalledWith("RC300300", undefined))
    expect(ratesSelector(r.store.getState())).toEqual([])
  })

  it("a late EEG answer of the previous community requests no tariffs for it", async () => {
    tenants[0] = "RC100100"
    let answerA!: (eeg: any) => void
    fetchEeg.mockImplementation((tenant: string) =>
      tenant === "RC100100" ? new Promise(r => { answerA = r }) : Promise.resolve(eegOf(tenant)))
    renderWithProviders(<EegProvider><SwitchButton to="RC200200"/></EegProvider>)
    await waitFor(() => expect(fetchEeg).toHaveBeenCalledWith("RC100100", undefined))

    fireEvent.click(screen.getByText("wechseln"))
    await waitFor(() => expect(fetchRates).toHaveBeenCalledWith("RC200200", undefined))
    await act(async () => { answerA(eegOf("RC100100")) })
    await flush()
    expect(fetchRates.mock.calls.map(c => c[0])).toEqual(["RC200200"])
  })
})
