import React from "react";
import {beforeEach, describe, expect, it, vi} from "vitest";
import {act, render} from "@testing-library/react";
import {Provider} from "react-redux";
import {configureStore} from "@reduxjs/toolkit";
import {reducer} from "../../store/store";
import {selectTenant} from "../../store/eeg";
import {fetchParticipantModel, updateParticipant} from "../../store/participant";
import {fetchRatesModel} from "../../store/rate";
import {setSelectedPeriod} from "../../store/energy";
import {EegContext, EegState} from "../../store/hook/Eeg.provider";
import ParticipantProvider from "../../store/hook/ParticipantProvider";
import {Api} from "../../service";

// The energy report takes seconds for a large community: a member or metering point change that does not change the
// request must not load it again; a change of the request must.

const fetchReport = vi.fn()
const eegContext = {tenant: "RC100100", isFetching: false, getTenants: () => [],
  eeg: {communityId: "AT00999900000RC100100000000000001", rcNumber: "RC100100"}} as unknown as EegState

const meter = (meteringPoint: string, changes: any = {}) => ({meteringPoint, direction: "CONSUMPTION", tariff_id: "z",
  status: "ACTIVE", participantState: {activeSince: "2025-01-01", inactiveSince: "2999-12-31"}, ...changes})
const member = (changes: any = {}) => ({id: "a1", firstname: "Anna", meters: [meter("AT001")], ...changes} as any)
const tariff = (changes: any = {}) => ({id: "z", name: "Bezug", useTimeTariff: true, timeTariff1Active: true,
  timeTariff1From: "11:00", timeTariff1To: "14:00", ...changes} as any)

const setup = () => {
  const store = configureStore({reducer, middleware: (d) => d({serializableCheck: false})})
  store.dispatch(selectTenant("RC100100"))
  store.dispatch(fetchRatesModel.fulfilled({rates: [tariff()]}, "r", {tenant: "RC100100"}))
  store.dispatch(fetchParticipantModel.fulfilled({participants: [member()]}, "r", {tenant: "RC100100"}))
  store.dispatch(setSelectedPeriod({type: "Y", year: 2026, segment: 0}))
  render(<Provider store={store}>
    <EegContext.Provider value={eegContext}><ParticipantProvider><div/></ParticipantProvider></EegContext.Provider>
  </Provider>)
  expect(fetchReport).toHaveBeenCalledTimes(1)
  return (action: any) => act(() => { store.dispatch(action) })
}
const update = (changes: any) => updateParticipant.fulfilled(member(changes), "r", {tenant: "RC100100", participant: member()})

describe("ParticipantProvider: the energy report loads again only for another request", () => {
  beforeEach(() => {
    fetchReport.mockReset().mockReturnValue(new Promise(() => {}))
    Api.energyService = {fetchReportV2: fetchReport} as any
  })

  it("a member or metering point change outside the request loads nothing", () => {
    const dispatch = setup()
    dispatch(update({firstname: "Anne"}))
    dispatch(update({meters: [meter("AT001", {partFact: 50, equipmentName: "Keller"})]}))
    dispatch(fetchRatesModel.fulfilled({rates: [tariff({name: "Bezug neu"})]}, "r", {tenant: "RC100100"}))
    expect(fetchReport).toHaveBeenCalledTimes(1)
  })

  it("another period loads again", () => {
    const dispatch = setup()
    dispatch(setSelectedPeriod({type: "YM", year: 2026, segment: 10}))
    expect(fetchReport).toHaveBeenCalledTimes(2)
    expect(fetchReport.mock.calls[1].slice(1, 4)).toEqual([2026, 10, "YM"])
  })

  it("an added metering point, another direction or active range loads again", () => {
    const dispatch = setup()
    dispatch(update({meters: [meter("AT001"), meter("AT002")]}))
    expect(fetchReport).toHaveBeenCalledTimes(2)
    expect(fetchReport.mock.calls[1][4][0].meters.map((m: any) => m.meterId)).toEqual(["AT001", "AT002"])
    dispatch(update({meters: [meter("AT001"), meter("AT002", {direction: "GENERATION"})]}))
    expect(fetchReport).toHaveBeenCalledTimes(3)
    dispatch(update({meters: [meter("AT001"),
        meter("AT002", {direction: "GENERATION", participantState: {activeSince: "2025-01-01", inactiveSince: "2026-06-30"}})]}))
    expect(fetchReport).toHaveBeenCalledTimes(4)
  })

  it("other ZVT time windows load again", () => {
    const dispatch = setup()
    dispatch(fetchRatesModel.fulfilled({rates: [tariff({timeTariff1To: "15:00"})]}, "r", {tenant: "RC100100"}))
    expect(fetchReport).toHaveBeenCalledTimes(2)
    expect(fetchReport.mock.calls[1][4][0].meters[0].timeWindows).toEqual([{key: "T1", from: "11:00", to: "15:00"}])
  })
})
