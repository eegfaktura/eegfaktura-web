import React, {FC, useEffect, useState} from "react";
import {EegParticipant} from "../../models/members.model";
import cn from "classnames";

import "./ParticipantDetailsPane.compoenent.css"
import {
  IonButton, IonButtons, IonCard, IonCardContent, IonCardHeader, IonContent, IonFooter,
  IonIcon,
  IonItem,
  IonLabel, IonPage,
  IonTitle,
  IonToggle,
  IonToolbar, useIonAlert, useIonModal, useIonToast
} from "@ionic/react";
import {
  caretForwardOutline,
  documentTextOutline,
  logoEuro, moveOutline,
  person,
  trashBin
} from "ionicons/icons";
import {eegExclamation, eegPlug, eegSandClass, eegShieldCrown, eegSolar, eegStar} from "../../eegIcons";
import {store, useAppDispatch, useAppSelector} from "../../store";
import {Metering} from "../../models/meteringpoint.model";
import MemberFormComponent from "../MemberForm.component";
import MeterFormComponent from "./MeterForm.component";
import {
  archiveParticipant,
  confirmParticipant, moveMeteringPoint, participantsSelector1, removeMeteringPoint,
  selectedMeterSelector,
  selectedParticipantSelector, selectParticipantById,
  updateParticipant, updateParticipantPartial
} from "../../store/participant";
import {formatMeteringPointString, GetWeek, JoinStrings} from "../../util/Helper.util";
import {activeTenant, selectedTenant} from "../../store/eeg";
import AllowParticipantDialog from "../dialogs/AllowParticipant.dialog";
import {OverlayEventDetail} from "@ionic/react/dist/types/components/react-component-lib/interfaces";
import InvoiceDocumentComponent from "./InvoiceDocument.component";
import ContractDocumentComponent from "./ContractDocument.component";
import {ratesSelector} from "../../store/rate";
import {meteringInterReportSelectorV2, meteringReportSelectorV2, selectedPeriodSelector} from "../../store/energy";
import MeterChartComponent from "./MeterChart.component";
import {Api} from "../../service";
import {useLocale} from "../../store/hook/useLocale";
import {useAccessGroups, useTenant} from "../../store/hook/Eeg.provider";
import {BasicSelectComponent} from "../form/BasicSelect.component";
import {useForm} from "react-hook-form";
import {useMoveMeteringPointHook} from "../../store/hook/MoveMeteringPoint.hook";
import moment from "moment";

type DynamicComponentKey = "memberForm" | "meterForm" | "documentForm" | "invoiceForm" | "participantDocumentForm"

// interface ParticipantDetailsPaneProps {
//   activePeriod: SelectedPeriod | undefined;
// }
//
// type NonNullable<T> = Exclude<T, null | undefined>;

// const MoveParticipantModel: FC<{meter: Metering, participants: EegParticipant[]}> = ({meter, participants}) => {
//   const {control} = useForm<Metering>({defaultValues: meter})
//   return (
//     <IonPage>
//       {/*<IonCard>*/}
//         <IonCardHeader>Zählpunkt verschieben</IonCardHeader>
//         <IonCardContent>
//           <BasicSelectComponent control={control} name="participantId"
//                                 options={participants.sort((a,b) => a.lastname.localeCompare(b.lastname)).map((p) => {
//             return {value: p.id, label: JoinStrings(" ", "-", p.participantNumber, p.lastname, p.firstname)}
//           })} label={"Verschieben zu"} />
//           <div style={{padding: "25px"}}>
//           <p style={{paddingBottom: "20px"}}>
//             Wenn ein Zählpunkt innerhalb Ihrer Gemeinschaft auf ein anderes Mitglied übertragen wird,
//             ändert sich ab diesem Zeitpunkt die Zuordnung für die Abrechnung. Bitte beachten Sie,
//             dass eine Übertragung innerhalb eines Abrechnungszeitraums Auswirkungen auf spätere Abrechnungen haben kann.
//             Der gesamte Verbrauch des Zählpunkts wird dem Mitglied in Rechnung gestellt, dem er zu diesem Zeitpunkt zugeordnet ist.
//           </p>
//           <p>Alle bisher ausgestellten Rechnungen werden nicht verschoben.</p>
//           </div>
//         </IonCardContent>
//       {/*</IonCard>*/}
//       <IonFooter>
//         <IonButton onClick={() => dism}>Abbrechen</IonButton>
//         <IonButton>Verschieben</IonButton>
//       </IonFooter>
//     </IonPage>
//   )
// }

