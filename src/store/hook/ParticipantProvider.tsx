import {createContext, FC, ReactNode, useCallback, useContext, useEffect, useMemo, useState} from "react";
import {EegParticipant} from "../../models/members.model";
import {useAppDispatch, useAppSelector} from "../index";
import {
  allParticipantsSelector,
  selectParticipant
} from "../participant";
import {EegTariff, RateTypeEnum} from "../../models/eeg.model";
import {clearEnergyState, fetchEnergyReportV2, selectedPeriodSelector} from "../energy";
import {MeterReport, ParticipantReport, SelectedPeriod} from "../../models/energy.model";
import {isEEGFetching, useTenant} from "./Eeg.provider";
import {filterActiveParticipantAndMeter} from "../../util/FilterHelper.unit";
import {getPeriodDates} from "../../util/FilterHelper";
import participants from "../../pages/Participants";
import {ratesMapSelector} from "../rate";
import {zvtTimeWindows} from "../../util/Helper.util";
import {useConfirmDiscard, useReportDirty} from "../../components/core/UnsavedChangesGuard.component";


export interface ParicipantState {
  participants: EegParticipant[]
  allParticipants: EegParticipant[]
  activePeriod?: SelectedPeriod
  // selectedParticipant: EegParticipant | undefined
  // selectedParticipants: string[]
  // rates: EegTariff[]
  createNewRate: () => void
  selectRate: (rate: EegTariff | undefined) => void
  createNewParticipant?: () => void
  selectedRate?: EegTariff
  detailsPageOpen: boolean
  showDetailsPage: (participant: EegParticipant) => void
  closeDetailPage: (open: boolean) => void
  billingEnabled: boolean
  setBillingEnabled: (enabled: boolean) => void
  showAddMeterPane: boolean
  setShowAddMeterPane: (show: boolean) => void
  // forms holding unsaved input (changed, failed to save or invalid), by source: switching the member, the billing view
  // or the community asks first (platform#228 step 4)
  unsaved: Partial<Record<UnsavedSource, boolean>>
  setUnsaved: (source: UnsavedSource, dirty: boolean) => void
  // loads the energy report of the shown period again, e.g. after a failed load (261024-ca26)
  reloadEnergyReport: () => void
}

const initialState: ParicipantState = {
  participants: [],
  allParticipants: [],
  activePeriod: undefined,
  // selectedParticipant: undefined,
  // selectedParticipants: [],
  // rates: [],
  createNewRate: () => {},
  selectRate: (e:EegTariff | undefined) => {},
  detailsPageOpen: false,
  showDetailsPage: (p: EegParticipant) => {},
  closeDetailPage: (open: boolean) => {},
  billingEnabled: false,
  setBillingEnabled: (enabled: boolean) => {},
  showAddMeterPane: false,
  setShowAddMeterPane: (show: boolean) => {},
  unsaved: {},
  setUnsaved: (source: UnsavedSource, dirty: boolean) => {},
  reloadEnergyReport: () => {},
}

export const ParticipantContext = createContext(initialState)

