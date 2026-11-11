import React from "react";
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import {fireEvent, render, screen} from "@testing-library/react";
import {Provider} from "react-redux";
import {configureStore} from "@reduxjs/toolkit";
import {reducer} from "../../../store/store";
import {fetchEnergyReportV2} from "../../../store/energy";
import MeterChartNavbarComponent from "../../../components/participantPane/MeterChartNavbar.component";
import {dayOfYearToDate, toLocalISODate} from "../../../util/Helper.util";

// Button "D": the day comes from this metering point's data end, the begin from the community range.

const meta = (name: string, start: string, end: string) =>
  ({name, sourceIdx: 0, period_start: start, period_end: end, dir: "CONSUMPTION"})

const openDay = (meterId: string, metas: any[]) => {
  const store = configureStore({reducer, middleware: (d) => d({serializableCheck: false})})
  store.dispatch(fetchEnergyReportV2.fulfilled(
    {report: {totalConsumption: 0, totalProduction: 0, meta: metas, participantReports: []}} as any, "r", {} as any))
  const onChange = vi.fn()
  render(<Provider store={store}>
    <MeterChartNavbarComponent selectedMeterId={meterId} activePeriod={{type: "YQ", year: 2026, segment: 4}}
                               onSelectionChanged={onChange}/>
  </Provider>)
  fireEvent.click(screen.getByText("D"))
  const p = onChange.mock.calls.at(-1)![0]
  return toLocalISODate(dayOfYearToDate(p.year, p.segment))
}

describe("MeterChartNavbar 'D'", () => {
  beforeEach(() => {
    vi.useFakeTimers({toFake: ["Date"]})
    vi.setSystemTime(new Date(2026, 9, 25, 12, 0))   // 25.10.2026
  })
  afterEach(() => vi.useRealTimers())

  it("opens on the selected metering point's last day with data, not the community's", () => {
    expect(openDay("AT001", [
      meta("AT001", "01.01.2025 00:00:00", "18.10.2026 23:45:00"),
      meta("AT002", "01.01.2025 00:00:00", "23.10.2026 23:45:00"),
    ])).toBe("2026-10-18")
  })

  it("opens on yesterday when this metering point has no known data end", () => {
    expect(openDay("AT009", [meta("AT001", "01.01.2025 00:00:00", "18.10.2026 23:45:00")])).toBe("2026-10-24")
  })
})
