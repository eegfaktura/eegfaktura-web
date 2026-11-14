import {describe, expect, it, vi} from "vitest"
import {fireEvent, render} from "@testing-library/react"
import ChartProperties from "../../../components/dashboard/ChartProperties.component"

const periods = {begin: "01.01.2026 00:00:00", end: "31.10.2026 23:45:00"}

// the select of the row "Halbjahr": the second row, after "Jahr"
const halfYearSelect = () => document.querySelectorAll("ion-select")[1] as HTMLElement

describe("ChartProperties – summer and winter in the row \"Halbjahr\" (platform#258)", () => {
  it("the half-year list holds the seasons of the data range, by their first month", () => {
    render(<ChartProperties selectedPeriod={{type: "YM", year: 2026, segment: 10}} periods={periods} onDismiss={vi.fn()}/>)
    const labels = Array.from(halfYearSelect().querySelectorAll("ion-select-option")).map(o => o.textContent)
    expect(labels).toEqual(["Okt 2026-Mär 2027", "Jul-Dez 2026", "Apr-Sep 2026", "Jan-Jun 2026", "Okt 2025-Mär 2026"])
  })

  it("choosing a season selects period YS", () => {
    const onDismiss = vi.fn()
    render(<ChartProperties selectedPeriod={{type: "YM", year: 2026, segment: 10}} periods={periods} onDismiss={onDismiss}/>)
    fireEvent(halfYearSelect(), new CustomEvent("ionChange", {detail: {value: "YS_1_2026"}}))
    expect(onDismiss).toHaveBeenLastCalledWith({type: "YS", segment: 1, year: 2026})
  })

  it("a selected season marks the row \"Halbjahr\" and stays chosen in its list", () => {
    render(<ChartProperties selectedPeriod={{type: "YS", year: 2025, segment: 2}} periods={periods} onDismiss={vi.fn()}/>)
    const select = halfYearSelect() as any
    expect(select.value ?? select.getAttribute("value")).toBe("YS_2_2025")
    expect(select.closest("ion-row")?.classList.contains("selected")).toBe(true)
  })
})
