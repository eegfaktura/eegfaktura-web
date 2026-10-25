import {useMemo} from "react";
import {EegParticipant} from "../../models/members.model";
import {filterMeters} from "./ParticipantPane.functions";
import {hasOpenProblem} from "../../util/FilterHelper.unit";
import moment from "moment";
import {MemberSort, sortMembers} from "./participantSort";
import {memberActivity} from "../../util/MemberActivity.util";

interface SortParticipantProps {
  participants: EegParticipant[],
  hideProducers: boolean,
  hideConsumers: boolean,
  memberSort: MemberSort,
}
export const sortParticipants = (options: SortParticipantProps) => {
  const {participants, hideConsumers, hideProducers, memberSort} = options
  return useMemo(() => sortMembers(participants, memberSort), [participants, hideConsumers, hideProducers, memberSort])
}

interface FilterParticipantProps {
  selectedFilter: string,
  sortedParticipants: EegParticipant[],
  participants: EegParticipant[],
  hideProducers: boolean,
  hideConsumers: boolean,
  hideMeter: boolean,
  memberSort: MemberSort,
}
export const filterParticipant = (options: FilterParticipantProps) => {
  const {selectedFilter, sortedParticipants, participants, hideConsumers, hideProducers, hideMeter, memberSort} = options
  return useMemo(() => {
    // the filtered views keep their order with the standard sort
    const sorted = (list: EegParticipant[]) => memberSort === 'standard' ? list : sortMembers(list, memberSort)
    switch (selectedFilter) {
      case 'active':
        // the same rule as the "Aktive" count of the dashboard
        const sorted0 = participants.filter(p => memberActivity(p) === 'ACTIVE')
          .map(p => ({...p, meters: p.meters.filter(m => m.status === "ACTIVE")}))
        return filterMeters(sorted(sorted0), hideProducers, hideConsumers, false)
      case 'init':
        const sorted1 = participants
          .filter(p => p.meters.findIndex(meter => meter.status === 'INIT' || (meter.processState !== "ACTIVE" && meter.processState !== "INACTIVE")) >= 0)
          .map(p => {
            return {
              ...p, meters: p.meters.filter(m =>
                (m.processState === "NEW" || m.processState === "INIT" || m.processState === "APPROVED" || m.processState === "PENDING"))
            }
          })
        return filterMeters(sorted(sorted1), hideProducers, hideConsumers, false)
      case 'inactive':
        const sorted2 = participants.filter(p => p.meters.findIndex(meter => meter.status === "INACTIVE") >= 0)
          .map(p => {
            return {...p, meters: p.meters.filter(m => m.status === "INACTIVE")}
          })
        return filterMeters(sorted(sorted2), hideProducers, hideConsumers, false)
      case 'rejected':
        // also meters that were inactive before (re-registration after leaving was rejected)
        const sorted3 = participants.filter(p => p.meters.some(hasOpenProblem))
          .map(p => ({...p, meters: p.meters.filter(hasOpenProblem)}))
        return filterMeters(sorted(sorted3), hideProducers, hideConsumers, false)
      default:
        return filterMeters(sortedParticipants, hideProducers, hideConsumers, hideMeter /*!(hideProducers || hideConsumers)*/)
    }
  }, [selectedFilter, participants, sortedParticipants, hideConsumers, hideProducers, hideMeter, memberSort])
}