const ParticipantDetailsPaneComponent: FC = () => {

  const {t} = useLocale('common')
  const dispatcher = useAppDispatch();
  const selectedParticipant = useAppSelector(selectedParticipantSelector);
  const selectedMeter = useAppSelector(selectedMeterSelector);
  const tenant = useTenant()
  const rates = useAppSelector(ratesSelector);
  const activePeriod = useAppSelector(selectedPeriodSelector);
  const report = useAppSelector(meteringInterReportSelectorV2(selectedParticipant?.id, selectedMeter?.meteringPoint))

  const [activeMenu, setActiveMenu] = useState<DynamicComponentKey>("meterForm")

  const {isAdmin} = useAccessGroups()
  // const [moveMeterModal] = useIonModal(MoveParticipantModel, {meter: selectedMeter, participants: participantsSelector1(store.getState())});
  const {showMoveMeteringModal} = useMoveMeteringPointHook(selectedMeter!,
    participantsSelector1(store.getState()), (name: string, value: string, event?: any) => {
    console.log("meter", value)
      dispatcher(moveMeteringPoint({tenant: tenant.tenant, sParticipantId: selectedParticipant!.id, dParticipantId: value, meter: selectedMeter!}))
    });

  const [toaster] = useIonToast();
  const [participantAlert] = useIonAlert();

  const isMeterNew = () => selectedMeter?.processState === 'NEW';
  const isMeterActive = () => selectedMeter?.processState === "ACTIVE" || selectedMeter?.processState === "INACTIVE"
  const isMeterInactive = () => selectedMeter?.processState !== "ACTIVE"
  const isMeterPending = () => selectedMeter?.processState === "PENDING"

  const isGenerator = () => selectedMeter?.direction === 'GENERATION';

  const meterInvalidCodes = [56, 57, 76, 104, 156, 157, 158, 159, 172, 173, 177, 181, 184, 185, 196]

  const onUpdateParticipant = (participant: EegParticipant) => {
    dispatcher(updateParticipant({
      tenant: tenant!.tenant,
      participant: participant
    })).unwrap().then(() => console.log("Participant Updated"))
  }

  const onUpdateParticipantPartial = (participantId: string, value: Record<string, any>) => {
    dispatcher(updateParticipantPartial({
      tenant: tenant!.tenant,
      participantId: participantId,
      value: {path: Object.keys(value)[0], value: Object.values(value)[0]}
    })).unwrap()
      .then(() => console.log("Participant Updated"))
      .catch((e) => console.error("Error by updating participant: ", e))
  }

  const dynamicComponent = (componentKey: DynamicComponentKey) => {

    switch (componentKey) {
      case "memberForm":
        return selectedParticipant ? <MemberFormComponent participant={selectedParticipant} rates={rates} formId={""}
                                                          onSubmit={onUpdateParticipant}
                                                          onSubmitPartial={onUpdateParticipantPartial}
                                                          changeable={false}/> : <></>
      case "meterForm":
        return selectedMeter ? <MeterFormComponent meteringPoint={selectedMeter}/> : <></>
      case "invoiceForm":
        return selectedParticipant ?
          <InvoiceDocumentComponent tenant={tenant!.tenant} participant={selectedParticipant}/> : <></>
      case "documentForm":
        return selectedParticipant ?
          <ContractDocumentComponent tenant={tenant!.tenant} participant={selectedParticipant}/> : <></>
      default:
        return <></>
    }
  }

  const presentToast = (message: string) => {
    toaster({
      message: message,
      duration: 3500,
      position: 'bottom'
    });
  };

  function onWillDismiss(participant: EegParticipant, meters: Metering[], ev: CustomEvent<OverlayEventDetail<FormData>>) {

    const uploadFiles = async (tenant: string, participantId: string, data?: FormData) => {
      if (data) {
        const files = data.getAll("docfiles").map(e => e as File)
        if (files.length > 0) {
          return Api.fileService.uploadContractDocuments(tenant, participantId, files)
        }
      }
      return new Promise<any>((resolve) => resolve(true))
    }

    if (ev.detail.role === 'confirm') {
      uploadFiles(tenant!.tenant, participant.id, ev.detail.data)
        .then(() => {
          console.log(meters)
          return participant
        })
        .then(() => dispatcher(confirmParticipant({tenant: tenant!.tenant, participantId: participant.id, meters: meters.filter(m=>m.enabled)})).unwrap())
        .then((value) => presentToast(`${value.firstname} ist nun Mitglied deiner EEG. Ein Infomail wurde an ${value.contact.email} gesendet.`))
        .catch(() => presentToast('Mitglied konnte nicht aktiviert werden.'))
    }
  }

  const meterStatusText = (meter: Metering) => {
    return (
      <div>
        <span>{t(`meter.status_text_${meter.processState}`)}</span>
        {hasStatusCode(meter) && <span> <strong>{t(`meter.status_code_${meter.statusCode}`)}</strong></span>}
      </div>
    )
  }

  const meterInvalidStatusText = (meter: Metering) => {

    const inaktiveMsg = () => {
      const diff = moment(meter.participantState.inactiveSince).diff(moment(), "days")
      if (diff >= 0) {
        return (
          <span>Zählpunkt inaktive am <strong>{moment(meter.participantState.inactiveSince).format("DD-MM-YYYY")}</strong></span>
        )
      }
      return (
        <span>Zählpunkt inaktive seit <strong>{moment(meter.participantState.inactiveSince).format("DD-MM-YYYY")}</strong></span>
      )
    }

    return (
      <div>
        {/*<p>*/}
        {/*  <span>{t(`meter.status_text_${meter.status}`)}</span>*/}
        {/*</p>*/}
        <p>{inaktiveMsg()}</p>
      </div>
    )
  }

  const onRemoveMeteringPoint = () => {
    if (selectedMeter && selectedParticipant) {
      dispatcher(removeMeteringPoint(
        {tenant: tenant!.tenant, participantId: selectedParticipant.id, meter: selectedMeter}))
    }
  }

  const archive = (sp: EegParticipant) => {
    participantAlert({
      subHeader: "Mitglied archivieren",
      message: "Das Mitglied ist nach dem ARCHIVIERUNG'S Prozess in deiner Übersicht nicht mehr verhanden.",
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel',
        },
        {
          text: 'OK',
          role: 'confirm',
        },
      ],
      onDidDismiss: (e: CustomEvent) => {
        if (e.detail.role === 'confirm') {
          dispatcher(archiveParticipant({participant: sp, tenant: tenant!.tenant}))
            .unwrap()
            .catch(() => {
              toaster({
                message: 'Mitglied konnte nicht gelöscht werden. Bitte kontaktieren Sie ihren Administrator.',
                duration: 4500,
                color: "danger"
              })
            })
        }
      },
    })
  }

  const hasStatusCode = (meter: Metering) => {
    return !!(meter && (meter.processState === 'INVALID' || meter.processState === 'REJECTED') && meter.statusCode && meterInvalidCodes.includes(meter.statusCode))
  }

  const renderMeterStatus = (selectedMeter: Metering) => {
    switch (selectedMeter.processState) {
      case 'INACTIVE':
        return (
          <IonCard color="secondary-light">
            <IonItem lines="none" color="secondary-light">
              <IonIcon icon={eegExclamation} slot="start"/>
              <IonLabel>{meterInvalidStatusText(selectedMeter)}</IonLabel>
            </IonItem>
          </IonCard>
        )
      default:
        return (
          <IonCard color="warning-light">
            <IonItem lines="none" color="warning-light">
              <IonIcon icon={eegSandClass} slot="start"/>
              <IonLabel>{meterStatusText(selectedMeter)}</IonLabel>
            </IonItem>
            {selectedMeter.processState === "INVALID" &&
                <IonItem>
                    <IonButton color="warning" slot="end" size="small" fill="outline"
                               onClick={() => onRemoveMeteringPoint()}>Löschen</IonButton>
                </IonItem>
            }
          </IonCard>
        )
    }

  }

  if (!selectedParticipant) {
    return <></>
  } else {
    return (
      <div className={"details-body"} style={{display: "flex", flexDirection: "column", height: "100%"}}>
        <div className={"details-header"}>
          <div><h4>{selectedParticipant.firstname} {selectedParticipant.lastname}</h4></div>
          {/*<div style={{minWidth: "240px"}}>*/}
          {/*  <IonItem button lines="none" style={{fontSize: "12px", marginRight: "60px"}}*/}
          {/*           className={"participant-header"}*/}
          {/*           onClick={() => archive(selectedParticipant)}>*/}
          {/*    <IonIcon icon={trashBin} slot="start"*/}
          {/*             style={{marginRight: "10px", fontSize: "16px"}}></IonIcon>*/}
          {/*    <IonLabel>Benutzer archivieren</IonLabel>*/}
          {/*  </IonItem>*/}
          {/*</div>*/}
        </div>
        <div style={{display: "flex", flexDirection: "row", height: "100%"}}>
          <div style={{display: "flex", flexDirection: "column", width: "50%"}}>
            <div className={"details-box"}>
              {(selectedParticipant.status === 'NEW' || selectedParticipant.status === 'PENDING') ? (
                <div style={{color: "black"}}>
                  <AllowParticipantDialog trigger="open-participant-allow-dialog"
                                          participant={selectedParticipant}
                                          meters = {selectedParticipant.meters.map(m => {return {...m, activationCode: '', activationMode:'ONLINE', enabled: true}})}
                                          onDismiss={onWillDismiss}/>
                  <IonCard color="warning-light">
                    <IonItem lines="none" color="warning-light">
                      <IonIcon icon={eegStar} slot="start"/>
                      <IonLabel>Möchtest du {selectedParticipant.lastname} in deine EEG
                        aufnehmen?</IonLabel>
                    </IonItem>
                    <IonItem lines="none" color="warning-light">
                      <IonButton id="open-participant-allow-dialog" slot="end" color="warning"
                                 size="default">Ja,
                        Zulassen</IonButton>
                    </IonItem>
                  </IonCard>
                </div>) : (<></>)}
              <div>
                <IonItem button lines="full"
                         className={cn("eeg-item-box", {"selected": activeMenu === "memberForm"})}
                         onClick={() => setActiveMenu("memberForm")}>
                  <IonIcon icon={person} slot="start"></IonIcon>
                  <IonLabel>
                    <div className={"detail-header"}>Details</div>
                    <div className={"detail-subheader"}>Kontakt, Adresse, Bankdaten, ...</div>
                  </IonLabel>
                </IonItem>
              </div>
              <div>
                <IonItem button lines="full"
                         className={cn("eeg-item-box", {"selected": activeMenu === "documentForm"})}
                         onClick={() => setActiveMenu("documentForm")}>
                  <IonIcon icon={documentTextOutline} slot="start"></IonIcon>
                  <div>
                    <div className={"detail-header"}>Dokumente</div>
                    <div className={"detail-subheader"}>z.B. Verträge</div>
                  </div>
                </IonItem>
              </div>
              <div>
                <IonItem button lines="full"
                         className={cn("eeg-item-box", {"selected": activeMenu === "invoiceForm"})}
                         onClick={() => setActiveMenu("invoiceForm")}>
                  <IonIcon icon={logoEuro} slot="start"></IonIcon>
                  <IonLabel>
                    <div className={"detail-header"}>Meine Rechnungen</div>
                  </IonLabel>
                </IonItem>
              </div>
              <div>
                <IonItem lines="full" className={"eeg-item-box"}>
                  <IonIcon icon={eegShieldCrown} slot="start"></IonIcon>
                  <div>
                    <div
                      className={"detail-header"}>{`Mitglied ist ${selectedParticipant.role === 'EEG_USER' ? 'kein' : ''} Administrator`}</div>
                  </div>
                  <IonToggle slot="end" checked={selectedParticipant.role !== 'EEG_USER'}
                             disabled={true}></IonToggle>
                </IonItem>
              </div>
            </div>
            <div className={"details-box"}>
              {selectedMeter ? (
                  <div className="ion-padding" slot="content">
                    <IonToolbar color="primary">
                      <IonTitle>{formatMeteringPointString(selectedMeter.meteringPoint)}</IonTitle>
                      {isAdmin() && <IonButtons slot="end">
                        <IonButton fill="clear" onClick={() => showMoveMeteringModal()}>
                          <IonIcon icon={moveOutline} size="small"/>
                        </IonButton>
                      </IonButtons>}
                    </IonToolbar>
                    {isMeterInactive() && renderMeterStatus(selectedMeter) }

                    <IonItem button lines="full"
                             className={cn("eeg-item-box", {"selected": activeMenu === "meterForm"})}
                             onClick={() => setActiveMenu("meterForm")}>
                      <IonIcon icon={isGenerator() ? eegSolar : eegPlug} slot="start"></IonIcon>
                      <div>
                        <div className={"detail-header"}>Details und Adresse</div>
                      </div>
                    </IonItem>
                    <IonItem lines="full" className={"eeg-item-box"} disabled={isMeterNew()}>
                      <IonIcon icon={caretForwardOutline} slot="start"></IonIcon>
                      <div>
                        <div
                          className={"detail-header"}>{`Zählpunkt ${selectedMeter.processState === "ACTIVE" ? "aktiv" : "inaktiv"}`}</div>
                      </div>
                      <IonToggle slot="end" checked={selectedMeter.processState === "ACTIVE"}
                                 disabled={true}></IonToggle>
                    </IonItem>
                    {isMeterActive() && report && activePeriod &&
                        <MeterChartComponent report={report} tenant={tenant!} activePeriod={activePeriod}
                                             selectedMeter={selectedMeter}
                                             selectedParticipant={selectedParticipant}/>}
                  </div>) :
                <></>
              }
            </div>
          </div>
          <div className="pane-content-details">
            <div className="pane-content-details-content">
              {dynamicComponent(activeMenu)}
            </div>
          </div>
        </div>
      </div>
    )
  }
}

export default ParticipantDetailsPaneComponent;