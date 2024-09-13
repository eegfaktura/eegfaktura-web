import {createContext, FC, ReactNode, useCallback, useContext, useEffect, useState} from "react";
import {EegParticipant} from "../../models/members.model";
import {useAppDispatch, useAppSelector} from "../index";
import {
  allParticipantsSelector,
  selectParticipant
} from "../participant";
import {EegTariff, RateTypeEnum} from "../../models/eeg.model";
import {clearEnergyState, fetchEnergyReportV2, selectedPeriodSelector} from "../energy";
import {MeterReport, ParticipantReport, SelectedPeriod} from "../../models/energy.model";
import {useTenant} from "./Eeg.provider";
import {filterActiveParticipantAndMeter} from "../../util/FilterHelper.unit";
import {getPeriodDates} from "../../util/FilterHelper";


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
  checkedParticipant: Record<string, boolean>
  setCheckedParticipant: (participantId: string, checked: boolean) => void
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
  checkedParticipant: {},
  setCheckedParticipant: (participantId: string, checked: boolean) => {}
}

export const ParticipantContext = createContext(initialState)

const ParticipantProvider: FC<{children: ReactNode}> = ({children}) => {

  const dispatch = useAppDispatch();
  const tenant = useTenant()
  const activePeriod = useAppSelector(selectedPeriodSelector)
  // const participants = useAppSelector(activeParticipantsSelector1)
  const allParticipants = useAppSelector(allParticipantsSelector)

  const [state, setState] = useState<ParicipantState>(initialState);
  const [detailOpen, setDetailOpen] = useState<boolean>(false);
  const [enableBilling, setEnableBilling] = useState<boolean>(false)
  const [showAddMeterPane, setShowAddMeterPane] = useState<boolean>(false)
  const [checkedParticipants, setCheckedParticipants] = useState<Record<string, boolean>>({})
  const [activeParticipants, setActiveParticipants] = useState<EegParticipant[]>([])

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
    // setState({
    //   ...state,
    //   // selectedParticipant: participant
    // });
    setDetailOpen(true);
  }

  const closeDetailPageFn = (state: boolean) => {
    setDetailOpen(state);
  }

  const setEnableBillingFn = (state: boolean) => {
    setEnableBilling(state);
    // if (!state) {
    //   setCheckedParticipants({})
    // }
  }

  useEffect(() => {
    const[start, end] = getPeriodDates(activePeriod)
    setActiveParticipants(filterActiveParticipantAndMeter(allParticipants, start, end))
  }, [allParticipants, activePeriod]);

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
    checkedParticipant: checkedParticipants,
    showAddMeterPane: showAddMeterPane,
    setShowAddMeterPane: setShowAddMeterPane,
    setCheckedParticipant: (participantId: string, checked: boolean) => { setCheckedParticipants((s) => {
      const newS = {...s}
      if (!checked) {
        delete newS[participantId];
      } else {
        newS[participantId] = checked
      }
      return newS;
      }
    )}
  } as ParicipantState

  // useEffect(() => {
  //   Promise.all([
  //     dispatch(fetchParticipantModel({tenant: "RC130100"}))
  //     // dispatch(fetchRatesModel({tenant: "RC130100"}))
  //     ]
  //   )
  // }, [])

  // useEffect(() => {
  //   if (activePeriod) {
  //     dispatch(fetchParticipantModel({tenant: tenant, period: activePeriod}))
  //   }
  // }, [activePeriod]);

  const fetchEnergyReport = useCallback(() => {
    if (tenant && activePeriod && activeParticipants && activeParticipants.length > 0) {
      const participantsReport = activeParticipants.map(p => {
        return {
          participantId: p.id,
          meters: p.meters.filter(m => !!m.participantState).map(m => {
            return {meterId: m.meteringPoint, meterDir: m.direction,
              from: new Date(m.participantState.activeSince).getTime(),
              until: new Date(m.participantState.inactiveSince).getTime()} as MeterReport})
        } as ParticipantReport
      })
      dispatch(fetchEnergyReportV2({tenant: tenant, year: activePeriod.year, segment: activePeriod.segment, type: activePeriod.type, participants: participantsReport.filter(p => p.meters.length > 0)}))
    } else if (activeParticipants && activeParticipants.length == 0) {
      dispatch(clearEnergyState())
    }
  }, [activePeriod, activeParticipants])

  useEffect(() => {
    fetchEnergyReport()
  },[fetchEnergyReport])

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