import {describe, expect, it, vi} from "vitest"
import {fireEvent, render, screen} from "@testing-library/react"
import ChartProperties from "../../../components/dashboard/ChartProperties.component"

const periods = {begin: "01.01.2026 00:00:00", end: "31.12.2026 23:45:00"}
const dayRange = {first: new Date(2026, 0, 1), last: new Date(2026, 9, 23)}

describe("ChartProperties – row \"Tag\" (platform#210)", () => {
  it("only with a day range", () => {
    render(<ChartProperties selectedPeriod={{type: "YM", year: 2026, segment: 10}} periods={periods} onDismiss={vi.fn()}/>)
    expect(screen.queryByLabelText("Tag")).toBeNull()
  })

  it("offers the last allowed day and returns the chosen day as period D, clamped to the range", () => {
    const onDismiss = vi.fn()
    render(<ChartProperties selectedPeriod={{type: "YM", year: 2026, segment: 10}} periods={periods}
                            onDismiss={onDismiss} dayRange={dayRange}/>)
    const input = screen.getByLabelText("Tag") as HTMLInputElement
    expect(input.value).toBe("2026-10-23")
    expect(input.max).toBe("2026-10-23")
    fireEvent.change(input, {target: {value: "2026-03-29"}})
    expect(onDismiss).toHaveBeenLastCalledWith({type: "D", year: 2026, segment: 88})
    fireEvent.change(input, {target: {value: "2026-12-24"}})
    expect(onDismiss).toHaveBeenLastCalledWith({type: "D", year: 2026, segment: 296})
  })
})
