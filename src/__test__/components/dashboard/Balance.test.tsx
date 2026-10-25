import React from "react";
import {describe, expect, it, vi} from "vitest";
import {render, screen} from "@testing-library/react";
import {balanceOf, balanceText, isBalanced} from "../../../components/dashboard/Balance.functions";
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
  it("is production minus self-coverage minus surplus; below 0.01 kWh it counts as rounding", () => {
    // values of the screenshots: 23.10.2026 (data missing) and 07.10.2026 (rounding)
    expect(balanceOf({produced: 244.844, distributed: 191.098, unused: 61.596})).toBeCloseTo(-7.85, 6)
    expect(balanceText(balanceOf({produced: 244.844, distributed: 191.098, unused: 61.596}))).toBe("Bilanzdifferenz -7,850 kWh")
    expect(isBalanced(balanceOf({produced: 680.273, distributed: 428.373, unused: 251.901}))).toBe(true)
    expect(balanceText(0.001)).toBe("Bilanz ausgeglichen")
    expect(isBalanced(0.01)).toBe(false)
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
