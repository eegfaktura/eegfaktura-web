import React, {FC, useState} from "react";
import InputForm from "./form/InputForm.component";
import {IonCol, IonGrid, IonList, IonListHeader, IonRow} from "@ionic/react";
import ToggleButtonComponent from "./ToggleButton.component";
import {people} from "ionicons/icons";
import {eegBusiness} from "../eegIcons";
import {EegParticipant} from "../models/members.model";
import {useFormContext} from "react-hook-form";
import {useMaskito} from "@maskito/react";
import {IbanInputForm} from "./form/IbanInputForm";
import {useLocale} from "../store/hook/useLocale";

interface ParticipantRegisterCommonPaneComponentProps {
  participant: EegParticipant;
  submitId: string
  onAdd: (participant: EegParticipant) => void;
}

const ParticipantRegisterCommonPaneComponent: FC<ParticipantRegisterCommonPaneComponentProps> = ({
                                                                                                   participant
                                                                                                 }) => {

  const [selectedBusinessType, setSelectedBusinessType] = useState(0)
  const {control, setValue, formState: {errors}} = useFormContext<EegParticipant>();
  const {t} = useLocale("common")

  const ibanMask = useMaskito({
    options: {
      mask: [
        'A', 'T',
        ...Array(2).fill(/\d/),
        ' ',
        ...Array(4).fill(/\d/),
        ' ',
        ...Array(4).fill(/\d/),
        ' ',
        ...Array(4).fill(/\d/),
        ' ',
        ...Array(4).fill(/\d/),
      ],
    },
  });
  const onChangeBusinessType = (s: number) => {
    setSelectedBusinessType(s)
    setValue("businessRole", s === 0 ? "EEG_PRIVATE" : "EEG_BUSINESS")
  }

  const editable = () => {
    return participant.status === "NEW"
  }

  return (
    <div style={{
      background: "var(--ion-color-eeglight, #fff)",
      boxShadow: "0px 1px 1px rgba(0, 0, 0, 0.14), 0px 2px 1px rgba(0, 0, 0, 0.12), 0px 1px 3px rgba(0, 0, 0, 0.2)",
      borderRadius: "4px"
    }}>
      <IonGrid>
        <IonRow>
          <IonCol size="auto">
            <ToggleButtonComponent
              buttons={[{label: 'Privat', icon: people}, {label: 'Firma', icon: eegBusiness}]}
              onChange={onChangeBusinessType}
              value={selectedBusinessType}
              changeable={editable()}
            />
          </IonCol>
        </IonRow>
      </IonGrid>
      <div style={{display: "flex", flexDirection: "row"}}>
        <div style={{flexGrow: "1", height: "100%", width: "50%"}}>
          <IonList>
            <IonListHeader>Kontakt</IonListHeader>
            <InputForm name={"participantNumber"} label="Mitglieds-Nr" control={control} type="text"/>
            {selectedBusinessType === 0 ? (
                <>
                  <div style={{display: "grid", gridTemplateColumns: "50% 50%"}}>
                    <InputForm name={"titleBefore"} label={t("participant-title_before")} control={control} type="text"/>
                    <InputForm name={"titleAfter"} label={t("participant-title_after")} control={control} type="text"/>
                  </div>
                  <InputForm name={"firstname"} label={t("firstname")} control={control}
                             rules={{required: t("warnings.firstname_missing")}} type="text" error={errors.firstname} />
                  <InputForm name={"lastname"} label={t("lastname")} control={control} rules={{required: t("warnings.lastname_missing")}}
                             type="text" error={errors.lastname} />
                </>
              ) :
              (
                <InputForm name={"firstname"} label={t("company-name")} control={control}
                           rules={{required: t("warnings.company-name_missing")}} type="text" error={errors.firstname}/>
              )
            }
            <InputForm name={"billingAddress.street"} label={t("street")} control={control}
                       rules={{required: t("warnings.street_missing")}} type="text" error={errors.billingAddress?.street}/>
            <InputForm name={"billingAddress.streetNumber"} label={t("street_number")} control={control}
                       rules={{required: t("warnings.street-number_missing")}}
                       type="text" error={errors.billingAddress?.streetNumber}/>
            <InputForm name={"billingAddress.zip"} label={t("zip")} control={control}
                       rules={{required: t("warnings.zip_missing")}} type="text" error={errors.billingAddress?.zip}/>
            <InputForm name={"billingAddress.city"} label={t("city")} control={control} rules={{required: t("warnings.city_missing")}}
                       type="text" error={errors.billingAddress?.city}/>
            <InputForm name={"contact.phone"} label={t("phone")} control={control} type="text"/>
            <InputForm name={"contact.email"} label={t("email")} control={control} type="text"
                       rules={{required: t("warnings.email_missing")}} error={errors.contact?.email}/>
          </IonList>

        </div>

        <div style={{flexGrow: "1", height: "100%", width: "50%"}}>
          <IonList>
            <IonListHeader>{t("headers.bank-data")}</IonListHeader>
            <IbanInputForm name={"accountInfo.iban"} control={control} error={errors.accountInfo?.iban}/>
            <InputForm name={"accountInfo.owner"} label={t("account-owner")} control={control}
                       rules={{required: t("warnings.account-owner_missing")}} type="text" error={errors.accountInfo?.owner}/>
          </IonList>
          <IonList>
            <IonListHeader>Steuer Angaben</IonListHeader>
            <InputForm name={"vatNumber"} label={t("uid")} control={control} type="text"/>
          </IonList>
          <IonList>
            <IonListHeader>Optional</IonListHeader>
            <InputForm name={"optionals.website"} label={t("website")} control={control} type="text"/>
          </IonList>

        </div>
      </div>
    </div>
  )
}

export default ParticipantRegisterCommonPaneComponent;