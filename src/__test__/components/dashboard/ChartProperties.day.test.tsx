import {describe, expect, it, vi} from "vitest"
import {fireEvent, render, screen} from "@testing-library/react"
import ChartProperties from "../../../components/dashboard/ChartProperties.component"

// ion-datetime uses IntersectionObserver, which jsdom lacks
globalThis.IntersectionObserver ??= class { observe() {} unobserve() {} disconnect() {} takeRecords() { return [] } } as any

const periods = {begin: "01.01.2026 00:00:00", end: "31.12.2026 23:45:00"}
const dayRange = {first: new Date(2026, 0, 1), last: new Date(2026, 9, 23)}
const arrow = (label: string) => screen.getByLabelText(label).closest("ion-button")!

describe("ChartProperties – row \"Tag\" (platform#210)", () => {
  it("only with a day range", () => {
    render(<ChartProperties selectedPeriod={{type: "YM", year: 2026, segment: 10}} periods={periods} onDismiss={vi.fn()}/>)
    expect(screen.queryByLabelText("Vorheriger Tag")).toBeNull()
    expect(document.querySelector("ion-datetime")).toBeNull()
  })

  it("day picker like the meter chart: date chip limited to the range, arrows step one day as period D", () => {
    const onDismiss = vi.fn()
    render(<ChartProperties selectedPeriod={{type: "YM", year: 2026, segment: 10}} periods={periods}
                            onDismiss={onDismiss} dayRange={dayRange}/>)
    const datetime = document.querySelector("ion-datetime") as any
    const chip = document.querySelector("ion-datetime-button") as any
    expect(datetime).toBeTruthy()
    expect(chip.datetime ?? chip.getAttribute("datetime")).toBe(datetime.id)
    expect(datetime.min ?? datetime.getAttribute("min")).toBe("2026-01-01")
    expect(datetime.max ?? datetime.getAttribute("max")).toBe("2026-10-23")
    expect(datetime.value ?? datetime.getAttribute("value")).toBe("2026-10-23")

    expect(arrow("Nächster Tag").getAttribute("disabled")).toBe("true")   // last allowed day
    fireEvent.click(arrow("Vorheriger Tag"))
    expect(onDismiss).toHaveBeenLastCalledWith({type: "D", year: 2026, segment: 295})
  })

  it("on the first allowed day the back arrow is disabled", () => {
    render(<ChartProperties selectedPeriod={{type: "D", year: 2026, segment: 1}} periods={periods}
                            onDismiss={vi.fn()} dayRange={dayRange}/>)
    expect(arrow("Vorheriger Tag").getAttribute("disabled")).toBe("true")
    expect(arrow("Nächster Tag").getAttribute("disabled")).toBe("false")
  })
})
