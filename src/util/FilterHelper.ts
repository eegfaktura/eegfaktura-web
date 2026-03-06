import {Metering, MeteringProcessStateType} from "../models/meteringpoint.model";
import {SelectedPeriod} from "../models/energy.model";


export function FilterByMeterState(meters: Metering[], status: MeteringProcessStateType[]): Metering[] {
  return meters.filter(m => status.includes(m.processState))
}

export const meteringDisplayName = (m: Metering): string => {
  if (m.equipmentName && m.equipmentName.length > 0) {
    return `${m.equipmentName} - ${m.meteringPoint}`
  }
  return m.meteringPoint
}

export const getPeriodDates = (period?: SelectedPeriod) => {
  if (period) {
    switch (period.type) {
      case 'Y':
        return [
          new Date(period.year, 0, 1, 0, 0, 0),
          new Date(period.year, 12, 0, 0, 0, 0)
        ]
      case 'YQ':
        return [
          new Date(period.year, ((period.segment - 1) * 3), 1, 0, 0, 0),
          new Date(period.year, ((period.segment) * 3), 0, 0, 0, 0)]
      case 'YH':
        return [
          new Date(period.year, (period.segment - 1) * 6, 1, 0, 0, 0),
          new Date(period.year, period.segment * 6, 0, 0, 0, 0)]
      default:
        return [
          new Date(period.year, period.segment - 1, 1, 0, 0, 0),
          new Date(period.year, period.segment, 0, 0, 0, 0)]
    }
  } else {
    return [new Date(), new Date()]
  }
}
