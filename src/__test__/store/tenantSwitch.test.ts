import {afterEach, describe, expect, it, vi} from "vitest";
import {configureStore} from "@reduxjs/toolkit";
import {reducer} from "../../store/store";
import {selectTenant} from "../../store/eeg";
import {fetchParticipantModel, selectParticipant} from "../../store/participant";
import {fetchRatesModel} from "../../store/rate";
import {fetchEnergyReportV2, setSelectedPeriod} from "../../store/energy";
import {BILLING_POLL_STOPPED, fetchParticipantAmounts, resumeEnergyBillsPolling} from "../../store/billing";
import {Api} from "../../service";
import {fetchBillingConfig} from "../../store/billingConfig/actions";
import {fetchBillingRunById} from "../../store/billingRun/actions";
import {participantApi} from "../../store/participant/api";

// 261024-ca13: a community (tenant) switch must not leave anything of the previous community in the store,
// and an answer to a request of the previous community must not land after the switch.

const newStore = (tenant = "RC100100") => {
  const store = configureStore({reducer, middleware: (d) => d({serializableCheck: false})})
  store.dispatch(selectTenant(tenant))
  return store
}

const participant = (id: string) => ({id, meters: []}) as any
const loadMembers = (tenant: string, ids: string[]) =>
  fetchParticipantModel.fulfilled({participants: ids.map(participant)}, "req-" + tenant, {tenant})

const fillCommunity = (store: ReturnType<typeof newStore>, tenant: string) => {
  store.dispatch(loadMembers(tenant, ["a1", "a2"]))
  store.dispatch(selectParticipant("a1"))
  store.dispatch(fetchRatesModel.fulfilled({rates: [{id: "t1"} as any]}, "r", {tenant}))
  store.dispatch(setSelectedPeriod({type: "YM", year: 2026, segment: 9}))
  store.dispatch(fetchEnergyReportV2.fulfilled({report: {totalConsumption: 5, totalProduction: 7, meta: [],
    participantReports: [{participantId: "a1", meters: []}]}} as any, "e", {tenant: {tenant}} as any))
  store.dispatch(fetchParticipantAmounts.fulfilled({participantAmounts: [{id: "a1"} as any]}, "b", {tenant, billingRunId: "x"}))
  store.dispatch(fetchBillingConfig.fulfilled({billingConfig: {id: "cfg"} as any}, "c", {tenant}))
}

