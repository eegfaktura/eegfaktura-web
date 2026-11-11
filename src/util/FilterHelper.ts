import {Metering, MeteringProcessStateType} from "../models/meteringpoint.model";
import {SelectedPeriod} from "../models/energy.model";
import {TFunction} from "i18next";


export function FilterByMeterState(meters: Metering[], status: MeteringProcessStateType[]): Metering[] {
  return meters.filter(m => status.includes(m.processState))
}

// The meters an EDA process is sent for: one entry per selected metering point number, taken only from
// the meters the form offered. After an owner change the same number exists twice in a community (the
// old member's INACTIVE entry and the new ACTIVE one); looking it up in all meters sent both and the
// grid operator rejected the request (support ticket 66110076). The ACTIVE entry wins.
export const selectedMeters = (offered: Metering[], ids: string[] | undefined): Metering[] =>
  Array.from(new Set(ids ?? []))
    .map(id => {
      const candidates = offered.filter(m => m.meteringPoint === id)
      return candidates.find(m => m.processState === 'ACTIVE') ?? candidates[0]
    })
    .filter((m): m is Metering => !!m)

// Label of a metering point in the process selections: direction (the terms of the meter form, "Verbraucher" /
// "Erzeuger"), the equipment name when set, and the metering point number.
export const meteringDisplayName = (m: Metering, t: TFunction): string => {
  const direction = t(m.direction === 'GENERATION' ? "producer" : "consumer")
  if (m.equipmentName && m.equipmentName.length > 0) {
    return `${direction} - ${m.equipmentName} - ${m.meteringPoint}`
  }
  return `${direction} - ${m.meteringPoint}`
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
