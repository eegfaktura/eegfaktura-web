import {describe, expect, it, vi} from "vitest";
import {act, screen} from "@testing-library/react";
import {renderWithProviders} from "../test-utils";

vi.mock("../../components/dashboard/DashboardLayout.component", () => ({default: () => <div>Diagramme</div>}))

import DashboardPage from "../../pages/Dashboard.page";
import {fetchEnergyReportV2, setSelectedPeriod} from "../../store/energy";

describe("Dashboard (261024-ca26)", () => {
  it("a failed energy load shows an error instead of an empty dashboard", () => {
    const {store} = renderWithProviders(<DashboardPage/>)
    act(() => {
      store.dispatch(setSelectedPeriod({type: "YM", year: 2026, segment: 10}))
      store.dispatch(fetchEnergyReportV2.pending("a", {} as any))
      store.dispatch(fetchEnergyReportV2.rejected(new Error("Bad Gateway"), "a", {} as any))
    })
    expect(screen.getByText("Die Energiedaten konnten nicht geladen werden. (Bad Gateway)")).toBeTruthy()
    expect(screen.queryByText("Diagramme")).toBeNull()
  })

  it("shows the dashboard after a successful load", () => {
    const {store} = renderWithProviders(<DashboardPage/>)
    act(() => { store.dispatch(setSelectedPeriod({type: "YM", year: 2026, segment: 10})) })
    expect(screen.getByText("Diagramme")).toBeTruthy()
  })
})