const ParticipantProvider: FC<{children: ReactNode}> = ({children}) => {

  const dispatch = useAppDispatch();
  const tenant = useTenant()
  const activePeriod = useAppSelector(selectedPeriodSelector)
  // const participants = useAppSelector(activeParticipantsSelector1)
  const allParticipants = useAppSelector(allParticipantsSelector)
  const tariffById = useAppSelector(ratesMapSelector)

  const isFechting = isEEGFetching()

  const [state, setState] = useState<ParicipantState>(initialState);
  const [detailOpen, setDetailOpen] = useState<boolean>(false);
  const [enableBilling, setEnableBilling] = useState<boolean>(false)
  const [showAddMeterPane, setShowAddMeterPane] = useState<boolean>(false)
  const [unsaved, setUnsavedState] = useState<Partial<Record<UnsavedSource, boolean>>>({})
  const setUnsaved = useCallback((source: UnsavedSource, dirty: boolean) =>
    setUnsavedState(prev => !!prev[source] === dirty ? prev : {...prev, [source]: dirty}), [])
  // the members active in the selected period, derived from the store (empty after a community switch, 261024-ca13)
  const activeParticipants = useMemo(() => {
    if (!activePeriod || !allParticipants) return []
    const [start, end] = getPeriodDates(activePeriod)
    return filterActiveParticipantAndMeter(allParticipants, start, end)
  }, [allParticipants, activePeriod])

  // the body of the energy report request for these members; undefined without members
  const reportRequest = useMemo(() => {
    if (!activePeriod || activeParticipants.length === 0) return undefined
    // ZVT: je Zaehlpunkt mit zeitbasiertem Tarif die generischen
    // Zeitfenster mitschicken - energystore liefert dann buckets zurueck.
    const participantsReport = activeParticipants.map(p => {
      return {
        participantId: p.id,
        meters: p.meters.filter(m => !!m.participantState).map(m => {
          const timeWindows = zvtTimeWindows(tariffById[m.tariff_id])
          return {meterId: m.meteringPoint, meterDir: m.direction,
            from: new Date(m.participantState.activeSince).getTime(),
            until: new Date(m.participantState.inactiveSince).getTime(),
            ...(timeWindows ? {timeWindows} : {})} as MeterReport})
      } as ParticipantReport
    })
    return {year: activePeriod.year, segment: activePeriod.segment, type: activePeriod.type,
      participants: participantsReport.filter(p => p.meters.length > 0)}
  }, [activePeriod, activeParticipants, tariffById])
  // The report takes seconds for a large community: fetch it again only when the request changes (community, period,
  // metering points with direction and active range, ZVT time windows - also when the tariffs load after the members).
  // Any other change of a member or metering point gives a new member array, but the same request.
  const reportKey = JSON.stringify([tenant.tenant, tenant.ecId, tenant.rcNr, reportRequest])

  const newRateFn = () => {
    setState({
      ...state,
      selectedRate: {name: RateTypeEnum.AHEAD} as EegTariff
    });
  }

  const selectRateFn = (rate: EegTariff | undefined) => {
    setState( {
      ...state,
      selectedRate: rate
    })
  }

  const showDetailPageFn = (participant: EegParticipant) => {
    dispatch(selectParticipant(participant.id))
    setDetailOpen(true);
  }

  const closeDetailPageFn = (state: boolean) => {
    setDetailOpen(state);
  }

  const setEnableBillingFn = (state: boolean) => {
    setEnableBilling(state);
  }

  // another community (261024-ca13): nothing of the previous one stays open
  useEffect(() => {
    setDetailOpen(false)
    setShowAddMeterPane(false)
  }, [tenant.tenant?.toUpperCase()]);

  useEffect(() => {
    // not while the application (re)loads EEG, tariffs and members (tenant switch, refresh): the store can then
    // mix the old members with the new tenant; the load ends by setting the period, which fetches once
    if (activePeriod && allParticipants && !isFechting) {
      fetchEnergyReport()
    }
  }, [reportKey, isFechting]);

  // useEffect(() => {
  //   fetchEnergyReport(activeParticipants)
  // }, [activeParticipants]);

  const value = {
    participants: activeParticipants,
    allParticipants: allParticipants,
    activePeriod: activePeriod,
    selectedRate: undefined,
    detailsPageOpen: detailOpen,
    createNewRate: useCallback<()=>void>(newRateFn, []),
    selectRate: selectRateFn,
    showDetailsPage: showDetailPageFn,
    closeDetailPage: closeDetailPageFn,
    billingEnabled: enableBilling,
    setBillingEnabled: setEnableBillingFn,
    showAddMeterPane: showAddMeterPane,
    setShowAddMeterPane: setShowAddMeterPane,
    unsaved: unsaved,
    setUnsaved: setUnsaved,
    reloadEnergyReport: () => fetchEnergyReport(),
  } as ParicipantState

  const fetchEnergyReport = () => {
    if (reportRequest) {
      dispatch(fetchEnergyReportV2({tenant: tenant, ...reportRequest}))
    } else if (activeParticipants.length == 0) {
      dispatch(clearEnergyState())
    }
  }

  // const fetchEnergyReportCallback = useCallback(() => {
  //   fetchEnergyReport(activeParticipants)
  // }, [tenant, activePeriod, activeParticipants])
  //
  // useEffect(() => {
  //   fetchEnergyReportCallback()
  // },[fetchEnergyReportCallback])

  return (
    <ParticipantContext.Provider value={value}>
      {children}
    </ParticipantContext.Provider>
  )
}

export default ParticipantProvider;


// export const useParticipants = () => {
//   const {participants} = useContext(ParticipantContext)
//   return participants;
// }

export const useAllParticipants = () => {
  const {allParticipants} = useContext(ParticipantContext)
  return allParticipants;
}

// export const useRates = () => {
//   const {rates} = useContext(ParticipantContext);
//   return rates;
// }

// "addMeter": the "add metering point" pane; "details": the member or metering point details (failed or invalid
// changes); "tariff": the tariff editor
export type UnsavedSource = "addMeter" | "details" | "tariff"

// Asks before an action replaces forms of the given sources while one holds unsaved input (platform#228 step 4).
export const useLeaveUnsaved = (sources: UnsavedSource[]) => {
  const {unsaved} = useContext(ParticipantContext)
  const confirmDiscard = useConfirmDiscard()
  return (action: () => void, onCancel?: () => void) =>
    confirmDiscard(sources.some(s => unsaved[s]), action, onCancel)
}

// A form reports its unsaved input under its source while it is shown.
export const useReportUnsaved = (source: UnsavedSource, dirty: boolean) => {
  const {setUnsaved} = useContext(ParticipantContext)
  useReportDirty(dirty, d => setUnsaved(source, d))
}
