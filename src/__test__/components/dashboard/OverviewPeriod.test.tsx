import React from "react";
import {describe, expect, it, vi} from "vitest";
import {render, screen} from "@testing-library/react";
import {Provider} from "react-redux";
import {configureStore} from "@reduxjs/toolkit";
import {reducer} from "../../../store/store";
import {setSelectedPeriod} from "../../../store/energy";
import {EegContext, EegState} from "../../../store/hook/Eeg.provider";
import EegOverviewComponent from "../../../components/dashboard/EegOverview.component";
import EnergyOverviewComponent from "../../../components/dashboard/EnergyOverview.component";
import {Api} from "../../../service";
import {PieSeriesType} from "../../../pages/Dashboard.page";

// Both upper dashboard cards name the period their values belong to (as the load curve and day curve cards do).

const eegContext = {tenant: "RC100100", isFetching: false, getTenants: () => []} as unknown as EegState
const series = (name: string) => ({name, value: 0, fill: ""}) as PieSeriesType

const renderWithPeriod = (ui: React.ReactElement, period?: {type: any, year: number, segment: number}) => {
  const store = configureStore({reducer, middleware: (d) => d({serializableCheck: false})})
  if (period) store.dispatch(setSelectedPeriod(period))
  return render(<Provider store={store}><EegContext.Provider value={eegContext}>{ui}</EegContext.Provider></Provider>)
}

describe("period of the upper dashboard cards", () => {
  it("EEG overview names the selected period and marks the member counts as today's state", () => {
    renderWithPeriod(<EegOverviewComponent participants={[]} rateMap={{}}/>, {type: "YQ", year: 2026, segment: 4})
    expect(screen.getByText("Zeitraum: Okt-Dez 2026")).toBeTruthy()
    expect(screen.getByText("(Stand heute)")).toBeTruthy()
  })

  it("energy overview names the selected and the previous period, across a year boundary", () => {
    Api.energyService = {fetchSummary: vi.fn().mockResolvedValue({consumed: 0, distributed: 0, produced: 0})} as any
    renderWithPeriod(<EnergyOverviewComponent consumed={series("c")} produced={series("p")} allocated={series("a")}
                                              rates={{}}/>, {type: "YQ", year: 2026, segment: 1})
    expect(screen.getByText("Zeitraum: Jan-Mär 2026")).toBeTruthy()
    expect(screen.getByText("*) vorherige Periode: Okt-Dez 2025")).toBeTruthy()
  })

  it("without a selected period no period line is shown", () => {
    renderWithPeriod(<EegOverviewComponent participants={[]} rateMap={{}}/>)
    expect(screen.queryByText(/^Zeitraum:/)).toBeNull()
  })
})
