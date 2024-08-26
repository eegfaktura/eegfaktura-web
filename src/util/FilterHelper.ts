import {Metering, MeteringProcessStateType} from "../models/meteringpoint.model";


export function FilterByMeterState(meters: Metering[], status: MeteringProcessStateType[]): Metering[] {
  return meters.filter(m => status.includes(m.processState))
}

export const meteringDisplayName = (m: Metering): string => {
  if (m.equipmentName && m.equipmentName.length > 0) {
    return `${m.equipmentName} - ${m.meteringPoint}`
  }
  return m.meteringPoint
}