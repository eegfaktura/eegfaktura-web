import React, {FC} from "react";
import {IonButton, useIonToast} from "@ionic/react";
import {Api} from "../../service";
import {EdaProcess, Eeg} from "../../models/eeg.model";
import {useLocale} from "../../store/hook/useLocale";
import ProcessHeaderComponent from "./ProcessHeader.component";
import {activeMetersSelector} from "../../store/participant";
import {useAppSelector} from "../../store";
import {BasicSelectComponent, SelectOptions} from "../form/BasicSelect.component";
import {JoinStrings} from "../../util/Helper.util";
import {useForm} from "react-hook-form";
import {useConfirm} from "../core/useConfirm";
import {podListSummary} from "./ProcessConfirm.functions";
import {hasMultipleGridOperators} from "../../util/Area.util";


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
  const confirm = useConfirm()

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
  // the community's grid operator as the metering points carry it: trimmed, upper case; blank is none
  const communityOperator = eeg.gridOperator?.trim().toUpperCase() || undefined
  const meters = useAppSelector(activeMetersSelector)

  const processValues = {
    operatorId: communityOperator,
    rcNumber: eeg.rcNumber,
  }

  const {
    handleSubmit, reset,
    control, watch,
    setValue, formState
  } = useForm<ProcessValues>({defaultValues: processValues})

  const request = async (data: ProcessValues) => {
    if (data.operatorId) {
      // goes to the grid operator: ask first
      if (!await confirm(edaProcess.name, podListSummary(data.operatorId), "Anfordern")) return
      // returned: the submit stays disabled until the request is answered
      return Api.eegService.syncMeteringPointList(eeg.rcNumber, data.operatorId)
        .then(() => infoToast(errorT("process.podList_ok")))
        .catch((e) => {
          console.log(e)
          errorToast(errorT("process.podList_error"))
        })
    }
  }

  // the grid operators of the metering points and the community's own one, which is also the preselected value
  // (a community without metering points can request its first list there, eegfaktura-dev#56 #8)
  const getNetOperatorIds = () => {
    const operators: Record<string, string> = {}
    if (communityOperator) operators[communityOperator] = JoinStrings(" - ", "", communityOperator, eeg.operatorName ?? "")
    meters.filter(m => m.gridOperatorId).forEach(m => operators[m.gridOperatorId] = JoinStrings(" - ", "", m.gridOperatorId, m.gridOperatorName))
    return Object.entries(operators).map(([k, v]) => ({value: k, label: v} as SelectOptions))
  }
  const multipleOperators = hasMultipleGridOperators(eeg.area)
  const operatorOptions = multipleOperators ? getNetOperatorIds() : []
  const noOperator = multipleOperators ? operatorOptions.length === 0 : !communityOperator

  return (
    <div>
      <ProcessHeaderComponent name={edaProcess.name}/>
      <p>{t("process.podList.info")}</p>
      {noOperator && <p>{t("process.podList.noOperator")}</p>}
      {/* several grid operators possible (BEG, P2P, EVA): the list is requested per grid operator (platform#229) */}
      {multipleOperators && !noOperator &&
          <div style={{paddingBottom: "15px"}}>
              <BasicSelectComponent control={control} name={"operatorId"}
                                    options={operatorOptions} label={t("grid-operator.id")} multiple={false}
                                    rules={{
                                      required: true
                                    }} defaultValue={processValues.operatorId}/>
          </div>
      }
      <IonButton onClick={handleSubmit(request)} disabled={noOperator || !formState.isValid || formState.isSubmitting}>
        {t("process.podList.submit")}
      </IonButton>
    </div>
  )
}

export default ProcessPodListComponent