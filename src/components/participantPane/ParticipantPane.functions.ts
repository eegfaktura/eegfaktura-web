import {Metering, MeteringEnergyGroupType, ParticipantBillType} from "../../models/meteringpoint.model";
import {EegParticipant} from "../../models/members.model";
import {meteringEnergyGroup1} from "../../store/energy";
import {store} from "../../store";
import {hasOpenProblem} from "../../util/FilterHelper.unit";

/**
 * A member a billing run includes (platform#194: always the whole community, no selection): active, with a tariff
 * on the member or on a registered metering point — the rule of the former „alle auswählen“. Members without a
 * tariff are named by „Daten prüfen“.
 */
export const isBillableParticipant = (p: EegParticipant): boolean =>
  p.status === "ACTIVE" && p.meters.reduce((c, e) => c || (e.tariff_id !== undefined && e.tariff_id !== null && e.status !== 'INIT'),
    p.tariffId !== undefined && p.tariffId != null)

/**
 * Why a billing run cannot start now (platform#189), or undefined when it can: the report of the period is still
 * loading, its load failed, or it holds no entry of a billable member. A run is never started with an empty list.
 */
export const billingRunBlocker = (reportLoading: boolean, reportError: string | undefined, allocationCount: number): string | undefined => {
  if (reportLoading) return "Die Energiedaten des Zeitraums werden noch geladen. Bitte kurz warten und erneut starten."
  if (reportError) return "Die Energiedaten des Zeitraums konnten nicht geladen werden. Bitte die Seite neu laden und erneut starten."
  if (allocationCount === 0) return "Im gewählten Zeitraum gibt es keine abrechenbaren Mitglieder (aktiv, mit Tarif) in den geladenen Energiedaten. „Daten prüfen“ zeigt Zählpunkte ohne Tarif."
  return undefined
}

/**
 * Tooltip of the € switch. The switch only opens or closes the billing view (the run is started there), so the text
 * names that; while it cannot be switched on, the reason. `canSwitchOn` is the switch's own state: while a report loads
 * the switch keeps its previous state, so the loading text only shows when it is off-limits.
 */
export const billingSwitchTooltip = (s: {canSwitchOn: boolean, on: boolean, hasPeriod: boolean, reportLoading: boolean,
                                          reportError: string | undefined, billableCount: number}): string => {
  if (!s.canSwitchOn) {
    if (!s.hasPeriod) return "Bitte zuerst einen Zeitraum wählen."
    if (s.reportLoading) return "Die Energiedaten des Zeitraums werden geladen."
    if (s.reportError) return "Die Energiedaten des Zeitraums konnten nicht geladen werden."
    if (s.billableCount === 0) return "Im Zeitraum gibt es keine abrechenbaren Mitglieder (aktiv, mit Tarif)."
  }
  return s.on ? "Abrechnung schließen" : "Abrechnung vorbereiten"
}

/** The energy of every billable member of the period, from the loaded energy report; built when the run starts. */
export const buildAllocationMap = (participants: EegParticipant[]): MeteringEnergyGroupType[] => {
  const participantReport = meteringEnergyGroup1(store.getState())
  const activeMeters = participants.flatMap(p => p.meters.filter(m=>m.status !== "INIT").map(m => m.meteringPoint))
  const billable = new Set(participants.filter(isBillableParticipant).map(p => p.id))

  return participantReport
    .filter(p => billable.has(p.participantId))
    .flatMap(p => {
      return p.meters.filter(m => activeMeters.includes(m.meterId)).map(m => {
        // ZVT: die Fenster-Teilsummen (buckets) mit genau den Fenstern mitgeben, fuer die der energystore sie
        // berechnet hat (er schickt sie im Report zurueck), nicht mit den Fenstern des aktuellen Tarifs: nach
        // einer Tarifaenderung kann der Report noch der alte sein (platform#174). billing vergleicht die Fenster
        // mit dem Tarif und bricht fail-loud ab, wenn sie fehlen oder nicht (mehr) passen - nie eine Rechnung
        // mit Teilsummen zu anderen Fenstern.
        const timeWindows = m.timeWindows && m.timeWindows.length > 0 ? m.timeWindows : undefined
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
// The same items as on the documents and in the Excel export, metering point fees and the joining fee included.
export const billTotal = (bill: ParticipantBillType) =>
  bill.meteringPoints.reduce((sum, m) => sum + m.amount,
    bill.participantFee + (bill.meteringPointFeeSum ?? 0) + (bill.joiningFee ?? 0))

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

// A download with a busy overlay (no second click while it runs) and an error toast with the reason (261024-ca14).
export const downloadWithFeedback = async (
  download: () => Promise<unknown>,
  busy: {show: (message: string) => Promise<unknown>, hide: () => Promise<unknown>},
  failed: (message: string) => void,
  what: string,
) => {
  await busy.show(`${what} wird erstellt ...`)
  try {
    await download()
    await busy.hide()
  } catch (e) {
    await busy.hide()
    const reason = e instanceof Error && e.message ? ` (${e.message})` : ""
    failed(`Die ${what} konnte nicht erstellt werden.${reason}`)
  }
}
