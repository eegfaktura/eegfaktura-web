import React, {createContext, FC, ReactNode, useCallback, useContext, useEffect, useRef, useState} from "react";
import {store, useAppDispatch, useAppSelector} from "../index";
import {clearErrorState, eegSelector, fetchEegModel, selectError, selectTenant} from "../eeg";
import {useGroups, useRoles1, useTenants} from "./AuthProvider";
import {clearRates, fetchRatesModel} from "../rate";
import {fetchParticipantModel} from "../participant";
import {IonSpinner, useIonToast} from "@ionic/react";
import {ActiveTenant, Eeg} from "../../models/eeg.model";
import {selectedPeriodSelector, setSelectedPeriod} from "../energy";
import {Api} from "../../service";
import {firstOpenPeriod} from "../../util/SettlementInterval.util";
import {useSelector} from "react-redux";
import {useAuth} from "react-oidc-context";
import {useGetUserQuery, useLazyGetUserQuery, userApi} from "../user/userApi";
import {isPreviewOnly} from "../../util/Area.util";


export interface EegState {
  eeg?: Eeg
  tenant?: string
  isFetching: boolean
  getTenants: () => {tenant: string; name: string;}[] | undefined
  isAdmin: () => boolean
  isOwner: () => boolean
  isUser: () => boolean
  setTenant: (tenant: string) => void
  refresh: () => void
}

const initialState: EegState = {
  isFetching: false,
  getTenants: () => [],
  isAdmin: () => false,
  isOwner: () => false,
  isUser: () => false,
  setTenant: (tenant: string) => {},
  refresh: () => {},
}


export const EegContext = createContext(initialState)

// the period preselected for the community's settlement interval: today's (after an interval change the EEG page
// selects the first open period instead, eegfaktura-dev#54 #7)
export const getCurrentPeriod = async (eeg: Eeg | undefined) => firstOpenPeriod(eeg?.settlementInterval, null)

