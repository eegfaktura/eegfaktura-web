import {useMemo} from "react";
import {EegParticipant} from "../../models/members.model";
import {filterMeters} from "./ParticipantPane.functions";
import {MemberSort, sortMembers} from "./participantSort";
import {filterMembers, toMemberFilter} from "./memberFilter.functions";

interface SortParticipantProps {
  participants: EegParticipant[],
  memberSort: MemberSort,
  actionFirst: boolean,
}
export const sortParticipants = (options: SortParticipantProps) => {
  const {participants, memberSort, actionFirst} = options
  return useMemo(() => sortMembers(participants, memberSort, actionFirst), [participants, memberSort, actionFirst])
}

interface FilterParticipantProps {
  selectedFilter: string,
  sortedParticipants: EegParticipant[],
  participants: EegParticipant[],
  hideProducers: boolean,
  hideConsumers: boolean,
  hideMeter: boolean,
  memberSort: MemberSort,
  actionFirst: boolean,
}
export const filterParticipant = (options: FilterParticipantProps) => {
  const {selectedFilter, sortedParticipants, participants, hideConsumers, hideProducers, hideMeter, memberSort, actionFirst} = options
  return useMemo(() => {
    if (selectedFilter === 'period') {
      return filterMeters(sortedParticipants, hideProducers, hideConsumers, hideMeter /*!(hideProducers || hideConsumers)*/)
    }
    // sorted with all metering points of a member, then filtered: the order does not depend on the filter
    return filterMembers(sortMembers(participants, memberSort, actionFirst), toMemberFilter(selectedFilter),
      hideProducers, hideConsumers)
  }, [selectedFilter, participants, sortedParticipants, hideConsumers, hideProducers, hideMeter, memberSort, actionFirst])
}
