import {describe, expect, it} from "vitest"
import moment from "moment"
import {chartHalfYearOptions, generatePeriodOptions, transformPeriodFromSegment} from "../../util/PeriodHelper.functions"
import {periodDisplayString} from "../../util/Helper.util"
import {EnergyService} from "../../service/energy.service"
import {AuthService} from "../../service/auth.service"
import {SelectedPeriod} from "../../models/energy.model"

// platform#258: summer (Apr–Sep) and winter (Oct–Mar) in the half-year list of the dashboard charts
const summer = (year: number): SelectedPeriod => ({type: 'YS', segment: 1, year})
const winter = (year: number): SelectedPeriod => ({type: 'YS', segment: 2, year})
const half = (year: number, segment: number): SelectedPeriod => ({type: 'YH', segment, year})

describe("season options", () => {
  it("all seasons that overlap the data range, newest first, winter across the year end", () => {
    // data January to November 2026: winter 2025/26 (from January), summer 2026, winter 2026/27 (from October)
    expect(generatePeriodOptions('YS', 11, 2026, 1, 2026)).toEqual([winter(2026), summer(2026), winter(2025)])
  })

  it("only the summer when the data lies within it", () => {
    expect(generatePeriodOptions('YS', 8, 2026, 5, 2026)).toEqual([summer(2026)])
  })

  it("a winter is offered as soon as one of its months has data", () => {
    expect(generatePeriodOptions('YS', 3, 2027, 10, 2026)).toEqual([winter(2026)])
    expect(generatePeriodOptions('YS', 10, 2026, 9, 2026)).toEqual([winter(2026), summer(2026)])
  })

  it("the half-year list of the charts: half years and seasons by their first month, newest first", () => {
    expect(chartHalfYearOptions(11, 2026, 1, 2026))
      .toEqual([winter(2026), half(2026, 2), summer(2026), half(2026, 1), winter(2025)])
  })
})

describe("season display", () => {
  it("like the other periods: first and last month", () => {
    expect(periodDisplayString(summer(2025))).toBe("Apr-Sep 2025")
    expect(periodDisplayString(winter(2025))).toBe("Okt 2025-Mär 2026")
  })
})

describe("season date range for the energystore", () => {
  const service = new EnergyService({} as AuthService)

  it("summer: 01.04. to 30.09. (last day, like the other periods)", () => {
    expect(service.calcStartEndTime(summer(2026)))
      .toEqual({start: new Date(2026, 3, 1).getTime(), end: new Date(2026, 8, 30).getTime()})
  })

  it("winter: 01.10. to 31.03. of the next year", () => {
    expect(service.calcStartEndTime(winter(2026)))
      .toEqual({start: new Date(2026, 9, 1).getTime(), end: new Date(2027, 2, 31).getTime()})
  })
})

describe("switching from a season to the other types", () => {
  it("like from its year", () => {
    const date = moment("2026-07-15")
    expect(transformPeriodFromSegment('YQ', summer(2026), date)).toEqual({type: 'YQ', segment: 3, year: 2026})
    expect(transformPeriodFromSegment('YM', winter(2025), date)).toEqual({type: 'YM', segment: 12, year: 2025})
    expect(transformPeriodFromSegment('Y', winter(2025), date)).toEqual({type: 'Y', segment: 0, year: 2025})
  })
})
