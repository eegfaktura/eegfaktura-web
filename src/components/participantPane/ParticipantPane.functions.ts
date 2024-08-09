import {MeteringEnergyGroupType} from "../../models/meteringpoint.model";
import {EegParticipant} from "../../models/members.model";

export const buildAllocationMapFromSelected = (participants: EegParticipant[], checkedParticipant: Record<string, boolean>, energyMeterGroup: Record<string, number>): MeteringEnergyGroupType[] => {
  const participantMap = participants.reduce(
    (r, p) => ({ ...r, [p.id]: p }),
    {} as Record<string, EegParticipant>
  );

  // Object.entries(checkedParticipant).forEach(c => {if (!!participantMap[c[0]]) console.log("Checked Participant not in Map", c)} )

  return Object.entries(checkedParticipant)
    .filter((c) => participantMap[c[0]])
    .flatMap((r) => [
      ...participantMap[r[0]].meters.filter((m) => m.tariff_id !== null && energyMeterGroup[m.meteringPoint] !== 0),
    ])
    .map((m) => {
      return {
        meteringPoint: m.meteringPoint,
        allocationKWh: energyMeterGroup[m.meteringPoint],
      } as MeteringEnergyGroupType;
    });
};

export const filterMeters = (p: EegParticipant[], hideProducers: boolean, hideConsumers: boolean, showEmptyMembers: boolean = true) => {
  return p
    .map((ip) => {
      return {
        ...ip,
        meters: ip.meters.filter((m) => {
          if (m.direction === "GENERATION" && hideProducers) return false;
          if (m.direction === "CONSUMPTION" && hideConsumers) return false;
          return true;
        }),
      } as EegParticipant;
    })
    .filter((m) => (m.meters.length > 0 || showEmptyMembers) || !(hideProducers || hideConsumers));
};

