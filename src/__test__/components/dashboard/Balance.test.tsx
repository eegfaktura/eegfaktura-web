import React from "react";
import {describe, expect, it, vi} from "vitest";
import {render, screen} from "@testing-library/react";
import {balanceOf, balanceText, isBalanced, periodBalance} from "../../../components/dashboard/Balance.functions";
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
    expect(balanceText(balanceOf(missing), missing.produced)).toBe("Bilanzdifferenz -7,850 kWh")
    expect(isBalanced(balanceOf({produced: 680.273, distributed: 428.373, unused: 251.901}), 680.273)).toBe(true)
    expect(balanceText(0.001, 5)).toBe("Bilanz ausgeglichen")
    expect(isBalanced(0.01, 5)).toBe(false)   // small production: at least 0.01 kWh
  })

  it("the tolerance grows with production, so a year of rounding residuals does not read as missing data", () => {
    // a year of a mid-size community: ~250 MWh production, 365 × 0.001 kWh residual
    expect(isBalanced(0.365, 250_000)).toBe(true)
    // a missing producer for a day in that year is still visible
    expect(isBalanced(-150, 250_000)).toBe(false)
  })

  it("the period sum exists only when every bar carries the difference", () => {
    expect(periodBalance([{produced: 100, balance: 0}, {produced: 100, balance: 20}]))
      .toEqual({difference: 20, produced: 200})
    expect(periodBalance([{produced: 100, balance: 20}, {produced: 5}])).toBeUndefined()
    expect(periodBalance([])).toBeUndefined()
  })

  it("period bars carry it, but not when the report has no surplus", () => {
    const data = transformData([row("W:2026:40", 100, 60, 40), row("W:2026:41", 100, 50, 30), row("W:2026:42", 5, 5)], n => n)
    expect(data.map(d => d.balance)).toEqual([0, 20, undefined])
  })

  it("the period view shows the sum over the bars", () => {
    render(<LoadSharingComponent tenant={tenant} activePeriod={{type: "YM", year: 2026, segment: 10}}
                                 energyDate={{begin: "01.01.2026 00:00:00", end: "24.10.2026 23:45:00"}}
                                 report={[row("W:2026:40", 100, 60, 35), row("W:2026:41", 100, 50, 30)]}/>)
    expect(screen.getByText("Bilanzdifferenz 25,000 kWh")).toBeTruthy()
  })

  it("the period view says \"Bilanz ausgeglichen\" for complete data", () => {
    render(<LoadSharingComponent tenant={tenant} activePeriod={{type: "YM", year: 2026, segment: 10}}
                                 energyDate={{begin: "01.01.2026 00:00:00", end: "24.10.2026 23:45:00"}}
                                 report={[row("W:2026:40", 100, 60, 40), row("W:2026:41", 100, 50, 50.001)]}/>)
    expect(screen.getByText("Bilanz ausgeglichen")).toBeTruthy()
  })

  it("the period view says nothing about the balance for a report without surplus", () => {
    render(<LoadSharingComponent tenant={tenant} activePeriod={{type: "YM", year: 2026, segment: 10}}
                                 energyDate={{begin: "01.01.2026 00:00:00", end: "24.10.2026 23:45:00"}}
                                 report={[row("W:2026:40", 100, 60)]}/>)
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
