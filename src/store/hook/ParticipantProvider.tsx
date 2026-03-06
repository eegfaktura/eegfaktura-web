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
import {isEEGFetching, useTenant} from "./Eeg.provider";
import {filterActiveParticipantAndMeter} from "../../util/FilterHelper.unit";
import {getPeriodDates} from "../../util/FilterHelper";
import participants from "../../pages/Participants";


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

  const isFechting = isEEGFetching()

  const [state, setState] = useState<ParicipantState>(initialState);
  const [detailOpen, setDetailOpen] = useState<boolean>(false);
  const [enableBilling, setEnableBilling] = useState<boolean>(false)
  const [showAddMeterPane, setShowAddMeterPane] = useState<boolean>(false)
  const [checkedParticipants, setCheckedParticipants] = useState<Record<string, boolean>>({})
  const [activeParticipants, setActiveParticipants] = useState<EegParticipant[]>([])

// Helper function for deep equality check (especially for objects/arrays)
// This is a common utility you might have or need to implement
// A simple recursive check for JSON-like objects (primitives, arrays, plain objects)
  function deepEqual(obj1: any, obj2: any): boolean {
    if (obj1 === obj2) {
      return true; // Handles primitives and same object reference
    }

    if (typeof obj1 !== 'object' || obj1 === null || typeof obj2 !== 'object' || obj2 === null) {
      return false; // Not objects or one is null
    }

    const keys1 = Object.keys(obj1);
    const keys2 = Object.keys(obj2);

    if (keys1.length !== keys2.length) {
      return false; // Different number of properties
    }

    for (const key of keys1) {
      if (!keys2.includes(key) || !deepEqual(obj1[key], obj2[key])) {
        return false; // Key not found or values are not deep equal
      }
    }

    return true;
  }

  /**
   * Checks if two arrays are comprised of identical objects based on an ID,
   * performing a deep comparison of objects with matching IDs.
   *
   * @param arr1 The first array of objects.
   * @param arr2 The second array of objects.
   * @param idKey The key in the objects that represents the unique ID. Defaults to 'id'.
   * @param compareKeys The object keys have to be equal
   * @returns True if the arrays are comprised of identical objects by ID and content,
   * False otherwise.
   */
  function objectsSimilar<T extends Record<string, any>>(
    arr1: T[],
    arr2: T[],
    idKey: keyof T = 'id' as keyof T, // Default to 'id', casting for flexibility
    compareKeys: string[]
  ): boolean {
    if (arr1.length !== arr2.length) {
      return false;
    }

    // Create Maps for faster lookup by ID
    const map1 = new Map<any, T>();
    for (const obj of arr1) {
      map1.set(obj[idKey], obj);
    }

    const map2 = new Map<any, T>();
    for (const obj of arr2) {
      map2.set(obj[idKey], obj);
    }

    // Check if the sets of IDs are identical (same keys in maps)
    if (map1.size !== map2.size) {
      return false;
    }

    for (const id of map1.keys()) {
      if (!map2.has(id)) {
        return false; // ID from arr1 not found in arr2
      }

      const objA = map1.get(id);
      const objB = map2.get(id);

      for (const a of compareKeys) {
        if (!objA || !objB || objA[a] !== objB[a]) {
          return false;
        }
      }
    }

    return true;
  }

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

  useEffect(() => {
    if (activePeriod && allParticipants) {
      const [start, end] = getPeriodDates(activePeriod)
      const _aps = filterActiveParticipantAndMeter(allParticipants, start, end)
      // const identical = objectsSimilar(activeParticipants, _aps, "id", ["participantSince"])

      setActiveParticipants(prevState => _aps.map(s => {
        // I have no glue why this code is included
        // const e = prevState.find(n => n.id === s.id)
        // if (e) {
        //   return e
        // }
        return s
      }))

      // if (!identical) {
        fetchEnergyReport(_aps)
      // }
    }
  }, [allParticipants, activePeriod]);

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

  const fetchEnergyReport = (aps: EegParticipant[]) => {
    if (tenant && activePeriod && aps && aps.length > 0) {
      const participantsReport = aps.map(p => {
        return {
          participantId: p.id,
          meters: p.meters.filter(m => !!m.participantState).map(m => {
            return {meterId: m.meteringPoint, meterDir: m.direction,
              from: new Date(m.participantState.activeSince).getTime(),
              until: new Date(m.participantState.inactiveSince).getTime()} as MeterReport})
        } as ParticipantReport
      })
      dispatch(fetchEnergyReportV2({tenant: tenant, year: activePeriod.year, segment: activePeriod.segment, type: activePeriod.type, participants: participantsReport.filter(p => p.meters.length > 0)}))
    } else if (!aps || aps.length == 0) {
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