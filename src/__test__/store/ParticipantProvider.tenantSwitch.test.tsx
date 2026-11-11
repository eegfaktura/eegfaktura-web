import React, {useContext} from "react";
import {describe, expect, it, vi} from "vitest";
import {act, render} from "@testing-library/react";
import {Provider} from "react-redux";
import {configureStore} from "@reduxjs/toolkit";
import {reducer} from "../../store/store";
import {selectTenant} from "../../store/eeg";
import {fetchParticipantModel} from "../../store/participant";
import {setSelectedPeriod} from "../../store/energy";
import {EegContext, EegState} from "../../store/hook/Eeg.provider";
import ParticipantProvider, {ParticipantContext} from "../../store/hook/ParticipantProvider";
import {Api} from "../../service";

// 261024-ca13: after a community switch the member list and the
// open details pane of the previous community are gone while the new community loads.

let ctx: any
const Probe = () => { ctx = useContext(ParticipantContext); return null }

const eegContext = (tenant: string, isFetching: boolean) => ({tenant, isFetching, getTenants: () => []}) as unknown as EegState

const tree = (store: any, tenant: string, isFetching: boolean) => (
  <Provider store={store}>
    <EegContext.Provider value={eegContext(tenant, isFetching)}>
      <ParticipantProvider><Probe/></ParticipantProvider>
    </EegContext.Provider>
  </Provider>
)

describe("ParticipantProvider on a community switch (261024-ca13)", () => {
  it("drops the previous community's members and open details", () => {
    // the energy report the provider requests for the listed members (Api is not set up in tests)
    Api.energyService = {fetchReportV2: vi.fn().mockResolvedValue(
      {totalConsumption: 0, totalProduction: 0, meta: [], participantReports: []})} as any
    const store = configureStore({reducer, middleware: (d) => d({serializableCheck: false})})
    store.dispatch(selectTenant("RC100100"))
    store.dispatch(fetchParticipantModel.fulfilled({participants: [{id: "a1", meters: []} as any]}, "r", {tenant: "RC100100"}))
    store.dispatch(setSelectedPeriod({type: "Y", year: 2026, segment: 0}))

    const {rerender} = render(tree(store, "RC100100", false))
    act(() => {
      ctx.showDetailsPage({id: "a1"})
    })
    expect(ctx.participants.map((p: any) => p.id)).toEqual(["a1"])
    expect(ctx.detailsPageOpen).toBe(true)

    // the switch: the store is cleared, the new community is still loading
    act(() => { store.dispatch(selectTenant("RC100200")) })
    rerender(tree(store, "RC100200", true))

    expect(ctx.participants).toEqual([])
    expect(ctx.allParticipants).toEqual([])
    expect(ctx.detailsPageOpen).toBe(false)
  })
})
