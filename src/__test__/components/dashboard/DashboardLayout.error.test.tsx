import React from "react";
import {beforeEach, describe, expect, it, vi} from "vitest";
import {act, fireEvent, screen} from "@testing-library/react";
import {renderWithProviders} from "../../test-utils";
import {EegContext, EegState} from "../../../store/hook/Eeg.provider";
import {PieSeriesType} from "../../../pages/Dashboard.page";

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

const show = async () => {
  renderWithProviders(<EegContext.Provider value={eegContext}>
    <DashboardLayoutComponent participants={[]} consumed={series} produced={series} allocated={series}
                              activePeriod={{type: "YM", year: 2026, segment: 10}}/>
  </EegContext.Provider>)
  await flush()
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
})
