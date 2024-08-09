import {EegParticipant} from "../models/members.model";
import {EnergyMeta} from "../models/energy.model";
import {Metering} from "../models/meteringpoint.model";
import moment from "moment";

/**
 * filter active participant for a particular period (start to end). A active Participants has metering points with status ACTIVE or INACTIVE.
 * INACTIVE meteringpoint has been revoked by netoperators or by customer itself.
 * ACTIVE meteringpoints are still participate
 *
 * @param participants
 * @param start activesince field is less
 * @param end inactivesince is between
 */
export const filterActiveParticipantAndMeter = (participants: EegParticipant[], start: Date, end: Date) => {
  return participants.map(p => {
    const endDate = end.getTime() + (24*60*60*1000);
    return {
      ...p, meters: p.meters.filter(m =>
        (m.participantState
          ? (new Date(m.participantState.inactiveSince).getTime() >= endDate && new Date(m.participantState.activeSince).getTime() <= endDate) ||
          (new Date(m.participantState.inactiveSince).getTime() >= start.getTime() && new Date(m.participantState.inactiveSince).getTime() <= endDate)
          : true) || (m.status !== 'ACTIVE' && m.status !== 'INACTIVE')
      )
    } as EegParticipant
  })/*.filter(p => p.meters.length > 0)*/
}

export const filterActiveMeter = <T extends Record<string, EnergyMeta>>(meta: T, m: Metering, start: moment.Moment, end: moment.Moment) => {
  const metaInfo = meta[m.meteringPoint]
  if (m.meteringPoint === "AT0030000000000000000000000051361") {
    const peter = 1;
    console.log(metaInfo)
  }
  if (metaInfo) {
    try {
      const startDate = moment(metaInfo.period_start, "DD.MM.YYYY HH:mm:ss")
      const endDate = moment(metaInfo.period_end, "DD.MM.YYYY HH:mm:ss")

      if (startDate.isBefore(end) && endDate.isAfter(start)) {
        return true
      }
    } catch(e) {
      console.error("Filter Meter: ", m, e, meta[m.meteringPoint])
    }
  }
  return false
}