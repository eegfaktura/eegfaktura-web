import {Metering, MeteringEnergyGroupType, ParticipantBillType} from "../../models/meteringpoint.model";
import {EegParticipant} from "../../models/members.model";
import {meteringEnergyGroup1} from "../../store/energy";
import {ratesMapSelector} from "../../store/rate";
import {store} from "../../store";
import {zvtTimeWindows} from "../../util/Helper.util";
import {hasOpenProblem} from "../../util/FilterHelper.unit";

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

const inRegistration = (m: Metering) =>
  m.processState === 'NEW' || m.processState === 'INIT' || m.processState === 'PENDING' || m.processState === 'APPROVED'

/**
 * List view only: adds the metering points with an open problem (rejected, invalid, revoked registration) or a
 * registration in progress that the period filter dropped, e.g. a re-registration after leaving (it keeps the old
 * inactive date until the grid operator completes it). Billing, reports and counts keep
 * using the period-filtered participants, so these metering points are never billed outside their period.
 */
export const withOpenProblems = (periodParticipants: EegParticipant[], allParticipants: EegParticipant[]) =>
  periodParticipants.map(p => {
    const extra = (allParticipants.find(a => a.id === p.id)?.meters ?? [])
      .filter(m => (hasOpenProblem(m) || inRegistration(m)) && !p.meters.some(x => x.meteringPoint === m.meteringPoint))
    return extra.length > 0 ? {...p, meters: [...p.meters, ...extra]} : p
  })

// Gross amount of a member in a billing run: positive is paid by the member, negative is paid to the member.
// The same items as on the documents and in the Excel export, metering point fees included.
export const billTotal = (bill: ParticipantBillType) =>
  bill.meteringPoints.reduce((sum, m) => sum + m.amount, bill.participantFee + (bill.meteringPointFeeSum ?? 0))

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

// Uploads the documents chosen when a member is activated. A failed upload must not stop the
// activation: resolves with a warning text for the user instead, undefined when all went well.
export const uploadActivationDocuments = (upload: (files: File[]) => Promise<unknown>, files: File[]): Promise<string | undefined> => {
  if (files.length === 0) {
    return Promise.resolve(undefined)
  }
  return upload(files).then(
    () => undefined,
    (e) => `Nicht hochgeladen: ${e instanceof Error ? e.message : String(e)}. Die Dokumente können später im Bereich Verträge hochgeladen werden.`)
}
