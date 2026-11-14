import {describe, expect, it, vi} from "vitest"
import {fireEvent, render, screen} from "@testing-library/react"
import ChartProperties from "../../../components/dashboard/ChartProperties.component"

const periods = {begin: "01.01.2026 00:00:00", end: "31.10.2026 23:45:00"}

// the select of the row "Sommer/Winter": the third row, after "Jahr" and "Halbjahr"
const seasonSelect = () => document.querySelectorAll("ion-select")[2] as HTMLElement

describe("ChartProperties – row \"Sommer/Winter\" (platform#258)", () => {
  it("offers summer and winter of the data range", () => {
    render(<ChartProperties selectedPeriod={{type: "YM", year: 2026, segment: 10}} periods={periods} onDismiss={vi.fn()}/>)
    expect(screen.getByText("Sommer/Winter")).toBeTruthy()
    const labels = Array.from(seasonSelect().querySelectorAll("ion-select-option")).map(o => o.textContent)
    expect(labels).toEqual(["Winter 2026/27", "Sommer 2026", "Winter 2025/26"])
  })

  it("choosing a season selects period YS", () => {
    const onDismiss = vi.fn()
    render(<ChartProperties selectedPeriod={{type: "YM", year: 2026, segment: 10}} periods={periods} onDismiss={onDismiss}/>)
    fireEvent(seasonSelect(), new CustomEvent("ionChange", {detail: {value: "YS_1_2026"}}))
    expect(onDismiss).toHaveBeenLastCalledWith({type: "YS", segment: 1, year: 2026})
  })
})
