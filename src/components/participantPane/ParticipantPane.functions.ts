import {Metering, MeteringEnergyGroupType} from "../../models/meteringpoint.model";
import {EegParticipant} from "../../models/members.model";
import {meteringEnergyGroup1} from "../../store/energy";
import {ratesMapSelector} from "../../store/rate";
import {store} from "../../store";
import {zvtTimeWindows} from "../../util/Helper.util";

export const buildAllocationMapFromSelected = (participants: EegParticipant[], checkedParticipant: Record<string, boolean>): MeteringEnergyGroupType[] => {
  const participantReport = meteringEnergyGroup1(store.getState())
  const tariffById = ratesMapSelector(store.getState())
  const activeMeters = participants.flatMap(p => p.meters.filter(m=>m.status !== "INIT").map(m => m.meteringPoint))
  const tariffIdByMeter = participants.flatMap(p => p.meters).reduce(
    (acc, m) => ({...acc, [m.meteringPoint]: m.tariff_id}), {} as Record<string, string>)

  return participantReport
    .filter(p => checkedParticipant[p.participantId] !== undefined && checkedParticipant[p.participantId])
    .flatMap(p => {
      return p.meters.filter(m => activeMeters.includes(m.meterId)).map(m => {
        // ZVT: bei zeitbasiertem Tarif die Fenster-Teilsummen (buckets) aus dem
        // energystore-Report plus die verwendeten Fenster-Definitionen als
        // Konsistenz-Guard mitgeben. billing bricht fail-loud ab, wenn sie
        // fehlen oder nicht (mehr) zum Tarif passen.
        const timeWindows = zvtTimeWindows(tariffById[tariffIdByMeter[m.meterId]])
        return {
          participantId: p.participantId,
          meteringPoint: m.meterId,
          allocationKWh: m.meterDir === "GENERATION"
            ? m.report.summary.production - m.report.summary.allocation
            : m.report.summary.utilization,
          ...(timeWindows ? {timeWindows: timeWindows, buckets: m.report.buckets} : {})
        } as MeteringEnergyGroupType
      })//.filter(e => e.allocationKWh > 0)
    })
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
    .filter((m) => (m.meters.length > 0 || showEmptyMembers));
};

export const filterSearchQuery = (entities: EegParticipant[], query: string | undefined) => {
  if (query && query.length > 0) {
    const filterEntries = (d: EegParticipant): [boolean, Metering[]] => {
      return [
        (d.lastname && d.lastname.toLowerCase().indexOf(query) > -1) ||
        (d.firstname && d.firstname.toLowerCase().indexOf(query) > -1) ||
        (d.participantNumber && d.participantNumber.toLowerCase().indexOf(query) > -1) ||
        (!!d.contact && !!d.contact.email && d.contact.email.toLowerCase().indexOf(query) > -1),
        filterMetering(d),
      ];
    };
    const filterMetering = (d: EegParticipant): Metering[] => {
      return (
        d.meters.filter((m) => {
          const eq =
            m.equipmentName && m.equipmentName.length > 0
              ? m.equipmentName.toLowerCase().indexOf(query) > -1
              : false
          return m.meteringPoint.toLowerCase().indexOf(query) > -1 || eq
        })
      );
    };

    return entities.reduce((r: EegParticipant[], d: EegParticipant) => {
      const [matchParticipant, matchMeter] = filterEntries(d);
      if (matchParticipant || matchMeter.length > 0) {
        if (matchMeter.length > 0) {
          r.push({...d, meters: matchMeter});
        } else {
          r.push({...d})
        }
      }
      return r;
    }, [] as EegParticipant[]);
  } else {
    return entities;
  }
}