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
import {archiveRate, selectedRateSelector, selectRate} from "../store/rate";
import {allParticipantsSelector} from "../store/participant";
import {FormProvider, useForm} from "react-hook-form";
import {useTenant} from "../store/hook/Eeg.provider";

interface RateDetailPaneComponentProps {
  onSubmit: (data: EegTariff) => void;
  submitId: string;
  mode?: 'NEW';
}

const RateDetailPaneComponent: FC<RateDetailPaneComponentProps> = ({onSubmit, submitId, mode}) => {
  const dispatcher = useAppDispatch();
  const selectedTariff = useAppSelector(selectedRateSelector)
  const {tenant} = useTenant()

  const [presentAlert] = useIonAlert();
  const [showToast] = useIonToast();

  const formMethods = useForm<EegTariff>({defaultValues: selectedTariff, values: selectedTariff, mode: 'all'});

  const getMode = (): (undefined | 'NEW') => {
    return (selectedTariff && selectedTariff.id.length === 0) ? 'NEW' : undefined
  }

  const participants = useAppSelector(allParticipantsSelector)

  const archiveTariff = () => {
    if (participants.filter(p => p.tariffId === selectedTariff!.id).length > 0) {
      presentAlert(
        {
          header: 'Tarif löschen nicht möglich',
          message: 'Der Tarif wird noch von folgenden Teilnehmern verwendet: ' + participants.filter(p => p.tariffId === selectedTariff!.id).map(p => p.firstname + " " + p.lastname).join(', ') + ' und kann daher nicht gelöscht werden.  Bitte weisen Sie den Teilnehmern einen anderen Tarif zu.',
          buttons: [
            {text: 'Abbrechen', role: 'cancel'},
          ]
        }
      )
    } else if (selectedTariff) {

      dispatcher(archiveRate({rate: selectedTariff, tenant: tenant}))
        .unwrap()
        .catch((e) => {
            if (e.state && e.state === 900) {
              showToast({
                message: 'Tarif wird noch benutzt!',
                duration: 4500,
                color: "warning"
              })
            } else {
              showToast({
                message: 'Tarif konnte nicht gelöscht werden. Bitte kontaktieren Sie ihren Administrator. Grund: ' + e.message,
                duration: 4500,
                color: "danger"
              })
            }
          }
        )
    }
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
              <RateComponent rate={selectedTariff} onSubmit={onSubmit} submitId={submitId} mode={getMode()}/>
            </div>
          </div>
        </FormProvider>
        <div>
          <IonFooter>
            <IonToolbar className={"ion-padding-horizontal"}>
              <IonButton fill="clear" slot="start" onClick={() => dispatcher(selectRate(undefined))}>Zurück</IonButton>
              <IonButton form={submitId} type="submit" slot="end" disabled={!formMethods.formState.isDirty && formMethods.formState.isValid}>Änderungen speichern</IonButton>
            </IonToolbar>
          </IonFooter>
        </div>
      </div>
    )
  }

  return <></>
}

export default RateDetailPaneComponent;