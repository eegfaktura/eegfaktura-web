import {EegParticipant} from "../models/members.model";
import {ReportType, SelectedPeriod, TariffTimeWindow} from "../models/energy.model";
import {CpPeriodType} from "../models/reports.model";
import {EegTariff, MONTHNAME} from "../models/eeg.model";


export const formatedName = (participant: EegParticipant) => {
  let title = ""
  if (participant.titleBefore && participant.titleBefore.length > 0) {
    title = participant.titleBefore + " ";
  }

  return title + `${participant.firstname} ${participant.lastname}`
}

const splitDatePattern = /\.|\s|:/
export const splitDate = (date: string) => date.split(splitDatePattern).map(s=>Number(s))
export const calc = (e:number[]) => e.length > 2 ? (e[2]*372)+(e[1]*31)+e[0] : 0

export const yearMonth = (date: string) => splitDate(date).slice(1,3)


export function toRecord<T extends Record<string, any>, K extends keyof T>(array: T[], selector: K): Record<T[K], T> {
  return array.reduce((acc, item) => ({ ...acc, [item[selector]]: item }), {} as Record<T[K], T>)
}

export const formatMeteringPointString = (m: string | undefined) => {
  if (m && m.length > 32) {
    return m.slice(0, 8) + "..." + m.slice(23)
  }
  return m
}

export const isParticipantActivated = (participants: EegParticipant[], id: string) => {
  return participants.find((p) => p.id === id && p.status === 'ACTIVE') !== undefined
}

export const getPeriodSegment = (period: string, month: number) => {
  switch (period) {
    case 'Y': return 0
    case 'YH': return month < 7 ? 1 : 2
    case 'YQ': return (month < 4 ? 1 : month < 7 ? 2 : month < 10 ? 3 : 4)
    case 'YM': return month > 12 ? 12 : month < 1 ? 1 : month
    default:
      return 0
  }
}

export const splitCpPeriod = (cpPeriod: CpPeriodType) => {
  const [beginMonth, beginYear] = yearMonth(cpPeriod.begin)
  const [endMonth, endYear] = yearMonth(cpPeriod.end)

  return [beginYear, beginMonth, endYear, endMonth]
}

export const determinePeriodEnd = (period: SelectedPeriod) => {
  switch (period.type) {
    case "Y": return [12, period.year]
    case "YH": return [period.segment * 6, period.year]
    case "YQ": return [period.segment * 3, period.year]
    default: return [period.segment, period.year]
  }
}

export const calcSegment = (period: SelectedPeriod, cpPeriod?: CpPeriodType) => {
  const [month, year] = determinePeriodEnd(period)
  if (cpPeriod) {
    const [beginYear, beginMonth, endYear, endMonth] = splitCpPeriod(cpPeriod)
    if (endYear > period.year) {
      return [year, month]
    } else {
      return [year, Math.min(endMonth, month)]
    }
  }
  return [year, month]
}

export const periodDisplayString = (period: SelectedPeriod) => {
  switch (period.type) {
    case 'YH': return `${MONTHNAME[(period.segment*6)-5].substring(0, 3)}-${MONTHNAME[period.segment*6].substring(0, 3)} ${period.year}`
    case 'YQ': return `${MONTHNAME[(period.segment*3)-2].substring(0, 3)}-${MONTHNAME[period.segment*3].substring(0, 3)} ${period.year}`
    case 'YM': return `${MONTHNAME[period.segment]} ${period.year}`
    case 'Y' : return `${MONTHNAME[1].substring(0, 3)}-${MONTHNAME[12].substring(0, 3)} ${period.year}`
    case 'D' : {
      const d = dayOfYearToDate(period.year, period.segment)
      return toLocalISODate(d)
    }
  }
}

// Day-of-year (1..366) → Date at 00:00 local time
export const dayOfYearToDate = (year: number, dayOfYear: number) => {
  const d = new Date(year, 0, 1, 0, 0, 0, 0)
  d.setDate(d.getDate() + (dayOfYear - 1))
  return d
}

export const dateToDayOfYear = (d: Date) => {
  // Count whole calendar days via UTC to stay DST-safe: subtracting wall-clock
  // timestamps and dividing by 24h loses a day once a DST change (e.g. Europe/
  // Vienna CET→CEST) puts a 23h day between Jan 1 and the date, which shifted
  // the day-view navigation by a day in summer.
  const start = Date.UTC(d.getFullYear(), 0, 1)
  const cur = Date.UTC(d.getFullYear(), d.getMonth(), d.getDate())
  return Math.round((cur - start) / (24 * 60 * 60 * 1000)) + 1
}

