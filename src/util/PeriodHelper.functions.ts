import {ReportType, SelectedPeriod} from "../models/energy.model";
import {getPeriodSegment} from "./Helper.util";
import moment from "moment";

// Summer (Apr–Sep) and winter (Oct–Mar, across the year end) that overlap the energy data range, newest first.
const seasonOptions = (endMonth: number, endYear: number, beginMonth: number, beginYear: number) => {
  const first = beginYear * 12 + beginMonth
  const last = endYear * 12 + endMonth
  const options: SelectedPeriod[] = []
  for (let y = beginYear - 1; y <= endYear; y++) {
    if (y * 12 + 4 <= last && y * 12 + 9 >= first) options.push({type: 'YS', segment: 1, year: y})
    if (y * 12 + 10 <= last && (y + 1) * 12 + 3 >= first) options.push({type: 'YS', segment: 2, year: y})
  }
  return options.reverse()
}

export const generatePeriodOptions = (period: ReportType, endMonth: number, endYear: number, beginMonth: number, beginYear: number) => {
  const options: SelectedPeriod[] = [];
  if (period === 'D') return options
  if (period === 'YS') return seasonOptions(endMonth, endYear, beginMonth, beginYear)
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

export const getSegmentFromDate = (periodType: ReportType, year: number, date: moment.Moment): number => {
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
      case 'YS':
        return date.month() >= 3 && date.month() <= 8 ? 1 : 2
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
      case 'YS':
        return 2
    }
  }
}

export const transformPeriodFromSegment = (targetType: ReportType, period: SelectedPeriod, date: moment.Moment): SelectedPeriod => {
  if (targetType === 'YS') {
    if (period.type === 'YS') return period
    // the season around the reference date if it lies in the period's year, otherwise that year's summer
    if (date.year() !== period.year) return {type: 'YS', segment: 1, year: period.year}
    const month = date.month() + 1
    return month < 4 ? {type: 'YS', segment: 2, year: period.year - 1} : {type: 'YS', segment: month < 10 ? 1 : 2, year: period.year}
  }
  // from a season ('YS') to the other types: like from the year it starts in
  switch (targetType) {
    case 'D': return {type: 'D', segment: date.dayOfYear(), year: period.year} as SelectedPeriod
    case 'Y': return {type: targetType, segment: 0, year: period.year} as SelectedPeriod
    case 'YH':
      switch (period.type) {
        case 'YS':
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
        case 'YS':
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
        case 'YS':
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