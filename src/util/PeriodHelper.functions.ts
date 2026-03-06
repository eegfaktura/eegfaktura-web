import {ReportType, SelectedPeriod} from "../models/energy.model";
import {getPeriodSegment} from "./Helper.util";
import moment from "moment";

export const generatePeriodOptions = (period: 'YH' | "YQ" | 'YM' | 'Y', endMonth: number, endYear: number, beginMonth: number, beginYear: number) => {
  const options: SelectedPeriod[] = [];
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

export const getSegmentFromDate = (periodType: ReportType, year: number, date: moment.Moment) => {
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
    }
  }
}

export const transformPeriodFromSegment = (targetType: ReportType, period: SelectedPeriod, date: moment.Moment): SelectedPeriod => {
  switch (targetType) {
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
      }
  }
}