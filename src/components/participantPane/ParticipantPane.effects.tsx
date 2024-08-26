import React from "react";
import {EegParticipant} from "../../models/members.model";
import {filterMeters} from "./ParticipantPane.functions";


interface InitializeParticipantProps {
  participants: EegParticipant[],
  setSortedParticipants: (value: React.SetStateAction<EegParticipant[]>) => void,
  setResult: (value: React.SetStateAction<EegParticipant[]>) => void,
  hideProducers: boolean,
  hideConsumers: boolean,
}
export const initializeParticipantEffect = (options: InitializeParticipantProps) => {
  const {participants, setSortedParticipants, setResult, hideConsumers, hideProducers} = options
  return () => {
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
    // setCheckedParticipant(sorted.map(() => false))
    const filteredAndSorted = filterMeters(sorted, hideProducers, hideConsumers);
    setSortedParticipants(sorted);
    setResult(filteredAndSorted);
  }
}