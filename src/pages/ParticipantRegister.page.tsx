import React, {FC, useEffect, useMemo} from "react";
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
  allParticipantsSelector,
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
import moment from "moment/moment";

const ParticipantRegisterPage: FC<RouteComponentProps> = ({history}) => {


  const dispatch = useAppDispatch();

  const {tenant} = useTenant()
  // Vorschlag der nächsten Mitglieds-Nr über ALLE Mitglieder (inkl. archivierte),
  // nicht über die Anzahl der aktiven. `activeParticipantsSelector1.length + 1`
  // recycelte Nummern archivierter Mitglieder und kollidierte mit dem
  // Unique-Index auf base.participant (Kundenfeedback 2026-07-02: Nummern-
  // vorschlag oft falsch).
  const allParticipants = useAppSelector(allParticipantsSelector);

  // Höchsten numerischen Endteil einer bestehenden Nummer nehmen, dessen Präfix
  // und Zero-Padding-Breite erhalten, und Präfix + (max + 1) vorschlagen.
  // Beispiele: ["001","002","004"] → "005"; ["MG-001"] → "MG-002";
  // ["ABC123"] → "ABC124"; leer/nichts parsebar → "001".
  const nextParticipantNumber = useMemo(() => {
    let best: {prefix: string, num: number, padding: number} | null = null
    for (const p of allParticipants) {
      const match = (p.participantNumber || "").match(/^(.*?)(\d+)$/)
      if (!match) continue
      const num = parseInt(match[2], 10)
      if (isNaN(num)) continue
      if (!best || num > best.num) {
        best = {prefix: match[1], num, padding: match[2].length}
      }
    }
    if (!best) return "001"
    return best.prefix + (best.num + 1).toString().padStart(best.padding, '0')
  }, [allParticipants])

  const selectedParticipant: EegParticipant = {
    id: '',
    participantNumber: nextParticipantNumber,
    participantSince: new Date(),
    firstname: '',
    lastname: '',
    status: 'NEW',
    titleBefore: '',
    titleAfter: '',
    residentAddress: {street: '', type: 'RESIDENCE', city: '', streetNumber: '', zip: ''},
    billingAddress:  {street: '', type: 'BILLING', city: '', streetNumber: '', zip: ''},
    contact: {email: "", phone: ""},
    accountInfo: {iban: '', owner: '', sepa: false, bankName: '', mandateReference: '', sepaDirectDebit: 'NONE'},
    businessRole: 'EEG_PRIVATE',
    role: 'EEG_USER',
    optionals: {website: ''},
    taxNumber: '',
    vatNumber: '',
    tariffId: '',
    meters: []} as EegParticipant

  const formMethods = useForm<EegParticipant>({defaultValues: selectedParticipant, mode: "onBlur", reValidateMode: 'onChange'})
  const {reset, handleSubmit, setValue, formState: {dirtyFields}} = formMethods
  // const {append} = useFieldArray<EegParticipant>({control, name: 'meters'})

  // Async-Race: useForm({defaultValues}) erfasst die Nummer beim ersten Render,
  // bevor die Mitgliederliste geladen ist. Sobald nextParticipantNumber steht,
  // das Feld nachziehen — außer der Nutzer hat es bereits selbst editiert.
  useEffect(() => {
    if (!dirtyFields.participantNumber) {
      setValue("participantNumber", nextParticipantNumber)
    }
  }, [nextParticipantNumber, dirtyFields.participantNumber, setValue])

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