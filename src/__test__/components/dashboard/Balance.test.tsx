import React from "react";
import {describe, expect, it, vi} from "vitest";
import {render, screen} from "@testing-library/react";
import {balanceOf, balanceText, balanceTooltip, daysOfBar, isBalanced, periodBalance, unbalancedBars} from "../../../components/dashboard/Balance.functions";
import {transformData} from "../../../components/dashboard/dashboard.functions";
import {DayLoadCurveChart} from "../../../components/dashboard/DayCharts.component";
import LoadSharingComponent from "../../../components/dashboard/LoadSharing.component";
import {ActiveTenant} from "../../../models/eeg.model";
import {ReportNamedData} from "../../../models/energy.model";

// Bilanzdifferenz = Produktion − Eigendeckung − Überschuss (platform#220).

// recharts' ResponsiveContainer needs a ResizeObserver, which jsdom lacks
globalThis.ResizeObserver ??= class { observe() {} unobserve() {} disconnect() {} } as any

const fetchDay = vi.hoisted(() => vi.fn())
vi.mock("../../../service", () => ({Api: {energyService: {fetchLoadCurveRangeV2: fetchDay}}}))

const tenant = {tenant: "RC100100", ecId: "AT00999900000RC100100000000000001"} as ActiveTenant
const row = (name: string, produced: number, distributed: number, unused?: number) =>
  ({name, produced, distributed, unused, consumed: 10, allocated: 0, qoVConsumer: 0, qoVProducer: 0,
    cntConsumer: 1, cntProducer: 1}) as ReportNamedData

describe("Bilanzdifferenz", () => {
  it("is production minus self-coverage minus surplus; rounding counts as balanced", () => {
    // values of the screenshots: 23.10.2026 (data missing) and 07.10.2026 (rounding)
    const missing = {produced: 244.844, distributed: 191.098, unused: 61.596}
    expect(balanceOf(missing)).toBeCloseTo(-7.85, 6)
    expect(balanceText(balanceOf(missing), 1)).toBe("Bilanzdifferenz -7,850 kWh")
    expect(isBalanced(balanceOf({produced: 680.273, distributed: 428.373, unused: 251.901}), 1)).toBe(true)
    expect(balanceText(0.001, 1)).toBe("Bilanz ausgeglichen")
    expect(isBalanced(0.01, 1)).toBe(false)
  })

  it("the tolerance grows with the days: a year of rounding is balanced, a producer missing for a day is not", () => {
    expect(isBalanced(0.365, 365)).toBe(true)
    expect(isBalanced(-20, 12 * 31)).toBe(false)   // year view with 12 month bars
    expect(daysOfBar("W:2026:40:40")).toBe(7)
    expect(daysOfBar("M:2026:10:10")).toBe(31)
    expect(daysOfBar("D:10:23:04")).toBe(1)
  })

  it("the period sum exists only when every bar carries the difference", () => {
    expect(periodBalance([{name: "40 KWo", balance: 0, days: 7}, {name: "41 KWo", balance: 20, days: 7}]))
      .toEqual({difference: 20, days: 14, marked: 1})
    expect(periodBalance([{name: "40 KWo", balance: 20, days: 7}, {name: "41 KWo", days: 7}])).toBeUndefined()
    expect(periodBalance([])).toBeUndefined()
  })

  it("a period whose bars cancel out is not \"ausgeglichen\" while a bar does not balance", () => {
    // missing producer data on day 3, missing consumer data on day 10
    const bars = [{name: "3", balance: -5.2, days: 1}, {name: "10", balance: 5.19, days: 1}]
    const sum = periodBalance(bars)!
    expect(isBalanced(sum.difference, sum.days)).toBe(true)
    expect(balanceText(sum.difference, sum.days, sum.marked)).toBe("Bilanzdifferenz -0,010 kWh (2 Balken auffällig)")
  })

  it("marks the bars whose difference is more than rounding, and formats the tooltip value", () => {
    const bars = [{name: "21", balance: -7.85, days: 1}, {name: "22", balance: 0.004, days: 1}, {name: "23"},
      {name: "40 KWo", balance: 0.05, days: 7}]
    expect([...unbalancedBars(bars)]).toEqual(["21"])
    expect(balanceTooltip(-7.85, 1)).toBe("-7,850 kWh")
    expect(balanceTooltip(0.05, 7)).toBe("ausgeglichen")
  })

  it("period bars carry it, but not when the report has no surplus", () => {
    const data = transformData([row("W:2026:40:40", 100, 60, 40), row("W:2026:41:41", 100, 50, 30), row("W:2026:42:42", 5, 5)], n => n)
    expect(data.map(d => d.balance)).toEqual([0, 20, undefined])
    expect(transformData([{...row("W:2026:40:40", 5, 5), unused: null as any}], n => n)[0].balance).toBeUndefined()
  })

  it("the period view shows the sum over the bars", () => {
    render(<LoadSharingComponent tenant={tenant} activePeriod={{type: "YM", year: 2026, segment: 10}}
                                 energyDate={{begin: "01.01.2026 00:00:00", end: "24.10.2026 23:45:00"}}
                                 report={[row("W:2026:40:40", 100, 60, 35), row("W:2026:41:41", 100, 50, 30)]}/>)
    expect(screen.getByText("Bilanzdifferenz 25,000 kWh (2 Balken auffällig)")).toBeTruthy()
  })

  it("the period view says \"Bilanz ausgeglichen\" for complete data", () => {
    render(<LoadSharingComponent tenant={tenant} activePeriod={{type: "YM", year: 2026, segment: 10}}
                                 energyDate={{begin: "01.01.2026 00:00:00", end: "24.10.2026 23:45:00"}}
                                 report={[row("W:2026:40:40", 100, 60, 40), row("W:2026:41:41", 100, 50, 50.001)]}/>)
    expect(screen.getByText("Bilanz ausgeglichen")).toBeTruthy()
  })

  it("the period view says nothing about the balance for a report without surplus", () => {
    render(<LoadSharingComponent tenant={tenant} activePeriod={{type: "YM", year: 2026, segment: 10}}
                                 energyDate={{begin: "01.01.2026 00:00:00", end: "24.10.2026 23:45:00"}}
                                 report={[row("W:2026:40:40", 100, 60)]}/>)
    expect(screen.queryByText(/Bilanz/)).toBeNull()
  })

  it("the day view adds it to the sums line", async () => {
    const ts = new Date(2026, 9, 23, 12, 0).getTime() / 1000
    fetchDay.mockResolvedValue([{name: `R:${ts}:48:296`, produced: 10, consumed: 20, distributed: 6, unused: 1}])
    const day = new Date(2026, 9, 23)
    render(<DayLoadCurveChart tenant={tenant} day={day} bounds={{first: day, last: day}} onDayChange={() => {}}
                              onProperties={() => {}}/>)
    expect(await screen.findByText("Bilanzdifferenz 3,000 kWh")).toBeTruthy()
  })
})
