import React, {FC} from "react";
import {IonButton, useIonToast} from "@ionic/react";
import {Api} from "../../service";
import {EdaProcess, Eeg} from "../../models/eeg.model";
import {useLocale} from "../../store/hook/useLocale";
import ProcessHeaderComponent from "./ProcessHeader.component";


interface ProcessPodListComponentProps {
  eeg: Eeg
  edaProcess: EdaProcess
}

const ProcessPodListComponent: FC<ProcessPodListComponentProps> = ({eeg, edaProcess}) => {
  const {t} = useLocale("common")
  const {t: errorT} = useLocale("error")

  const [toaster] = useIonToast();

  const infoToast = (message: string) => {
    toaster({
      message: message,
      duration: 3500,
      position: "bottom",
    });
  };

  const errorToast = (message: string) => {
    toaster({
      message: message,
      duration: 5500,
      position: "bottom",
      color: "danger",
    });
  };

  const request = () => {
    Api.eegService.syncMeteringPointList(eeg.rcNumber)
      .then(() => infoToast(errorT("process.podList_ok")))
      .catch(() => errorToast(errorT("process.podList_error")))
  }

  return (
    <div>
      <ProcessHeaderComponent name={edaProcess.name} />
      <p>{t("process.podList.info")}</p>
      <IonButton onClick={() => request()}>
        {t("process.podList.submit")}
      </IonButton>
    </div>
  )
}

export default ProcessPodListComponent