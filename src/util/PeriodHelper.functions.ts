import {ReportType, SelectedPeriod} from "../models/energy.model";
import {getPeriodSegment, seasonRange} from "./Helper.util";
import moment from "moment";

// A month counted from year 0, to compare months across years.
const monthIndex = (year: number, month: number) => year * 12 + month

// Summer and winter (seasonRange) that overlap the energy data range.
const seasonOptions = (endMonth: number, endYear: number, beginMonth: number, beginYear: number) => {
  const options: SelectedPeriod[] = []
  for (let y = beginYear - 1; y <= endYear; y++) {
    for (const segment of [1, 2]) {
      const season: SelectedPeriod = {type: 'YS', segment, year: y}
      const r = seasonRange(season)
      if (monthIndex(r.startYear, r.startMonth) <= monthIndex(endYear, endMonth)
        && monthIndex(r.endYear, r.endMonth) >= monthIndex(beginYear, beginMonth)) options.push(season)
    }
  }
  return options
}

export const generatePeriodOptions = (period: ReportType, endMonth: number, endYear: number, beginMonth: number, beginYear: number) => {
  const options: SelectedPeriod[] = [];
  if (period === 'D') return options
  for (let y = beginYear; y <= endYear; y++) {
    const em = y === endYear ? endMonth : 12
    const bm = y === beginYear ? beginMonth : 1

    const factor = period === "Y" ? 12 : period === 'YH' ? 6 : period === "YQ" ? 3 : 1

    let m = (bm - 1 + (factor - (bm-1) % factor));
    const _em = em-1+(factor - (em-1) % factor);
    while (m <= _em) {
      options.push({type: period, segment: getPeriodSegment(period, m), year: y})
      m = (m  + (factor - (m) % factor))
    }
  }

  return options.sort((a, b) => (a.year+(a.segment*0.01)) > (b.segment*0.01+b.year) ? -1 : 1);
}

// First month of a half year or a season, to sort both in one list.
const firstMonth = (p: SelectedPeriod) => {
  if (p.type !== 'YS') return monthIndex(p.year, (p.segment - 1) * 6 + 1)
  const r = seasonRange(p)
  return monthIndex(r.startYear, r.startMonth)
}

// The half years of the dashboard charts: calendar half years and seasons (Apr-Sep, Oct-Mar) in one list, newest
// first (platform#258).
export const chartHalfYearOptions = (endMonth: number, endYear: number, beginMonth: number, beginYear: number) =>
  [...generatePeriodOptions('YH', endMonth, endYear, beginMonth, beginYear),
    ...seasonOptions(endMonth, endYear, beginMonth, beginYear)]
    .sort((a, b) => firstMonth(b) - firstMonth(a))

// The types the period popover switches to; a season is chosen from the half-year list.
export type SwitchTarget = Exclude<ReportType, 'YS'>

export const getSegmentFromDate = (periodType: SwitchTarget, year: number, date: moment.Moment): number => {
  if (date.year() === year) {
    switch (periodType) {
      case 'Y':
        return 0
      case 'YH':
        return date.month() > 5 ? 2 : 1
      case 'YQ':
        return date.quarter()
      case 'YM':
        return date.month() + 1
      case 'D':
        return date.dayOfYear()
    }
  } else {
    switch (periodType) {
      case 'Y':
        return 0
      case 'YH':
        return 2
      case 'YQ':
        return 4
      case 'YM':
        return 12
      case 'D':
        return 1
    }
  }
}

type SwitchPeriod = Omit<SelectedPeriod, 'type'> & {type: SwitchTarget}

// A season as the month of the reference date, held within the season: switching from it never leaves it.
const seasonMonth = (season: SelectedPeriod, date: moment.Moment): SwitchPeriod => {
  const r = seasonRange(season)
  const month = Math.min(Math.max(monthIndex(date.year(), date.month() + 1), monthIndex(r.startYear, r.startMonth)),
    monthIndex(r.endYear, r.endMonth)) - 1
  return {type: 'YM', segment: month % 12 + 1, year: Math.floor(month / 12)}
}

export const transformPeriodFromSegment = (targetType: SwitchTarget, selected: SelectedPeriod, date: moment.Moment): SelectedPeriod => {
  const period: SwitchPeriod = selected.type === 'YS' ? seasonMonth(selected, date) : {...selected, type: selected.type}
  switch (targetType) {
    case 'D': return {type: 'D', segment: date.dayOfYear(), year: period.year} as SelectedPeriod
    case 'Y': return {type: targetType, segment: 0, year: period.year} as SelectedPeriod
    case 'YH':
      switch (period.type) {
        case 'Y':
          return {type: targetType, segment: Math.min(getSegmentFromDate(targetType, period.year, date), 2), year: period.year} as SelectedPeriod
        case 'YH':
          return period
        case 'YQ':
          return {type: targetType, segment: Math.min(getSegmentFromDate(targetType, period.year, date), period.segment > 2 ? 2 : 1), year: period.year} as SelectedPeriod
        case 'YM':
          return {type: targetType, segment: Math.min(getSegmentFromDate(targetType, period.year, date), period.segment > 6 ? 2 : 1), year: period.year} as SelectedPeriod
        case 'D':
          return {type: targetType, segment: getSegmentFromDate(targetType, period.year, date), year: period.year} as SelectedPeriod
      }
    case 'YQ':
      switch (period.type) {
        case 'Y':
          return {type: targetType, segment: Math.min(getSegmentFromDate(targetType, period.year, date), 4), year: period.year} as SelectedPeriod
        case 'YH':
          return {type: targetType, segment: Math.min(getSegmentFromDate(targetType, period.year, date), period.segment * 2), year: period.year} as SelectedPeriod
        case 'YQ':
          return period
        case 'YM':
          return {type: targetType, segment: Math.min(getSegmentFromDate(targetType, period.year, date), period.segment > 9 ? 4 : period.segment > 6 ? 3 : period.segment > 3 ? 2 : 1), year: period.year} as SelectedPeriod
        case 'D':
          return {type: targetType, segment: getSegmentFromDate(targetType, period.year, date), year: period.year} as SelectedPeriod
      }
    case 'YM':
      switch (period.type) {
        case 'Y':
          return {type: targetType, segment: Math.min(getSegmentFromDate(targetType, period.year, date), 12), year: period.year} as SelectedPeriod
        case 'YH':
          return {type: targetType, segment: Math.min(getSegmentFromDate(targetType, period.year, date), period.segment * 6), year: period.year} as SelectedPeriod
        case 'YQ':
          return {type: targetType, segment: Math.min(getSegmentFromDate(targetType, period.year, date), period.segment * 3), year: period.year} as SelectedPeriod
        case 'YM':
          return period
        case 'D':
          return {type: targetType, segment: getSegmentFromDate(targetType, period.year, date), year: period.year} as SelectedPeriod
      }
  }
}