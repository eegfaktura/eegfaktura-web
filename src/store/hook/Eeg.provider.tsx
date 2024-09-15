import React, {createContext, FC, ReactNode, useCallback, useContext, useEffect, useState} from "react";
import {useAppDispatch, useAppSelector} from "../index";
import {clearErrorState, eegSelector, fetchEegModel, selectError, selectTenant} from "../eeg";
import {useRoles, useTenants} from "./AuthProvider";
import {fetchRatesModel} from "../rate";
import {fetchParticipantModel} from "../participant";
import {IonSpinner, useIonToast} from "@ionic/react";
import {ActiveTenant, Eeg} from "../../models/eeg.model";
import {SelectedPeriod} from "../../models/energy.model";
import {setSelectedPeriod} from "../energy";
import {Api} from "../../service";
import {useSelector} from "react-redux";
import {useAuth} from "react-oidc-context";
import {useGetUserQuery, useLazyGetUserQuery, userApi} from "../user/userApi";


export interface EegState {
  eeg?: Eeg
  tenant?: string
  getTenants: () => {tenant: string; name: string;}[] | undefined
  isAdmin: () => boolean
  isOwner: () => boolean
  isUser: () => boolean
  setTenant: (tenant: string) => void
  refresh: () => void
}

const initialState: EegState = {
  getTenants: () => [],
  isAdmin: () => false,
  isOwner: () => false,
  isUser: () => false,
  setTenant: (tenant: string) => {},
  refresh: () => {},
}


export const EegContext = createContext(initialState)

export const EegProvider: FC<{ children: ReactNode }> = ({children}) => {

  const dispatch = useAppDispatch();
  const eeg = useAppSelector(eegSelector);
  const hasError = useSelector(selectError)
  const tenants = useTenants();
  const roles = useRoles();
  const auth = useAuth();
  const [toaster] = useIonToast()

  const [getUser] = useLazyGetUserQuery()
  const selectUsersResult = userApi.endpoints.getUser.select()
  const userData = useSelector(selectUsersResult)

  const [activeTenant, setActiveTenant] = useState<string>()

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
    const storedTenant = localStorage.getItem("tenant")
    if (storedTenant) {
      activateTenant(storedTenant)
    } else {
      if (tenants && tenants.length > 0) {
        activateTenant(tenants[0])
      } else {
        console.error("Can not find an active tenant")
      }
    }
  }, [tenants])

  useEffect(() => {
    if (eeg) {
      getCurrentPeroid(eeg)
        .then(p => dispatch(setSelectedPeriod(p)))
    }
  }, [eeg]);

  const getCurrentPeroid = async (eeg: Eeg) => {
    const currentDate = new Date(Date.now())
    let period = "Y"
    let segment = 0
    switch (eeg.settlementInterval) {
      case "MONTHLY":
        period = "YM"
        segment = currentDate.getMonth() + 1
        break;
      case "BIANNUAL":
        period = "YH"
        segment = (currentDate.getMonth() + 1 < 7 ? 1 : 2)
        break;
      case "QUARTER":
        const m = currentDate.getMonth() + 1
        period = "YQ"
        segment = (m < 4 ? 1 : m < 7 ? 2 : m < 10 ? 3 : 4)
        break
    }
    return {type: period, year: currentDate.getFullYear(), segment: segment} as SelectedPeriod
  }

  const initApplication = useCallback(async () => {
    if (activeTenant && activeTenant.length > 0) {
      // await auth.signinRedirect()
      Promise.all([
        dispatch(fetchEegModel({tenant: activeTenant})),
        dispatch(fetchRatesModel({tenant: activeTenant})),
        dispatch(fetchParticipantModel({tenant: activeTenant})),
      ])
      getUser()
    }
  }, [activeTenant])

  const _setTenant = (tenant: string) => {
    setActiveTenant(tenant)
    localStorage.setItem("tenant", tenant.toUpperCase())
    dispatch(selectTenant(tenant))
  }

  const value = {
    eeg: eeg,
    tenant: activeTenant,
    getTenants: () => userData.data,
    isAdmin: () => roles ? roles.findIndex(r => r === "/EEG_ADMIN") >= 0 : false,
    isOwner: () => roles ? roles.findIndex(r => r === "/EEG_OWNER") >= 0 : false,
    isUser: () => roles ? roles.findIndex(r => r === "/EEG_USER") >= 0 : false,
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

export const useEegAllocation = () => {
  const {eeg} = useContext(EegContext)
  return eeg?.allocationMode
}

export const useGridOperator = () => {
  const {eeg} = useContext(EegContext)
  return {gridOperatorId: eeg?.gridOperator, gridOperatorName: eeg?.operatorName}
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