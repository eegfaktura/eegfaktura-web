import {describe, expect, it, vi} from "vitest";
import {act, fireEvent, screen} from "@testing-library/react";
import {renderWithProviders} from "../test-utils";

vi.mock("../../components/dashboard/DashboardLayout.component", () => ({default: () => <div>Diagramme</div>}))

import DashboardPage from "../../pages/Dashboard.page";
import {fetchEnergyReportV2, setSelectedPeriod} from "../../store/energy";
import {ParticipantContext} from "../../store/hook/ParticipantProvider";

const render = (reloadEnergyReport = vi.fn()) => {
  const r = renderWithProviders(
    <ParticipantContext.Provider value={{participants: [], reloadEnergyReport} as any}><DashboardPage/></ParticipantContext.Provider>)
  act(() => { r.store.dispatch(setSelectedPeriod({type: "YM", year: 2026, segment: 10})) })
  return {...r, reloadEnergyReport}
}

describe("Dashboard (261024-ca26)", () => {
  it("a failed energy load shows the error with \"Erneut versuchen\" and keeps the layout", () => {
    const {store, reloadEnergyReport} = render()
    act(() => {
      store.dispatch(fetchEnergyReportV2.pending("a", {} as any))
      store.dispatch(fetchEnergyReportV2.rejected(new Error("Bad Gateway"), "a", {} as any))
    })
    expect(screen.getByText("Die Energiedaten konnten nicht geladen werden. (Bad Gateway)")).toBeTruthy()
    expect(screen.getByText("Diagramme")).toBeTruthy()
    fireEvent.click(screen.getByText("Erneut versuchen"))
    expect(reloadEnergyReport).toHaveBeenCalledTimes(1)
  })

  it("shows no error after a successful load", () => {
    render()
    expect(screen.getByText("Diagramme")).toBeTruthy()
    expect(screen.queryByText("Erneut versuchen")).toBeNull()
  })
})