export const EegProvider: FC<{ children: ReactNode }> = ({children}) => {

  const dispatch = useAppDispatch();
  const eeg = useAppSelector(eegSelector);
  const hasError = useSelector(selectError)
  const tenants = useTenants();
  const groups = useGroups();
  const roles = useRoles1()

  const auth = useAuth();
  const [toaster] = useIonToast()

  const [getUser] = useLazyGetUserQuery()
  const selectUsersResult = userApi.endpoints.getUser.select()
  const userData = useSelector(selectUsersResult)

  const [activeTenant, setActiveTenant] = useState<string>()
  const [fetching, setFetching] = useState<boolean>(false)
  // only the load started last ends the loading state: an earlier one (previous community, A→B→A, a second
  // refresh) must not end it or set the period
  const loadSeq = useRef(0)
  const loadedTenant = useRef<string>()

  const errorToast = (message: string | undefined) => {
    toaster({
      message: message,
      duration: 13500,
      position: "bottom",
      color: "danger",
      buttons: [{text: "OK"}],
      onDidDismiss: (e) => dispatch(clearErrorState())
    });
  };

  const activateTenant = (tenant: string) => {
    dispatch(selectTenant(tenant))
    setActiveTenant(tenant)
    localStorage.setItem("tenant", tenant.toUpperCase())
  }

  const isTenantAllowed = (tenant: string, tenants: string[]): boolean => {
    if (roles?.includes("superuser")) {
      return true
    } else if (tenants.filter(t => !!t).map(t => t.toUpperCase()).includes(tenant.toUpperCase())) {
      return true
    }
    return false
  }

  // const updateTenants = useCallback((tenants: string[]) => {
  //   const storedTenant = localStorage.getItem("tenant")
  //   if (storedTenant) {
  //     if (!isTenantAllowed(storedTenant, tenants)) {
  //       activateTenant(tenants[0])
  //     } else {
  //       activateTenant(storedTenant)
  //     }
  //   } else {
  //     if (tenants && tenants.length > 0) {
  //       activateTenant(tenants[0])
  //     } else {
  //       console.error("Can not find an active tenant")
  //     }
  //   }
  // }, [])

  useEffect(() => {
    if (hasError && hasError.hasError) {
      errorToast(hasError.error?.message)
    }
  }, [hasError]);

  useEffect(() => {
    (async () => {
      if (activeTenant) {
        await initApplication()
      }
    })()
  }, [activeTenant])

  useEffect(() => {
    if (tenants.length > 0) {
      // updateTenants(tenants)
      const storedTenant = localStorage.getItem("tenant")
      if (storedTenant) {
        if (!isTenantAllowed(storedTenant, tenants)) {
          activateTenant(tenants[0])
        } else {
          activateTenant(storedTenant)
        }
      } else {
        if (tenants && tenants.length > 0) {
          activateTenant(tenants[0])
        } else {
          console.error("Can not find an active tenant")
        }
      }
    }
  }, [tenants])

  // useEffect(() => {
  //   if (eeg) {
  //     getCurrentPeroid(eeg)
  //       .then(p => {
  //         dispatch(setSelectedPeriod(p))
  //       })
  //   }
  // }, [eeg]);

  const initApplication = useCallback(async () => {
    setFetching(true)
    if (activeTenant && activeTenant.length > 0) {
      const seq = ++loadSeq.current;
      // the tariffs load after the EEG now: another community's tariffs must not show meanwhile (a refresh of the same
      // community keeps its list until the new one is there)
      if (loadedTenant.current !== activeTenant) dispatch(clearRates())
      loadedTenant.current = activeTenant;
      (await Promise.all([
        getUser(),
        // tariffs after the EEG, only for the load started last: a late answer of the previous community asks nothing
        dispatch(fetchEegModel({tenant: activeTenant})).then(() =>
          seq === loadSeq.current ? dispatch(fetchRatesModel({tenant: activeTenant})) : undefined),
        dispatch(fetchParticipantModel({tenant: activeTenant})),
      ]).then(() => {
        const eeg = eegSelector(store.getState())
        return getCurrentPeriod(eeg)
      }).then((a) => {
        if (seq !== loadSeq.current) return
        dispatch(setSelectedPeriod(a))
        setFetching(false)
      }))
    }
  }, [activeTenant])

  const value = {
    eeg: eeg,
    tenant: activeTenant,
    isFetching: fetching,
    getTenants: () => userData.data,
    isAdmin: () => (groups ? groups.findIndex(r => r === "/EEG_ADMIN") >= 0 : false),
    isOwner: () => groups ? groups.findIndex(r => r === "/EEG_OWNER") >= 0 : false,
    isUser: () => groups ? groups.findIndex(r => r === "/EEG_USER") >= 0 : false,
    setTenant: (tenant: string) => activateTenant(tenant),
    refresh: async () => await initApplication()
  } as EegState

  return (
    <EegContext.Provider value={value}>
      {children}
    </EegContext.Provider>
  )
}

export const useAccessGroups = () => {
  const {isAdmin, isUser, isOwner} = useContext(EegContext);
  return {isAdmin, isUser, isOwner};
}

export const useRefresh = () => {
  const {refresh} = useContext(EegContext);
  return {refresh};
}

export const useOnlineState = () => {
  const context = useContext(EegContext)
  return context.eeg ? context.eeg.online : false
}

export const useEegArea = () => {
  const {eeg} = useContext(EegContext)
  return eeg?.area
}

// a boolean, so it can be a hook dependency (platform#255)
export const usePreviewOnly = () => {
  const {eeg} = useContext(EegContext)
  return isPreviewOnly(eeg?.area)
}

export const useEegAllocation = () => {
  const {eeg} = useContext(EegContext)
  return eeg?.allocationMode
}

export const useTenantSwitch = () => {
  const {setTenant} = useContext(EegContext)
  return setTenant
}

export const useTenant = () => {
  const c = useContext(EegContext)
  return {tenant: c.tenant, ecId: c.eeg?.communityId, rcNr: c.eeg?.rcNumber} as ActiveTenant
}

export const useTenantDescription = () => {
  const c = useContext(EegContext)
  return c.getTenants()
}

export const isEEGFetching = () => {
  const c = useContext(EegContext)
  return c.isFetching
}