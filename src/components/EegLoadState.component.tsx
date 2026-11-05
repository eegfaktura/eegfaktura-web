import React, {FC, ReactNode} from "react";
import {IonButton, IonContent, IonSpinner} from "@ionic/react";
import {useAppSelector} from "../store";
import {eegLoadErrorSelector} from "../store/eeg";
import {useTenants} from "../store/hook/AuthProvider";
import {useRefresh} from "../store/hook/Eeg.provider";
import {useLocale} from "../store/hook/useLocale";
import MenuHeaderComponent from "./core/MenuHeader.component";

// The whole content of a page, without an IonPage of its own: the page renders it inside its IonPage. A page that
// swapped its IonPage for another one while hidden in the outlet took over the view of the shown URL (platform#237).
const Page: FC<{children: ReactNode}> = ({children}) => (
  <>
    <MenuHeaderComponent/>
    <IonContent fullscreen color="eeg">{children}</IonContent>
  </>
)

// What a page shows while its EEG is not there (261024-ca11): a spinner while it loads, the error with
// "Erneut versuchen" after a failed load, and the "no community" text only when the account has none.
const EegLoadStateComponent: FC = () => {
  const loadError = useAppSelector(eegLoadErrorSelector)
  const tenants = useTenants()
  const {refresh} = useRefresh()
  const {t} = useLocale("error")

  if (loadError) {
    return (
      <Page>
        <div className="full-screen-center" style={{flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "16px"}}>
          <div>{loadError}</div>
          <IonButton onClick={() => refresh()}>Erneut versuchen</IonButton>
        </div>
      </Page>
    )
  }
  if (tenants.length > 0) {
    return (
      <Page>
        <div className="full-screen-center">
          <IonSpinner style={{margin: "auto", height: "48px", width: "48px"}}/>
        </div>
      </Page>
    )
  }
  return (
    <Page>
      <div className="full-screen-center">
        <div>{t("intern.empty_eeg")}</div>
      </div>
    </Page>
  )
}

export default EegLoadStateComponent
