import React, {FC} from "react";
import {IonButton, IonSpinner} from "@ionic/react";
import {useAppSelector} from "../store";
import {eegLoadErrorSelector} from "../store/eeg";
import {useTenants} from "../store/hook/AuthProvider";
import {useRefresh} from "../store/hook/Eeg.provider";
import {useLocale} from "../store/hook/useLocale";

// What a page shows while its EEG is not there (261024-ca11): a spinner while it loads, the error with
// "Erneut versuchen" after a failed load, and the "no community" text only when the account has none.
const EegLoadStateComponent: FC = () => {
  const loadError = useAppSelector(eegLoadErrorSelector)
  const tenants = useTenants()
  const {refresh} = useRefresh()
  const {t} = useLocale("error")

  if (loadError) {
    return (
      <div className="full-screen-center" style={{flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "16px"}}>
        <div>{loadError}</div>
        <IonButton onClick={() => refresh()}>Erneut versuchen</IonButton>
      </div>
    )
  }
  if (tenants.length > 0) {
    return (
      <div className="full-screen-center">
        <IonSpinner style={{margin: "auto", height: "48px", width: "48px"}}/>
      </div>
    )
  }
  return (
    <div className="full-screen-center">
      <div>{t("intern.empty_eeg")}</div>
    </div>
  )
}

export default EegLoadStateComponent
