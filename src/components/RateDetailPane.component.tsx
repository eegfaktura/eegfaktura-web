import React, {FC} from "react";
import {EegTariff} from "../models/eeg.model";
import {
  IonButton,
  IonContent,
  IonFooter,
  IonIcon,
  IonItem,
  IonLabel,
  IonToolbar,
  useIonAlert,
  useIonToast
} from "@ionic/react";
import {trashBin} from "ionicons/icons";
import RateComponent from "./Rate.component";
import {useAppDispatch, useAppSelector} from "../store";
import {archiveRate, ratesSelector, selectedRateSelector, selectRate} from "../store/rate";
import {Api} from "../service";
import {hasJoiningFee, joiningFeeVatUnusual, membersNotYetEnergyBilled} from "../util/JoiningFee.util";
import {allParticipantsSelector} from "../store/participant";
import {FormProvider, useForm} from "react-hook-form";
import {useTenant} from "../store/hook/Eeg.provider";
import {useConfirm} from "./core/useConfirm";
import {tariffInUseMessage} from "./RateDetailPane.functions";
import {useLocale} from "../store/hook/useLocale";
import {useConfirmDiscard, useReportDirty} from "./core/UnsavedChangesGuard.component";

// the error key handleErrors builds from the backend's answer {code: 4002, error: "Tariff is currently used"}
const TARIFF_IN_USE = "E_4002_Tariff is currently used"

interface RateDetailPaneComponentProps {
  onSubmit: (data: EegTariff) => void;
  submitId: string;
  mode?: 'NEW';
  // reports unsaved input, so the page can ask before another tariff replaces the form (platform#228 step 4)
  onDirtyChange?: (dirty: boolean) => void;
}

const RateDetailPaneComponent: FC<RateDetailPaneComponentProps> = ({onSubmit, submitId, mode, onDirtyChange}) => {
  const dispatcher = useAppDispatch();
  const selectedTariff = useAppSelector(selectedRateSelector)
  const {tenant} = useTenant()

  const [presentAlert] = useIonAlert();
  const [showToast] = useIonToast();
  const confirm = useConfirm();
  const {t: errorT} = useLocale("error");
  const {t} = useLocale("common");
  const rates = useAppSelector(ratesSelector)

  const formMethods = useForm<EegTariff>({defaultValues: selectedTariff, values: selectedTariff, mode: 'all'});
  const isDirty = formMethods.formState.isDirty
  const confirmDiscard = useConfirmDiscard()

  useReportDirty(isDirty, onDirtyChange)

  const getMode = (): (undefined | 'NEW') => {
    return (selectedTariff && selectedTariff.id.length === 0) ? 'NEW' : undefined
  }

  const participants = useAppSelector(allParticipantsSelector)

  const archiveTariff = () => {
    if (!selectedTariff) return
    const inUse = tariffInUseMessage(participants, selectedTariff.id)
    if (inUse) {
      presentAlert(
        {
          header: 'Tarif löschen nicht möglich',
          message: inUse,
          buttons: [
            {text: 'Abbrechen', role: 'cancel'},
          ]
        }
      )
    } else {
      const rate = selectedTariff
      confirm("Tarif löschen", `Soll der Tarif „${rate.name}“ gelöscht werden?`, "Löschen", () =>
      dispatcher(archiveRate({rate, tenant: tenant}))
        .unwrap()
        .catch((e) => {
            // backend code 4002 (backend#106): the tariff is still used, handleErrors translated it already
            const inUse = errorT(TARIFF_IN_USE)
            if (e?.message === inUse) {
              showToast({
                message: inUse,
                duration: 4500,
                color: "warning"
              })
            } else {
              showToast({
                message: 'Tarif konnte nicht gelöscht werden. Bitte kontaktieren Sie Ihren Administrator. Grund: ' + e.message,
                duration: 4500,
                color: "danger"
              })
            }
          }
        ))
    }
  }

  // platform#217: saving a joining fee above 0 warns about an unusual VAT rate and about the active members that get
  // the fee with their next billing (billing's joiningFeeState; unknown when billing cannot be reached). Saving stays
  // possible in every case.
  const onSave = async (data: EegTariff) => {
    // only when the fee is new or changed: renaming a tariff with a fee does not ask again
    const before = selectedTariff
    const feeChanged = !before || !before.id || Number(before.joiningFee ?? 0) !== Number(data.joiningFee ?? 0)
      || !!before.joiningFeeUseVat !== !!data.joiningFeeUseVat
      || Number(before.joiningFeeVatInPercent ?? 0) !== Number(data.joiningFeeVatInPercent ?? 0)
    if (!hasJoiningFee(data) || !feeChanged) {
      onSubmit(data)
      return
    }
    const warnings: string[] = []
    if (joiningFeeVatUnusual(data, rates)) {
      warnings.push(t("joiningFee.warn_vat_unusual"))
    }
    // a new tariff has no members yet
    if (data.id) {
      const state = await Api.eegService.fetchJoiningFeeState(tenant).catch(() => undefined)
      if (state === undefined) {
        warnings.push(t("joiningFee.warn_rollout_unknown"))
      } else {
        const count = membersNotYetEnergyBilled(participants, data.id, state)
        if (count > 0) warnings.push(t("joiningFee.warn_rollout", {count}))
      }
    }
    if (warnings.length === 0) {
      onSubmit(data)
      return
    }
    presentAlert({
      header: t("joiningFee.header"),
      message: warnings.join(" "),
      buttons: [
        {text: t("joiningFee.cancel"), role: "cancel"},
        {text: t("joiningFee.save"), role: "confirm", handler: () => onSubmit(data)},
      ],
    })
  }

  const canSubmitted = (): boolean => {
    return !(formMethods.formState.isDirty && formMethods.formState.isValid)
  }

  if (selectedTariff) {
    return (
      <div className={"details-body"} style={{height: "100%", display: "flex", flexDirection: "column"}}>
        <div className={"details-header"}>
          <div><h4>{selectedTariff.name}</h4></div>
          <div style={{minWidth: "200px"}}>
            <IonItem button lines="none" style={{fontSize: "12px", marginRight: "60px"}}
                     className={"participant-header"} onClick={() => archiveTariff()}>
              <IonIcon icon={trashBin} slot="start" style={{marginRight: "10px", fontSize: "16px"}}></IonIcon>
              <IonLabel>Tarif löschen</IonLabel>
            </IonItem>
          </div>
        </div>
        <FormProvider {...formMethods}>
          <div style={{display: "flex", flexDirection: "column", flexGrow: "1", overflow: "auto"}}>
            <div className={"rate-component"} style={{maxWidth: "600px",}}>
              <RateComponent rate={selectedTariff} onSubmit={onSave} submitId={submitId} mode={getMode()}/>
            </div>
          </div>
        <div>
          <IonFooter>
            <IonToolbar className={"ion-padding-horizontal"}>
              <IonButton fill="clear" slot="start" onClick={() => confirmDiscard(isDirty, () => dispatcher(selectRate(undefined)))}>Zurück</IonButton>
              <IonButton form={submitId} type="submit" slot="end" disabled={canSubmitted()}>Änderungen speichern</IonButton>
            </IonToolbar>
          </IonFooter>
        </div>
        </FormProvider>
      </div>
    )
  }

  return <></>
}

export default RateDetailPaneComponent;