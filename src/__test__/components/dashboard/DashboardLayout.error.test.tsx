import React from "react";
import {beforeEach, describe, expect, it, vi} from "vitest";
import {act, fireEvent, screen} from "@testing-library/react";
import {renderWithProviders} from "../../test-utils";
import {EegContext, EegState} from "../../../store/hook/Eeg.provider";
import {PieSeriesType} from "../../../pages/Dashboard.page";
import {SelectedPeriod} from "../../../models/energy.model";
import "../../../util/I18n";

const fetchCombined = vi.hoisted(() => vi.fn())
vi.mock("../../../service", () => ({Api: {energyService: {fetchCombinedReportV2: fetchCombined}}}))
vi.mock("../../../components/dashboard/LoadSharing.component", () => ({default: () => <div>Lastkurve</div>}))
vi.mock("../../../components/dashboard/IntraDayReport.component", () => ({default: () => <div>Tageskurve</div>}))
vi.mock("../../../components/dashboard/EnergyOverview.component", () => ({default: () => <div/>}))
vi.mock("../../../components/dashboard/EegOverview.component", () => ({default: () => <div/>}))

import DashboardLayoutComponent from "../../../components/dashboard/DashboardLayout.component";

// platform#228 step 2: a failed load of the chart data left both chart cards with a spinner forever

const eegContext = {tenant: "RC100100", eeg: {communityId: "AT00999900000RC100100000000000001", rcNumber: "RC100100"},
  isFetching: false, getTenants: () => []} as unknown as EegState
const series = {name: "", value: 0, fill: ""} as PieSeriesType
const flush = () => act(async () => { await new Promise(r => setTimeout(r, 0)) })

const layout = (activePeriod: SelectedPeriod) => <EegContext.Provider value={eegContext}>
  <DashboardLayoutComponent participants={[]} consumed={series} produced={series} allocated={series}
                            activePeriod={activePeriod}/>
</EegContext.Provider>
const OCT: SelectedPeriod = {type: "YM", year: 2026, segment: 10}
const NOV: SelectedPeriod = {type: "YM", year: 2026, segment: 11}
const FAILED = "Die Diagrammdaten konnten nicht geladen werden."
const NO_DATA = "Für diesen Zeitraum liegen keine Diagrammdaten vor."
const both = [{reportName: "intraday", reportData: []}, {reportName: "loadcurve", reportData: []}]

const show = async (period: SelectedPeriod = OCT) => {
  const r = renderWithProviders(layout(period))
  await flush()
  return r
}

describe("Dashboard charts: load error", () => {
  beforeEach(() => { fetchCombined.mockReset() })

  it("shows an error with „Erneut versuchen“ instead of a spinner, and loads again on retry", async () => {
    fetchCombined.mockRejectedValueOnce(new Error("Bad Gateway"))
      .mockResolvedValueOnce([{reportName: "intraday", reportData: []}, {reportName: "loadcurve", reportData: []}])
    await show()
    expect(screen.getAllByText("Die Diagrammdaten konnten nicht geladen werden.")).toHaveLength(2)
    expect(document.querySelector("ion-spinner")).toBeNull()

    fireEvent.click(screen.getAllByText("Erneut versuchen")[0])
    await flush()
    expect(fetchCombined).toHaveBeenCalledTimes(2)
    expect(screen.queryByText("Die Diagrammdaten konnten nicht geladen werden.")).toBeNull()
    expect(screen.getByText("Lastkurve")).toBeTruthy()
    expect(screen.getByText("Tageskurve")).toBeTruthy()
  })

  it("shows the spinner while loading", async () => {
    fetchCombined.mockReturnValue(new Promise(() => {}))
    await show()
    expect(document.querySelectorAll("ion-spinner")).toHaveLength(2)
    expect(screen.queryByText("Erneut versuchen")).toBeNull()
  })

  it("an answer without data (JSON null) shows „no data“ instead of a spinner", async () => {
    fetchCombined.mockResolvedValue(null)
    await show()
    expect(screen.getAllByText(NO_DATA)).toHaveLength(2)
    expect(document.querySelector("ion-spinner")).toBeNull()
  })

  it("a late failure for an earlier period changes nothing", async () => {
    let failOct!: (e: Error) => void
    fetchCombined.mockReturnValueOnce(new Promise((_, reject) => { failOct = reject }))
      .mockResolvedValueOnce(both)
    const {rerender} = await show(OCT)
    rerender(layout(NOV))
    await flush()
    await act(async () => failOct(new Error("Bad Gateway")))
    await flush()
    expect(screen.queryByText(FAILED)).toBeNull()
    expect(screen.getByText("Lastkurve")).toBeTruthy()
  })
})
