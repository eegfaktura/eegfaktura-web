import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import {configureStore} from "@reduxjs/toolkit";
import * as billing from "../../store/billing";
import * as billingRun from "../../store/billingRun";
import {fetchEnergyBills, fetchParticipantAmounts} from "../../store/billing/actions";
import {Api} from "../../service";

// web#175 review: the amounts reload during a RUNNING run must not make the poller look finished,
// otherwise the resume effect in ParticipantPane starts a second poller for the same run.
const makeStore = () => configureStore({
  reducer: {[billing.featureKey]: billing.reducer, [billingRun.featureKey]: billingRun.reducer},
})

describe("billing polling flag", () => {
  let runStatus = "RUNNING"
  beforeEach(() => {
    vi.useFakeTimers()
    runStatus = "RUNNING";
    (Api as any).eegService = {
      startBilling: vi.fn().mockResolvedValue({status: 202, billingRunId: "r1"}),
      fetchBillingRunById: vi.fn().mockImplementation(async () => ({id: "r1", runStatus})),
      fetchParticipantAmounts: vi.fn().mockResolvedValue([]),
    }
  })
  afterEach(() => {
    vi.useRealTimers()
  })

  it("stays set while fetchEnergyBills polls, even after the amounts reload finished", async () => {
    const store = makeStore()
    const run = store.dispatch(fetchEnergyBills({tenant: "T", invoiceRequest: {} as any}))
    await vi.advanceTimersByTimeAsync(0)
    expect(store.getState().billingRun.billingRun?.runStatus).toBe("RUNNING")

    // what the [billingRun, showAmount] effect does on every poll tick
    await store.dispatch(fetchParticipantAmounts({tenant: "T", billingRunId: "r1"}))
    expect(billing.selectBillPollingSelector(store.getState())).toBe(true)

    runStatus = "NEW"
    await vi.advanceTimersByTimeAsync(2000)
    await run
    expect(billing.selectBillPollingSelector(store.getState())).toBe(false)
  })
})
