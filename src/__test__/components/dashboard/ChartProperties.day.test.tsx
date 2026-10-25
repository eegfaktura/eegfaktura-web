import {describe, expect, it, vi} from "vitest"
import {fireEvent, render, screen} from "@testing-library/react"
import ChartProperties from "../../../components/dashboard/ChartProperties.component"

// ion-datetime uses IntersectionObserver, which jsdom lacks
globalThis.IntersectionObserver ??= class { observe() {} unobserve() {} disconnect() {} takeRecords() { return [] } } as any

const periods = {begin: "01.01.2026 00:00:00", end: "31.12.2026 23:45:00"}
const dayRange = {first: new Date(2026, 0, 1), last: new Date(2026, 9, 23)}

describe("ChartProperties – row \"Tag\" (platform#210)", () => {
  it("only with a day range", () => {
    render(<ChartProperties selectedPeriod={{type: "YM", year: 2026, segment: 10}} periods={periods} onDismiss={vi.fn()}/>)
    expect(screen.queryByLabelText("Vorheriger Tag")).toBeNull()
    expect(document.querySelector("ion-datetime")).toBeNull()
  })

  it("day picker: date chip limited to the range, no arrows in the popover", () => {
    render(<ChartProperties selectedPeriod={{type: "YM", year: 2026, segment: 10}} periods={periods}
                            onDismiss={vi.fn()} dayRange={dayRange}/>)
    const datetime = document.querySelector("ion-datetime") as any
    const chip = document.querySelector("ion-datetime-button") as any
    expect(datetime).toBeTruthy()
    expect(chip.datetime ?? chip.getAttribute("datetime")).toBe(datetime.id)
    expect(datetime.min ?? datetime.getAttribute("min")).toBe("2026-01-01")
    expect(datetime.max ?? datetime.getAttribute("max")).toBe("2026-10-23")
    expect(datetime.value ?? datetime.getAttribute("value")).toBe("2026-10-23")
    // stepping day by day is done with the arrows of the card in day mode (DayCharts), not here
    expect(screen.queryByLabelText("Vorheriger Tag")).toBeNull()
    expect(screen.queryByLabelText("Nächster Tag")).toBeNull()
  })

  it("choosing a date in the picker selects period D", () => {
    const onDismiss = vi.fn()
    render(<ChartProperties selectedPeriod={{type: "YM", year: 2026, segment: 10}} periods={periods}
                            onDismiss={onDismiss} dayRange={dayRange}/>)
    const datetime = document.querySelector("ion-datetime") as HTMLElement
    fireEvent(datetime, new CustomEvent("ionChange", {detail: {value: "2026-10-22"}}))
    expect(onDismiss).toHaveBeenLastCalledWith({type: "D", year: 2026, segment: 295})
  })
})
