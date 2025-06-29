import React, {FC, useCallback} from "react";
import {Metering} from "../../models/meteringpoint.model";
import {EegParticipant} from "../../models/members.model";
import {useForm} from "react-hook-form";
import {
  IonButton,
  IonCardContent,
  IonCardHeader,
  IonContent,
  IonFooter,
  IonPage,
  useIonModal,
  UseIonModalResult
} from "@ionic/react";
import {BasicSelectComponent} from "../../components/form/BasicSelect.component";
import {JoinStrings} from "../../util/Helper.util";
import {PartialChangeFunction} from "../../components/form/InputForm.component";

import "./MoveMeteringPoint.hook.scss"
import {useLocale} from "./useLocale";

const MoveMeteringPointHook: FC<{meter: Metering, participants: EegParticipant[], onChangeClick: PartialChangeFunction, onCancel: () => void}> = ({meter, participants, onChangeClick, onCancel}) => {
  const {control, handleSubmit, formState: {isValid, isDirty}, getFieldState } = useForm<Metering>({defaultValues: meter})

  const {t} = useLocale("common")
  const onMove = (meter: Metering) => {
    onChangeClick("participantId", meter.participantId)
  }

  return (
    // <IonPage>
      <div className={"inner-content"}>
      <IonCardHeader>Zählpunkt verschieben</IonCardHeader>
      <IonCardContent>
        <BasicSelectComponent control={control} name="participantId"
                              options={participants
                                .sort((a,b) => a.lastname && b.lastname ? a.lastname.localeCompare(b.lastname) : a.firstname.localeCompare(b.firstname))
                                .map((p) => {
                                return {value: p.id, label: JoinStrings(" ", "-", p.participantNumber, p.lastname ? p.lastname : "", p.firstname)}
                              })} label={"Verschieben zu"} rules={{required: true}}/>
        <div style={{padding: "25px"}}>
          <p style={{paddingBottom: "20px"}}>
            Wenn ein Zählpunkt innerhalb Ihrer Gemeinschaft auf ein anderes Mitglied übertragen wird,
            ändert sich ab diesem Zeitpunkt die Zuordnung für die Abrechnung. Bitte beachten Sie,
            dass eine Übertragung innerhalb eines Abrechnungszeitraums Auswirkungen auf spätere Abrechnungen haben kann.
            Der gesamte Verbrauch des Zählpunkts wird dem Mitglied in Rechnung gestellt, dem er zu diesem Zeitpunkt zugeordnet ist.
          </p>
          <p>Alle bisher ausgestellten Rechnungen werden nicht verschoben.</p>
        </div>
      </IonCardContent>
      <div className={"footer"}>
        <IonButton onClick={() => onCancel()}>{t("button_labels.cancel")}</IonButton>
        <IonButton onClick={handleSubmit(onMove)} disabled={!(isDirty || isValid)}>{t("button_labels.submit")}</IonButton>
      </div>
      </div>
    // </IonPage>
  )
}

export const useMoveMeteringPointHook = (meter: Metering, participants: EegParticipant[], onChange: PartialChangeFunction) => {
  const [showMoveModal, closeUserOptions] = useIonModal(MoveMeteringPointHook, {
    onDismiss: () => closeUserOptions(),
    meter: meter,
    participants: participants,
    onChangeClick: (name: string, value: any, event?: any) => {
      onChange(name, value, event);
      closeUserOptions();
    },
    onCancel: () => {
      closeUserOptions();
    },
  });

  const showModal = useCallback(
    (options?: UseIonModalResult[0]) => {
      showMoveModal({ ...(options ?? {}), cssClass: "auto-height" });
    },
    [showMoveModal],
  );

  return { showMoveMeteringModal: showModal, closeUserOptions };
}