import React, {useMemo} from "react";
import {EegParticipant} from "../../models/members.model";
import {filterMeters} from "./ParticipantPane.functions";
import participants from "../../pages/Participants";
import {Eeg} from "../../models/eeg.model";
import moment from "moment";


// interface InitializeParticipantProps {
//   participants: EegParticipant[],
//   setSortedParticipants: (value: React.SetStateAction<EegParticipant[]>) => void,
//   setResult: (value: React.SetStateAction<EegParticipant[]>) => void,
//   hideProducers: boolean,
//   hideConsumers: boolean,
// }
//
// export const initializeParticipantEffect = (options: InitializeParticipantProps) => {
//   const {participants, setSortedParticipants, setResult, hideConsumers, hideProducers} = options
//   return () => {
//     const start = moment()
//     const sorted = participants.sort((a, b) => {
//       const meterAOK = a.meters.reduce(
//         (i, m) => m.processState === "ACTIVE" && i,
//         true
//       );
//       const meterBOK = b.meters.reduce(
//         (i, m) => m.processState === "ACTIVE" && i,
//         true
//       );
//
//       if (a.status !== "ACTIVE" && b.status === "ACTIVE") {
//         return -1;
//       }
//
//       if (b.status !== "ACTIVE" && a.status === "ACTIVE") {
//         return 1;
//       }
//
//       if (b.status !== "ACTIVE" || a.status !== "ACTIVE") {
//         if (meterAOK === meterBOK) {
//           return 0;
//         } else if (!meterAOK && meterBOK) {
//           return -1;
//         }
//         return 1;
//       }
//
//       if (meterAOK && !meterBOK) {
//         return 1;
//       } else if (!meterAOK && meterBOK) {
//         return -1;
//       }
//       return 0;
//     });
//     // setCheckedParticipant(sorted.map(() => false))
//     const filteredAndSorted = filterMeters(sorted, hideProducers, hideConsumers);
//     setSortedParticipants(sorted);
//     setResult(filteredAndSorted);
//     console.log("Duration: ", moment().diff(start));
//   }
// }
//
// interface FilterParticipantProps1 {
//   selectedFilter: string,
//   sortedParticipants: EegParticipant[],
//   participants: EegParticipant[],
//   setResult: (value: React.SetStateAction<EegParticipant[]>) => void,
//   hideProducers: boolean,
//   hideConsumers: boolean,
// }
//
// export const filterParticipantEffect = (options: FilterParticipantProps1) => {
//   const {selectedFilter, sortedParticipants, participants, setResult, hideConsumers, hideProducers} = options
//   return () => {
//     console.log("useEffect filter Participant", selectedFilter, sortedParticipants, participants);
//     switch (selectedFilter) {
//       case 'init':
//         const sorted1 = participants
//           .filter(p => p.meters.findIndex(meter => meter.status === 'INIT' || (meter.processState !== "ACTIVE" && meter.processState !== "INACTIVE")) >= 0)
//           .map(p => {
//             return {
//               ...p, meters: p.meters.filter(m =>
//                 (m.processState === "NEW" || m.processState === "INIT" || m.processState === "APPROVED" || m.processState === "PENDING"))
//             }
//           })
//         setResult(filterMeters(sorted1, hideProducers, hideConsumers, false))
//         break;
//       case 'inactive':
//         const sorted2 = participants.filter(p => p.meters.findIndex(meter => meter.status === "INACTIVE") >= 0)
//           .map(p => {
//             return {...p, meters: p.meters.filter(m => m.status === "INACTIVE")}
//           })
//         setResult(filterMeters(sorted2, hideProducers, hideConsumers, false))
//         break;
//       case 'rejected':
//         const sorted3 = participants.filter(p => p.meters.findIndex(meter => meter.status === "INIT") >= 0)
//           .map(p => {
//             return {
//               ...p, meters: p.meters.filter(m =>
//                 m.processState === "REJECTED" || m.processState === "INVALID" || m.processState === "REVOKED")
//             }
//           })
//         setResult(filterMeters(sorted3, hideProducers, hideConsumers, false))
//         break;
//       default:
//         setResult(sortedParticipants)
//     }
//   }
// }

interface SortParticipantProps {
  participants: EegParticipant[],
  hideProducers: boolean,
  hideConsumers: boolean,
}
export const sortParticipants = (options: SortParticipantProps) => {
  const {participants, hideConsumers, hideProducers} = options
  return useMemo(() => {
    const start = moment()
    const sorted = participants.sort((a, b) => {
      const meterAOK = a.meters.reduce(
        (i, m) => m.processState === "ACTIVE" && i,
        true
      );
      const meterBOK = b.meters.reduce(
        (i, m) => m.processState === "ACTIVE" && i,
        true
      );

      if (a.status !== "ACTIVE" && b.status === "ACTIVE") {
        return -1;
      }

      if (b.status !== "ACTIVE" && a.status === "ACTIVE") {
        return 1;
      }

      if (b.status !== "ACTIVE" || a.status !== "ACTIVE") {
        if (meterAOK === meterBOK) {
          return 0;
        } else if (!meterAOK && meterBOK) {
          return -1;
        }
        return 1;
      }

      if (meterAOK && !meterBOK) {
        return 1;
      } else if (!meterAOK && meterBOK) {
        return -1;
      }
      return 0;
    });
    console.log("Duration: ", moment().diff(start));
    return sorted
  }, [participants, hideConsumers, hideProducers])
}

interface FilterParticipantProps {
  selectedFilter: string,
  sortedParticipants: EegParticipant[],
  participants: EegParticipant[],
  hideProducers: boolean,
  hideConsumers: boolean,
}
export const filterParticipant = (options: FilterParticipantProps) => {
  const {selectedFilter, sortedParticipants, participants, hideConsumers, hideProducers} = options
  return useMemo(() => {
    console.log("Filter Participant", selectedFilter, sortedParticipants, participants);
    switch (selectedFilter) {
      case 'init':
        const sorted1 = participants
          .filter(p => p.meters.findIndex(meter => meter.status === 'INIT' || (meter.processState !== "ACTIVE" && meter.processState !== "INACTIVE")) >= 0)
          .map(p => {
            return {
              ...p, meters: p.meters.filter(m =>
                (m.processState === "NEW" || m.processState === "INIT" || m.processState === "APPROVED" || m.processState === "PENDING"))
            }
          })
        return filterMeters(sorted1, hideProducers, hideConsumers, false)
      case 'inactive':
        const sorted2 = participants.filter(p => p.meters.findIndex(meter => meter.status === "INACTIVE") >= 0)
          .map(p => {
            return {...p, meters: p.meters.filter(m => m.status === "INACTIVE")}
          })
        return filterMeters(sorted2, hideProducers, hideConsumers, false)
      case 'rejected':
        const sorted3 = participants.filter(p => p.meters.findIndex(meter => meter.status === "INIT") >= 0)
          .map(p => {
            return {
              ...p, meters: p.meters.filter(m =>
                m.processState === "REJECTED" || m.processState === "INVALID" || m.processState === "REVOKED")
            }
          })
        return filterMeters(sorted3, hideProducers, hideConsumers, false)
        break;
      default:
        return filterMeters(sortedParticipants, hideProducers, hideConsumers, false /*!(hideProducers || hideConsumers)*/)
    }
  }, [selectedFilter, participants, sortedParticipants, hideConsumers, hideProducers])
}