import React, {FC} from "react";
import {IonButton, useIonToast} from "@ionic/react";
import {Api} from "../../service";
import {EdaProcess, Eeg} from "../../models/eeg.model";
import {useLocale} from "../../store/hook/useLocale";
import ProcessHeaderComponent from "./ProcessHeader.component";
import {activeMetersSelector} from "../../store/participant";
import {store} from "../../store";
import {BasicSelectComponent, SelectOptions} from "../form/BasicSelect.component";
import {JoinStrings} from "../../util/Helper.util";
import {useForm} from "react-hook-form";


interface ProcessValues {
  operatorId: string | undefined
  rcNumber: string | undefined
}

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
  const processValues = {
    operatorId: eeg.gridOperator,
    rcNumber: eeg.rcNumber,
  }

  const {
    handleSubmit, reset,
    control, watch,
    setValue, formState
  } = useForm<ProcessValues>({defaultValues: processValues})

  const request = (data: ProcessValues) => {
    if (data.operatorId) {
      Api.eegService.syncMeteringPointList(eeg.rcNumber, data.operatorId)
        .then(() => infoToast(errorT("process.podList_ok")))
        .catch((e) => {
          console.log(e)
          errorToast(errorT("process.podList_error"))
        })
    }
  }

  const getNetOperatorIds = () => {
    const meters = activeMetersSelector(store.getState())
    const operators: Record<string, string> = {}
    meters.filter(m => m.gridOperatorId).forEach(m => operators[m.gridOperatorId] = JoinStrings(" - ", "", m.gridOperatorId, m.gridOperatorName))
    return Object.entries(operators).map(([k, v]) => ({value: k, label: v} as SelectOptions))
  }

  return (
    <div>
      <ProcessHeaderComponent name={edaProcess.name}/>
      <p>{t("process.podList.info")}</p>
      {eeg.area === 'BEG' &&
          <div style={{paddingBottom: "15px"}}>
              <BasicSelectComponent control={control} name={"operatorId"}
                                    options={getNetOperatorIds()} label={t("gridOperator-id")} multiple={false}
                                    rules={{
                                      required: true
                                    }} defaultValue={processValues.operatorId}/>
          </div>
      }
      <IonButton onClick={handleSubmit(request)} disabled={!formState.isValid}>
        {t("process.podList.submit")}
      </IonButton>
    </div>
  )
}

export default ProcessPodListComponent