// Format a Date as YYYY-MM-DD from its LOCAL components. Avoids the UTC shift of
// toISOString(), which renders the previous day in positive-UTC zones (e.g. a
// local 30.06 00:00 in Europe/Vienna becomes "2026-06-29").
export const toLocalISODate = (d: Date) => {
  const pad = (n: number) => n.toString().padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export const calcXAxisName = (i: number, period: SelectedPeriod) => {
  let offset = 0
  switch (period && period.type) {
    case 'YH':
      if (period.segment === 1 && i === 0) offset = 52
      else if (period.segment === 2) offset = GetWeek(new Date(period.year, 6,1,0,0,1))
      // return i > 0 && i <= 12 ? `${MONTHNAME[i].substring(0, 3)}` : `${i}`
      return `${i+offset} KWo`
    case 'YQ':
      // return i > 0 && i <= 12 ? `${MONTHNAME[i].substring(0, 3)}` : `${i}`
      if (period.segment === 1 && i === 0) {
        offset = 52
      } else if (period.segment === 2) {
        offset = GetWeek(new Date(period.year, 3,1,0,0,1))
      } else if (period.segment === 3) {
        offset = GetWeek(new Date(period.year, 6,1,0,0,1))
      } else if (period.segment === 4) {
        offset = GetWeek(new Date(period.year, 9,1,0,0,1))
      }
      return `${i+offset} KWo`
    case 'YM':
      return `${i+1}.${period.segment}`
    case 'Y' :
      return i >= 0 && i < 12 ? `${MONTHNAME[i+1].substring(0, 3)}` : `${i}`
    case 'D' : {
      // 96 × 15-min slots: i is 0..95 → "HH:MM"; recharts XAxis interval controls density
      const hour = Math.floor(i / 4)
      const minute = (i % 4) * 15
      return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`
    }
  }
}

export const getPreviousPeriod = (period: SelectedPeriod) => {
  const prePeriod = {...period, segment: period.segment - 1} as SelectedPeriod
  if (prePeriod.segment < 1) {
    prePeriod.year = period.year - 1
    switch (period.type) {
      case 'YH': prePeriod.segment = 2; break
      case 'YQ': prePeriod.segment = 4; break
      case 'YM': prePeriod.segment = 12; break
      case 'Y' : prePeriod.segment = 0; break
    }
  }
  return prePeriod
}

export const createNewPeriod = (period: SelectedPeriod | undefined, target: ReportType, currentSegmentIdx: number, cpPeriod?: CpPeriodType) => {
  if (period !== undefined) {
    switch (target) {
      case 'D': {
        // Current period: default to yesterday, not today — today's 15-minute
        // data is still incomplete, so open on the last fully-recorded day.
        const yesterday = new Date()
        yesterday.setDate(yesterday.getDate() - 1)
        if (yesterday.getFullYear() === period.year) {
          return {type: target, year: period.year, segment: dateToDayOfYear(yesterday)}
        }
        // A non-current billing period: open on its first day (period start),
        // not 1 January.
        if (cpPeriod && cpPeriod.begin) {
          const [day, month, year] = splitDate(cpPeriod.begin)
          if (day && month && year) {
            return {type: target, year, segment: dateToDayOfYear(new Date(year, month - 1, day))}
          }
        }
        return {type: target, year: period.year, segment: 1}
      }
      case 'Y':
        return {type: target, segment: 0, year: period.year}
      case 'YM':
        const splitedPeriod = cpPeriod && splitCpPeriod(cpPeriod)
        switch (period.type) {
          case 'Y':
            return {type: target, segment: splitedPeriod ? splitedPeriod[3] : currentSegmentIdx, year: splitedPeriod ? splitedPeriod[2] : period.year}
          case 'YH':
            return {type: target, segment: splitedPeriod ? splitedPeriod[3] : period.segment === 2 ? 6 : 1, year: splitedPeriod ? splitedPeriod[2] : period.year}
          case 'YQ':
            return {type: target, segment: splitedPeriod ? splitedPeriod[3] : period.segment === 2 ? 3 : period.segment === 3 ? 6 : period.segment === 4 ? 9 : 1, year: splitedPeriod ? splitedPeriod[2] : period.year}
          case 'D':
            return {type: target, segment: dayOfYearToDate(period.year, period.segment).getMonth() + 1, year: period.year}
          default:
            return period
        }
      case 'YQ':
        switch (period.type) {
          case 'Y':
            return {type: target, segment: Math.ceil((cpPeriod ? splitCpPeriod(cpPeriod)[3] : currentSegmentIdx) / 3), year: period.year}
          case 'YH':
            return {type: target, segment: period.segment === 2 ? 3 : 1, year: period.year}
          case 'YM':
            return {type: target, segment: Math.ceil(period.segment / 3), year: period.year}
          case 'D':
            return {type: target, segment: Math.ceil((dayOfYearToDate(period.year, period.segment).getMonth() + 1) / 3), year: period.year}
          default:
            return period
        }
      case 'YH':
        switch (period.type) {
          case 'Y':
            return {type: target, segment: Math.max(1, Math.ceil((cpPeriod ? splitCpPeriod(cpPeriod)[3] : currentSegmentIdx) / 6)), year: period.year}
          case 'YQ':
            return {type: target, segment: Math.max(1, Math.ceil(period.segment / 2)), year: period.year}
          case 'YM':
            return {type: target, segment: Math.max(1, Math.ceil(period.segment / 6)), year: period.year}
          case 'D':
            return {type: target, segment: Math.max(1, Math.ceil((dayOfYearToDate(period.year, period.segment).getMonth() + 1) / 6)), year: period.year}
          default:
            return period
        }
      default: return period
    }
  }
  return undefined
}

export const calcCurrentPeriod = (period: SelectedPeriod) => {
  const currentDate =  new Date(Date.now())
  const currentPeroid = {type: period.type, year: currentDate.getFullYear(), segment: 0} as SelectedPeriod

  switch (period.type) {
    case "YM":
      currentPeroid.segment = currentDate.getMonth() + 1
      break;
    case "YQ":
      const m = currentDate.getMonth() + 1
      currentPeroid.segment = (m < 4 ? 1 : m < 7 ? 2 : m < 10 ? 3 : 4)
      break;
    case "YH":
      currentPeroid.segment = (currentDate.getMonth() + 1 < 7 ? 1 : 2)
  }
    return currentPeroid;
}

export function findPartial<O extends object, OT extends keyof object>(obj: O, key: string): Partial<O> {
  let result = {}
  Object.keys(obj).forEach(k => {
    if (typeof obj[k as OT] === 'object') {
      const sub = findPartial(obj[k as OT], key)
      if (Object.keys(sub).length !== 0) {
        result = {[k]: sub}
      }
    } else if (k === key) {
      result = {[k]: obj[k as OT]}
    }
  })
  return result
}

// Kuerzt lange Timestampangaben. Z.B.: 2023-07-31T19:55:04.234769 -> 2023-07-31, 19:55
export function reformatDateTimeStamp(dateTimeStampString : string) : string {
  if (dateTimeStampString && /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d*$/.test(dateTimeStampString)) {
    // billing serialises these status timestamps from LocalDateTime.now() in a UTC container,
    // i.e. a naive UTC wall-clock without offset. Interpret it as UTC and render in the
    // viewer's local time instead of slicing the raw (UTC) string (which showed 2h early in
    // summer). Output format unchanged: "YYYY-MM-DD, HH:mm".
    const d = new Date(dateTimeStampString + "Z");
    if (isNaN(d.getTime())) {
      return dateTimeStampString.substring(0,10)+", "+dateTimeStampString.substring(11,16)
    }
    const pad = (n: number) => n.toString().padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}, ${pad(d.getHours())}:${pad(d.getMinutes())}`
  } else {
    return "";
  }
}

export function GetWeek(date: Date) {
  let currentThursday = new Date(date.getTime() + (3 - ((date.getDay() + 6) % 7)) * 86400000);
  let yearOfThursday = currentThursday.getFullYear();
  let firstThursday = new Date(new Date(yearOfThursday, 0, 4).getTime() + (3 - ((new Date(yearOfThursday, 0, 4).getDay() + 6) % 7)) * 86400000);
  let weekNumber = Math.floor(1 + 0.5 + (currentThursday.getTime() - firstThursday.getTime()) / 86400000 / 7);
  return weekNumber;
}

export function GroupBy<T, K extends keyof any>(list: T[], getKey: (item: T) => K) {
  return list.reduce((previous, currentItem) => {
    const group = getKey(currentItem);
    if (!previous[group]) previous[group] = [];
    previous[group].push(currentItem);
    return previous;
  }, {} as Record<K, T[]>);
}

export function JoinStrings(sep: string, missing?: string, ...items: string[]): string {
  if (missing) {
    return items.map(i => i && i.length > 0 ? i : missing).join(sep)
  }
  return items.filter(i => i.length > 0).join(sep)
}
// ZVT (zeitvariabler Tarif): liefert die generischen Zeitfenster eines
// zeitbasierten Tarifs fuer den energystore-Report-Request und den
// billing-Konsistenz-Guard. undefined fuer Einfach-Tarife.
export const zvtTimeWindows = (tariff?: EegTariff): TariffTimeWindow[] | undefined => {
  if (!tariff || !tariff.useTimeTariff) return undefined
  const windows: TariffTimeWindow[] = []
  if (tariff.timeTariff1Active && tariff.timeTariff1From && tariff.timeTariff1To) {
    windows.push({key: "T1", from: tariff.timeTariff1From, to: tariff.timeTariff1To})
  }
  if (tariff.timeTariff2Active && tariff.timeTariff2From && tariff.timeTariff2To) {
    windows.push({key: "T2", from: tariff.timeTariff2From, to: tariff.timeTariff2To})
  }
  return windows.length > 0 ? windows : undefined
}
