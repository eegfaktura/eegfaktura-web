import React from "react";
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import {act, render, screen} from "@testing-library/react";
import {Provider} from "react-redux";
import {configureStore} from "@reduxjs/toolkit";
import {reducer} from "../../../store/store";
import {setSelectedPeriod} from "../../../store/energy";
import {EegContext, EegState} from "../../../store/hook/Eeg.provider";
import EegOverviewComponent from "../../../components/dashboard/EegOverview.component";
import EnergyOverviewComponent from "../../../components/dashboard/EnergyOverview.component";
import {Api} from "../../../service";
import {PieSeriesType} from "../../../pages/Dashboard.page";
import {SelectedPeriod} from "../../../models/energy.model";
import {initialState as participantInitial} from "../../../store/participant/states/participant.state";
import {EegParticipant} from "../../../models/members.model";

// Both upper dashboard cards name the period their values belong to (as the load curve and day curve cards do).

const eegContext = {tenant: "RC100100", isFetching: false, getTenants: () => []} as unknown as EegState
const series = (name: string, value = 0) => ({name, value, fill: ""}) as PieSeriesType

const newStore = (period?: SelectedPeriod) => {
  const store = configureStore({reducer, middleware: (d) => d({serializableCheck: false})})
  if (period) store.dispatch(setSelectedPeriod(period))
  return store
}
const tree = (store: ReturnType<typeof newStore>, ui: React.ReactElement) =>
  <Provider store={store}><EegContext.Provider value={eegContext}>{ui}</EegContext.Provider></Provider>
const energyOverview = <EnergyOverviewComponent consumed={series("c")} produced={series("p")} allocated={series("a")}
                                                rates={{}}/>

