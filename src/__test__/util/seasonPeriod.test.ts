import {describe, expect, it} from "vitest"
import moment from "moment"
import {chartHalfYearOptions, transformPeriodFromSegment} from "../../util/PeriodHelper.functions"
import {periodDisplayString} from "../../util/Helper.util"
import {EnergyService} from "../../service/energy.service"
import {AuthService} from "../../service/auth.service"
import {SelectedPeriod} from "../../models/energy.model"

// platform#258: summer (Apr–Sep) and winter (Oct–Mar) in the half-year list of the dashboard charts
const summer = (year: number): SelectedPeriod => ({type: 'YS', segment: 1, year})
const winter = (year: number): SelectedPeriod => ({type: 'YS', segment: 2, year})
const half = (year: number, segment: number): SelectedPeriod => ({type: 'YH', segment, year})
const seasons = (endMonth: number, endYear: number, beginMonth: number, beginYear: number) =>
  chartHalfYearOptions(endMonth, endYear, beginMonth, beginYear).filter(p => p.type === 'YS')

describe("half-year list of the charts", () => {
  it("half years and seasons by their first month, newest first", () => {
    // data January to November 2026: winter 2025/26 (from January) up to winter 2026/27 (from October)
    expect(chartHalfYearOptions(11, 2026, 1, 2026))
      .toEqual([winter(2026), half(2026, 2), summer(2026), half(2026, 1), winter(2025)])
  })

  it("only the seasons that overlap the data range", () => {
    expect(seasons(8, 2026, 5, 2026)).toEqual([summer(2026)])
    expect(seasons(3, 2027, 10, 2026)).toEqual([winter(2026)])
    expect(seasons(10, 2026, 9, 2026)).toEqual([winter(2026), summer(2026)])
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

describe("switching from a season to the other types stays within the season", () => {
  it("today after the season: its last month", () => {
    const today = moment("2026-11-14")
    expect(transformPeriodFromSegment('YQ', summer(2026), today)).toEqual({type: 'YQ', segment: 3, year: 2026})
    expect(transformPeriodFromSegment('YM', summer(2026), today)).toEqual({type: 'YM', segment: 9, year: 2026})
    expect(transformPeriodFromSegment('YM', winter(2025), today)).toEqual({type: 'YM', segment: 3, year: 2026})
    expect(transformPeriodFromSegment('Y', winter(2025), today)).toEqual({type: 'Y', segment: 0, year: 2026})
  })

  it("today within the season: the current month, also after the year end", () => {
    const today = moment("2027-02-10")
    expect(transformPeriodFromSegment('YM', winter(2026), today)).toEqual({type: 'YM', segment: 2, year: 2027})
    expect(transformPeriodFromSegment('YQ', winter(2026), today)).toEqual({type: 'YQ', segment: 1, year: 2027})
  })

  it("today before the season: its first month", () => {
    expect(transformPeriodFromSegment('YM', summer(2027), moment("2027-02-10")))
      .toEqual({type: 'YM', segment: 4, year: 2027})
  })
})
