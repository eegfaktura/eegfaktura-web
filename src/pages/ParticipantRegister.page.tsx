import React, {FC, useState} from "react";
import {
  IonButton,
  IonButtons,
  IonContent,
  IonFooter,
  IonHeader,
  IonMenuButton,
  IonPage,
  IonTitle,
  IonToolbar
} from "@ionic/react";


import "./ParticipantRegister.page.scss"
import ParticipantRegisterCommonPaneComponent from "../components/ParticipantRegisterCommonPane.component";
import {
  activeParticipantsSelector1,
  createParticipant,
} from "../store/participant";
import {EegParticipant} from "../models/members.model";
import {useAppDispatch, useAppSelector} from "../store";
import {selectedTenant} from "../store/eeg";
import ParticipantRegisterMeterPaneComponent from "../components/ParticipantRegisterMeterPane.component";
import {FormProvider, useForm} from "react-hook-form";
import {Metering} from "../models/meteringpoint.model";
import {RouteComponentProps} from "react-router";
import {useTenant} from "../store/hook/Eeg.provider";

const ParticipantRegisterPage: FC<RouteComponentProps> = ({history}) => {


  const dispatch = useAppDispatch();

  const {tenant} = useTenant()
  const participants = useAppSelector(activeParticipantsSelector1);
  const [defaultParticipantNumber, setDefaultParticipantNumber] = useState(participants.length.toString().padStart(3, '0'))

  // useEffect(() => {
  //   setDefaultParticipantNumber(participants.length.toString().padStart(3, '0'))
  // }, [participants])


  const selectedParticipant: EegParticipant = {
    id: '',
    participantNumber: (participants.length + 1).toString().padStart(3, '0'),
    participantSince: new Date(),
    firstname: '',
    lastname: '',
    status: 'NEW',
    titleBefore: '',
    titleAfter: '',
    residentAddress: {street: '', type: 'RESIDENCE', city: '', streetNumber: '', zip: ''},
    billingAddress:  {street: '', type: 'BILLING', city: '', streetNumber: '', zip: ''},
    contact: {email: "", phone: ""},
    accountInfo: {iban: '', owner: '', sepa: false, bankName: ''},
    businessRole: 'EEG_PRIVATE',
    role: 'EEG_USER',
    optionals: {website: ''},
    taxNumber: '',
    vatNumber: '',
    tariffId: '',
    meters: []} as EegParticipant

  const formMethods = useForm<EegParticipant>({defaultValues: selectedParticipant, mode: "onBlur", reValidateMode: 'onChange'})
  const {reset, handleSubmit} = formMethods
  // const {append} = useFieldArray<EegParticipant>({control, name: 'meters'})

  const onRegisterParticipant = (participant: EegParticipant) => {
    dispatch(createParticipant({tenant, participant}))
    history.replace("/page/participants")
  }

  const onAddMeter = (meter: Metering) => {
    // append(meter)
  }

  const onSubmit = (data: EegParticipant) => {
    data.residentAddress.type = "RESIDENCE"
    data.residentAddress.city = data.billingAddress.city
    data.residentAddress.zip = data.billingAddress.zip
    data.residentAddress.street = data.billingAddress.street
    data.residentAddress.streetNumber = data.billingAddress.streetNumber
    data.meters = data.meters.map(m => {return {...m, registeredSince: data.participantSince} as Metering})
    onRegisterParticipant(data)
    reset()
  }

  return (
    <IonPage>
      <IonHeader>
        <IonToolbar color="primary">
          <IonButtons slot="start">
            <IonMenuButton></IonMenuButton>
          </IonButtons>
          <IonTitle>Registrieren</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent fullscreen color="eeg">
        <FormProvider {...formMethods}>
          <form id="submit-register-participant" onSubmit={handleSubmit(onSubmit)} noValidate>
            <div>
            <div className={"register-participant-content"}>
              <div className="register-content-pane">
                <h4>Allgemeines</h4>
                <ParticipantRegisterCommonPaneComponent participant={selectedParticipant}
                                                        submitId="submit-register-participant"
                                                        onAdd={onRegisterParticipant}/>
              </div>
              <div className="register-content-pane">
                <h4>Zählpunkte</h4>
                <ParticipantRegisterMeterPaneComponent participant={selectedParticipant} onAddMeter={onAddMeter}/>
              </div>
            </div>
            </div>
          </form>
        </FormProvider>
      </IonContent>
      <IonFooter>
        <IonToolbar className={"ion-padding-horizontal"}>
          <IonButton fill="clear" slot="start" routerLink="/page/participants" routerDirection="root">Zurück</IonButton>
          <IonButton form="submit-register-participant" type="submit" slot="end">Registrieren</IonButton>
        </IonToolbar>
      </IonFooter>
    </IonPage>
  )

}

export default ParticipantRegisterPage;