describe("period of the upper dashboard cards", () => {
  const energyService = Api.energyService
  let fetchSummary: ReturnType<typeof vi.fn>
  beforeEach(() => {
    fetchSummary = vi.fn().mockResolvedValue({consumed: 0, distributed: 0, produced: 0})
    Api.energyService = {fetchSummary} as any
  })
  afterEach(() => { Api.energyService = energyService })

  // the EEG overview shows today's state as a whole, not the selected period (07.11.2026)
  it("EEG overview shows today's state once and no period", () => {
    render(tree(newStore({type: "YQ", year: 2026, segment: 4}), <EegOverviewComponent rateMap={{}}/>))
    expect(screen.getByText("Stand heute")).toBeTruthy()
    expect(screen.queryByText(/^Zeitraum:/)).toBeNull()
    expect(screen.queryByText(/\(Stand heute\)/)).toBeNull()
  })

  it("EEG overview counts the metering points active today over all members, whatever period is selected", () => {
    const meter = (meteringPoint: string, status: string, processState: string, direction = "CONSUMPTION",
                   tariff_id?: string) => ({meteringPoint, status, processState, direction, tariff_id})
    const all = [
      {id: "p1", status: "ACTIVE", meters: [meter("AT01", "ACTIVE", "ACTIVE", "CONSUMPTION", "t1"),
          meter("AT02", "ACTIVE", "ACTIVE", "GENERATION"), meter("AT03", "INACTIVE", "ACTIVE")]},
      {id: "p2", status: "NEW", meters: [meter("AT04", "INIT", "PENDING"), meter("AT05", "INIT", "NEW")]},
    ] as unknown as EegParticipant[]
    const store = configureStore({reducer, middleware: (d) => d({serializableCheck: false}),
      preloadedState: {participant: {...participantInitial, ids: ["p1", "p2"], entities: {p1: all[0], p2: all[1]}}} as any})
    store.dispatch(setSelectedPeriod({type: "YQ", year: 2020, segment: 1}))
    render(tree(store, <EegOverviewComponent rateMap={{t1: {id: "t1", name: "Bezugstarif"} as any}}/>))
    expect(screen.getByText("2 aktive", {selector: "span"})).toBeTruthy()
    expect(screen.getByText("2 in Anmeldung", {selector: "span"})).toBeTruthy()   // metering points
    expect(screen.getByText("1 in Anmeldung", {selector: "span"})).toBeTruthy()   // member p2
    expect(screen.getByText("1 Abnehmer")).toBeTruthy()
    expect(screen.getByText("1 Einspeiser")).toBeTruthy()
  })

  it("energy overview names the selected and the previous period, across a year boundary", async () => {
    fetchSummary.mockResolvedValue({consumed: 0, distributed: 0, produced: 1234.5})
    render(tree(newStore({type: "YQ", year: 2026, segment: 1}), energyOverview))
    expect(screen.getByText("Zeitraum: Jan-Mär 2026")).toBeTruthy()
    expect(screen.getByText("*) vorherige Periode: Okt-Dez 2025")).toBeTruthy()
    expect(fetchSummary).toHaveBeenCalledWith(expect.objectContaining({tenant: "RC100100"}), 2025, 4, "YQ")
    expect(await screen.findByText("1.234,500 kWh *)")).toBeTruthy()
  })

  it("a late answer for an earlier selection does not overwrite the previous period's values", async () => {
    let answerQ3!: (v: any) => void
    fetchSummary
      .mockReturnValueOnce(new Promise(r => { answerQ3 = r }))                  // Q4 selected → asks for Q3
      .mockResolvedValueOnce({consumed: 0, distributed: 0, produced: 222})     // Q3 selected → asks for Q2
    const store = newStore({type: "YQ", year: 2026, segment: 4})
    render(tree(store, energyOverview))
    act(() => { store.dispatch(setSelectedPeriod({type: "YQ", year: 2026, segment: 3})) })
    expect(await screen.findByText("222,000 kWh *)")).toBeTruthy()

    await act(async () => { answerQ3({consumed: 0, distributed: 0, produced: 999}) })
    expect(screen.getByText("*) vorherige Periode: Apr-Jun 2026")).toBeTruthy()
    expect(screen.queryByText("999,000 kWh *)")).toBeNull()
    expect(screen.getByText("222,000 kWh *)")).toBeTruthy()
  })

  it("'Verteilt' shows the distributed energy, not the total consumption", () => {
    render(tree(newStore({type: "YQ", year: 2026, segment: 4}),
      <EnergyOverviewComponent consumed={series("c", 8480.381)} produced={series("p", 2801.316)}
                               allocated={series("a", 1273.994)} rates={{}}/>))
    expect(screen.getByText("1.273,994 kWh")).toBeTruthy()
    expect(screen.queryByText("8.480,381 kWh")).toBeNull()
  })

  // platform#228: the metering point line showed a fixed „0 inaktive“
  it("counts inactive metering points of all members (state today)", () => {
    const member = (id: string, ...meters: [string, string][]) => ({id, status: "ACTIVE",
      meters: meters.map(([meteringPoint, status]) => ({meteringPoint, status, processState: status, direction: "CONSUMPTION"}))
    }) as unknown as EegParticipant
    const all = [member("p1", ["AT01", "ACTIVE"], ["AT02", "INACTIVE"]), member("p2", ["AT03", "INACTIVE"])]
    const store = configureStore({reducer, middleware: (d) => d({serializableCheck: false}),
      preloadedState: {participant: {...participantInitial, ids: ["p1", "p2"], entities: {p1: all[0], p2: all[1]}}} as any})
    render(tree(store, <EegOverviewComponent rateMap={{}}/>))
    expect(screen.getByText(/^2 inaktive/)).toBeTruthy()
  })

  it("without a selected period the energy card shows no period, the EEG overview none in any case", () => {
    render(tree(newStore(), <>
      <EegOverviewComponent rateMap={{}}/>
      {energyOverview}
    </>))
    expect(screen.queryByText(/^Zeitraum:/)).toBeNull()
    expect(screen.getByText("*) vorherige Periode")).toBeTruthy()
    expect(fetchSummary).not.toHaveBeenCalled()
  })
})