describe("community switch (261024-ca13)", () => {
  it("clears members, selection, tariffs, energy and billing data of the previous community", () => {
    const store = newStore("RC100100")
    fillCommunity(store, "RC100100")

    store.dispatch(selectTenant("RC100200"))

    const s = store.getState()
    expect(s.eeg.selectedTenant).toBe("RC100200")
    expect(s.participant.ids).toEqual([])
    expect(s.participant.selectedParticipant?.id).toBeUndefined()
    expect(s.rate.ids).toEqual([])
    expect(s.energy.participantReports.ids).toEqual([])
    expect(s.energy.totalConsumption).toBe(0)
    expect(s.energy.selectedPeriod).toBeUndefined()
    expect(s.billing.ids).toEqual([])
    expect(s.billingConfig.billingConfig).not.toEqual({id: "cfg"})
  })

  it("keeps the data when the same community is selected again (case-insensitive)", () => {
    const store = newStore("RC100100")
    fillCommunity(store, "RC100100")

    store.dispatch(selectTenant("rc100100"))

    expect(store.getState().participant.ids).toEqual(["a1", "a2"])
    expect(store.getState().rate.ids).toEqual(["t1"])
  })

  it("ignores the member list of the previous community that answers after the switch", () => {
    const store = newStore("RC100100")
    store.dispatch(selectTenant("RC100200"))

    store.dispatch(loadMembers("RC100100", ["old"]))
    expect(store.getState().participant.ids).toEqual([])

    store.dispatch(loadMembers("rc100200", ["new"]))
    expect(store.getState().participant.ids).toEqual(["new"])
  })

  it("ignores a late energy report of the previous community (tenant passed as object)", () => {
    const store = newStore("RC100100")
    store.dispatch(selectTenant("RC100200"))

    store.dispatch(fetchEnergyReportV2.fulfilled({report: {totalConsumption: 5, totalProduction: 7, meta: [],
      participantReports: [{participantId: "old", meters: []}]}} as any, "e", {tenant: {tenant: "RC100100"}} as any))

    expect(store.getState().energy.participantReports.ids).toEqual([])
  })

  it("ignores a late failure of the previous community", () => {
    const store = newStore("RC100100")
    store.dispatch(selectTenant("RC100200"))
    store.dispatch(fetchBillingConfig.fulfilled({billingConfig: {id: "new"} as any}, "c", {tenant: "RC100200"}))

    store.dispatch(fetchBillingConfig.rejected(new Error("x"), "c-old", {tenant: "RC100100"}))

    expect(store.getState().billingConfig.billingConfig).toEqual({id: "new"})
  })

  it("ignores a late participant mutation (RTK Query) of the previous community", () => {
    const store = newStore("RC100100")
    store.dispatch(selectTenant("RC100200"))

    const lateAnswer = (tenant: string) => ({
      type: `${participantApi.reducerPath}/executeMutation/fulfilled`,
      payload: participant("old"),
      meta: {
        requestId: "m", requestStatus: "fulfilled", fulfilledTimeStamp: 0,
        arg: {type: "mutation", endpointName: "persistBusinessType", originalArgs: {}, track: true},
        baseQueryMeta: {request: new Request("http://localhost/participant/v2/old", {headers: {tenant}})},
      },
    })
    expect(participantApi.endpoints.persistBusinessType.matchFulfilled(lateAnswer("RC100100"))).toBe(true)

    store.dispatch(lateAnswer("RC100100"))
    expect(store.getState().participant.selectedParticipant?.id).toBeUndefined()

    store.dispatch(lateAnswer("RC100200"))
    expect(store.getState().participant.selectedParticipant?.id).toBe("old")
  })

  it("ignores a request start of the previous community (no loading flag, selection kept)", () => {
    const store = newStore("RC100100")
    store.dispatch(selectTenant("RC100200"))
    store.dispatch(loadMembers("RC100200", ["b1"]))
    store.dispatch(selectParticipant("b1"))

    // e.g. the billing run poller of the previous community asks again every 2 s
    store.dispatch(fetchBillingRunById.pending("p-old", {tenant: "RC100100", billingRunId: "r1"}))
    store.dispatch(fetchParticipantModel.pending("m-old", {tenant: "RC100100"}))

    expect(store.getState().billingRun.isFetching).toBe(false)
    expect(store.getState().participant.selectedParticipant?.id).toBe("b1")
  })
})

describe("billing run poller on a community switch (261024-ca13)", () => {
  afterEach(() => { vi.useRealTimers() })

  const fakeBackend = () => {
    vi.useFakeTimers();
    const fetchBillingRunById = vi.fn().mockImplementation(async () => ({id: "r1", runStatus: "RUNNING"}));
    (Api as any).eegService = {fetchBillingRunById, fetchParticipantAmounts: vi.fn().mockResolvedValue([])}
    return fetchBillingRunById
  }

  it("stops polling the previous community's run, without a loading flag in the new one", async () => {
    const calls = fakeBackend()
    const store = newStore("RC100100")
    const poll = store.dispatch(resumeEnergyBillsPolling({tenant: "RC100100", billingRunId: "r1"}))
    await vi.advanceTimersByTimeAsync(0)
    expect(calls).toHaveBeenCalledTimes(1)

    store.dispatch(selectTenant("RC100200"))
    await vi.advanceTimersByTimeAsync(10000)

    expect(calls).toHaveBeenCalledTimes(1)
    expect((await poll).payload).toBe(BILLING_POLL_STOPPED)
    expect(store.getState().billingRun.isFetching).toBe(false)
    expect(store.getState().billing.isPolling).toBe(false)
  })

  it("keeps one poller per run when switching back before the old one noticed", async () => {
    const calls = fakeBackend()
    const store = newStore("RC100100")
    const first = store.dispatch(resumeEnergyBillsPolling({tenant: "RC100100", billingRunId: "r1"}))
    await vi.advanceTimersByTimeAsync(0)

    store.dispatch(selectTenant("RC100200"))
    store.dispatch(selectTenant("RC100100"))
    // the resume effect of the member list attaches again to the running run
    store.dispatch(resumeEnergyBillsPolling({tenant: "RC100100", billingRunId: "r1"}))
    await vi.advanceTimersByTimeAsync(0)

    calls.mockClear()
    await vi.advanceTimersByTimeAsync(6000)
    expect(calls).toHaveBeenCalledTimes(3)  // the new poller only, every 2 s
    expect((await first).payload).toBe(BILLING_POLL_STOPPED)
    expect(store.getState().billing.isPolling).toBe(true)  // the stopped poller does not end the new one's flag
  })
})
