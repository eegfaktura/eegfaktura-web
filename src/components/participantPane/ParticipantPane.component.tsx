import React, {FC, useContext, useEffect, useRef, useState} from "react";

import {EegParticipant} from "../../models/members.model";
import {
  CheckboxCustomEvent,
  IonAlert,
  IonButton,
  IonButtons,
  IonCol,
  IonIcon,
  IonItem,
  IonLabel,
  IonRow,
  IonSearchbar,
  IonSpinner,
  IonToolbar,
  useIonAlert,
  useIonLoading,
  useIonPopover,
  useIonToast
} from "@ionic/react";
import {CheckboxChangeEventDetail} from "@ionic/core";
import {IonCheckboxCustomEvent} from "@ionic/core/dist/types/components";
import {createPeriodIdentifier, SelectedPeriod} from "../../models/energy.model";
import ParticipantPeriodHeaderComponent from "./ParticipantPeriodHeader.component";
import MemberComponent from "./Member.component";
import {ClearingPreviewRequest, Metering, MeteringEnergyGroupType,} from "../../models/meteringpoint.model";
import MeterCardComponent from "./MeterCard.component";
import {ParticipantContext} from "../../store/hook/ParticipantProvider";
import {MemberViewContext} from "../../store/hook/MemberViewProvider";

import "./ParticipantPane.component.scss"
import SlideButtonComponent from "../SlideButton.component";
import {State, store, useAppDispatch, useAppSelector} from "../../store";
import {
  billingSelector,
  fetchEnergyBills,
  fetchParticipantAmounts,
  resetParticipantAmounts,
  selectBillFetchingSelector
} from "../../store/billing";
import {eegSelector, selectedTenant} from "../../store/eeg";
import {meteringEnergyGroup11, selectMetaRecord, setSelectedPeriod} from "../../store/energy";
import ButtonGroup from "../ButtonGroup.component";
import {
  add,
  archiveOutline,
  cloudUploadOutline,
  documentTextOutline,
  downloadOutline,
  flash,
  mailOutline,
  person,
  reloadCircleOutline,
  search
} from "ionicons/icons";
import {eegPlug, eegSolar} from "../../eegIcons";
import {
  selectedMeterIdSelector,
  selectedParticipantSelector,
  selectMetering,
  selectParticipant
} from "../../store/participant";
import cn from "classnames";
import {isParticipantActivated, reformatDateTimeStamp} from "../../util/Helper.util";
import DatepickerPopover from "../dialogs/datepicker.popover";
import {ExcelReportRequest, InvestigatorCP} from "../../models/reports.model";
import {eegService} from "../../service/eeg.service";
import UploadPopup from "../dialogs/upload.popup";
import {useRefresh} from "../../store/hook/Eeg.provider";
import {
  billingRunErrorSelector,
  billingRunIsFetchingSelector,
  billingRunSelector,
  billingRunSendmail,
  billingRunStatusSelector,
  fetchBillingRun,
  fetchBillingRunById
} from "../../store/billingRun";
import DatePickerCoreElement from "../core/elements/DatePickerCore.element";
import DatePicker from "react-datepicker";

import {useSelector} from "react-redux";
import {filterActiveMeter, filterActiveParticipantAndMeter} from "../../util/FilterHelper.unit";
import moment from "moment";

interface ParticipantPaneProps {
  // participants: EegParticipant[];
  // periods: { begin: string, end: string };
  // activePeriod: SelectedPeriod | undefined;
  // onUpdatePeriod: (e: SelectCustomEvent<number>) => void;
}

const ParticipantPaneComponent: FC<ParticipantPaneProps> = ({
                                                              // participants,
                                                              // periods,
                                                              // activePeriod,
                                                              // onUpdatePeriod
                                                            }) => {

  const dispatcher = useAppDispatch();
  const tenant = useAppSelector(selectedTenant);
  const energyMeterGroup = useAppSelector(meteringEnergyGroup11);
  const selectedParticipant = useAppSelector(selectedParticipantSelector);
  const selectedMeterId = useAppSelector(selectedMeterIdSelector);
  const billingInfo = useAppSelector(billingSelector);
  const eeg = useAppSelector(eegSelector);

  const billingRun = useAppSelector(billingRunSelector);
  const billingRunStatus = useAppSelector(billingRunStatusSelector);
  const billingRunIsFetching = useAppSelector(billingRunIsFetchingSelector);
  const selectBillIsFetching = useAppSelector(selectBillFetchingSelector);
  const billingRunErrorMessage = useAppSelector(billingRunErrorSelector);

  let documentDatePreview : Date = new Date();
  let documentDateBilling : Date = new Date();

  const [searchActive, setSearchActive] = useState(false);
  const [result, setResult] = useState<EegParticipant[]>([])

  const [loading, dismissLoading] = useIonLoading();

  const {refresh} = useRefresh()

  const [toaster] = useIonToast()

  const {
    participants,
    activePeriod,
    billingEnabled,
    setBillingEnabled,
    checkedParticipant,
    setCheckedParticipant,
    showDetailsPage,
    setShowAddMeterPane,
  } = useContext(ParticipantContext);
  const {
    toggleMembersMeter,
    toggleMetering,
    toggleShowAmount,
    hideMeter,
    hideConsumers,
    hideProducers,
    showAmount,
    hideMember
  } = useContext(MemberViewContext);

  const [presentAlert] = useIonAlert();
  const [sortedParticipants, setSortedParticipants] = useState(participants);

  useEffect( () => {
    if (showAmount && billingRun && billingRun.id) {
      dispatcher(fetchParticipantAmounts({tenant: tenant, billingRunId: billingRun.id }))
    }
    if (showAmount && !billingRun) {
      dispatcher(resetParticipantAmounts());
    }
  }, [billingRun, showAmount])

  useEffect(() => {
    if (checkedParticipant) {
      const nextBillingEnabled =
        Object.entries(checkedParticipant).reduce((r, e) => (isParticipantActivated(participants, e[0]) && e[1]) || r, false)
      // console.log("Show Billing: ", nextBillingEnabled);

      setBillingEnabled(nextBillingEnabled)
      if (!nextBillingEnabled)
        toggleShowAmount(false)
    }
  }, [checkedParticipant])

  useEffect( () => {
    if (billingRunErrorMessage) {
      errorToast(billingRunErrorMessage);
    }
  }, [billingRunErrorMessage]);

  useEffect(() => {
    const sorted = participants.sort((a, b) => {
      const meterAOK = a.meters.reduce((i, m) => (m.status === 'ACTIVE') && i, true)
      const meterBOK = b.meters.reduce((i, m) => (m.status === 'ACTIVE') && i, true)

      if (a.status !== 'ACTIVE' && b.status === 'ACTIVE') {
        return -1
      }

      if (b.status !== 'ACTIVE' && a.status === 'ACTIVE') {
        return 1
      }

      if (b.status !== 'ACTIVE' || a.status !== 'ACTIVE') {
        if (meterAOK === meterBOK) {
          return 0
        } else if (!meterAOK && meterBOK) {
          return -1
        }
        return 1
      }

      if (meterAOK && !meterBOK) {
        return 1
      } else if (!meterAOK && meterBOK) {
        return -1
      }
      return 0
    })
    // setCheckedParticipant(sorted.map(() => false))
    const filteredAndSorted = filterMeters(sorted)
    setSortedParticipants(sorted);
    setResult(filteredAndSorted);
  }, [participants])

  useEffect(() => {
    const filteredAndSorted = filterMeters(sortedParticipants)
    setResult(filteredAndSorted);
  }, [hideConsumers, hideProducers]);

  const filterMeters = (p: EegParticipant[]) => {
    return p.map(ip => { return {...ip,
      meters: ip.meters.filter(m => {
        if (m.direction === 'GENERATION' && hideProducers)
          return false;
        if (m.direction === 'CONSUMPTION' && hideConsumers)
          return false;
        return true;
      })} as EegParticipant}).filter(m => m.meters.length > 0 || !(hideProducers || hideConsumers))
  }

  const infoToast = (message: string) => {
    toaster({
      message: message,
      duration: 3500,
      position: 'bottom',
    });
  };

  const errorToast = (message: string) => {
    toaster({
      message: message,
      duration: 3500,
      position: 'bottom',
      color: "danger"
    });
  };


  const buildAllocationMapFromSelected = ():MeteringEnergyGroupType[] => {
    const participantMap =
      participants.reduce((r, p) => ({...r, [p.id]: p}), {} as Record<string, EegParticipant>)

    // Object.entries(checkedParticipant).forEach(c => {if (!!participantMap[c[0]]) console.log("Checked Participant not in Map", c)} )

    return Object.entries(checkedParticipant).filter(c => participantMap[c[0]])
      .flatMap((r) => ([...participantMap[r[0]].meters.filter(m => m.tariff_id !== null)]))
      .map(m => { return {meteringPoint: m.meteringPoint, allocationKWh: energyMeterGroup[m.meteringPoint]} as MeteringEnergyGroupType})
  }

  const selectAll = (event: IonCheckboxCustomEvent<CheckboxChangeEventDetail>) => {
    participants.forEach((p) => {
      if (p.status === 'ACTIVE') {
        const tariffConfigured = p.meters.reduce((c, e) => c || (e.tariff_id !== undefined && e.tariff_id !==null), (p.tariffId !== undefined && p.tariffId != null))
        if (tariffConfigured) {
          setCheckedParticipant(p.id, event.detail.checked);
        }
      }
    })
  }

  const onCheckParticipant = (p: EegParticipant) => (e: CheckboxCustomEvent) => {
    if (p.status === 'ACTIVE') {
      setCheckedParticipant(p.id, e.detail.checked)
    }
  }
  const activateBilling = (c: boolean) => {
    if (c) {
      presentAlert({
        subHeader: "Abrechnungsmodus",
        message: "Du hast den Abrechnungsmodus aktiviert. Selektiere den Zeitraum den du abrechnen möchtest und wähle “Abrechnung erstellen”. Es werden automatisch alle Mitglieder gewählt, da du Einzelabrechnungen nur machen kannst wenn ein Mitglied die EEG verlässt. Eine genaue Aufstellung der Posten siehst erhältst du durch betätigen der Summe des jeweiligen Mitglieds.",
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
            if (activePeriod) {
              dispatcher(fetchBillingRun({
                tenant: tenant,
                clearingPeriodType: activePeriod.type,
                clearingPeriodIdentifier: createPeriodIdentifier(activePeriod.type,
                    activePeriod.year, activePeriod.segment)
              }))
            }
            toggleShowAmount(true);
          } else {
            toggleShowAmount(false);
          }
        },
      })
    } else {
      toggleShowAmount(false);
      setBillingEnabled(false);
    }
  }

  const onUpdatePeriodSelection = (selectedPeriod: SelectedPeriod) => {
    // dispatcher(fetchEnergyReport({
    //   tenant: tenant!,
    //   year: selectedPeriod.year,
    //   segment: selectedPeriod.segment,
    //   type: selectedPeriod.type,
    // }))

    dispatcher(setSelectedPeriod(selectedPeriod))
    // dispatcher(fetchEnergyReportV2({tenant: tenant,
    //   year: selectedPeriod.year,
    //   segment: selectedPeriod.segment,
    //   type: selectedPeriod.type,
    //   participants: participants.map(p => {
    //     return {
    //       participantId: p.id,
    //       meters: p.meters.map(m => {
    //         return {meterId: m.meteringPoint, meterDir: m.direction, from: new Date(m.registeredSince).getTime(), until: new Date().getTime()} as MeterReport})
    //     } as ParticipantReport
    //   })}))

    dispatcher(fetchBillingRun({
      tenant: tenant,
      clearingPeriodType : selectedPeriod.type,
      clearingPeriodIdentifier : createPeriodIdentifier(selectedPeriod.type,
          selectedPeriod.year, selectedPeriod.segment)
    }))

    // setUsedPeriod(idx)
  }

  const onSelectParticipant = (p: EegParticipant) => (e: React.MouseEvent<Element, MouseEvent>) => {
    dispatcher(selectParticipant(p.id))
    if (p.meters.length > 0) {
      dispatcher(selectMetering(p.meters[0].meteringPoint));
    }
    setShowAddMeterPane(false)
  }

  const onShowAddMeterPage = (p: EegParticipant) => (e: React.MouseEvent<HTMLIonButtonElement, MouseEvent>) => {
    dispatcher(selectParticipant(p.id))
    if (p.meters.length > 0) {
      dispatcher(selectMetering(p.meters[0].meteringPoint));
    }
    setShowAddMeterPane(true)
    e?.preventDefault()
    e?.stopPropagation()
  }

  const onSelectMeter = (e: React.MouseEvent<HTMLIonCardElement, MouseEvent>, participantId: string, meter: Metering) => {
    dispatcher(selectParticipant(participantId))
    dispatcher(selectMetering(meter.meteringPoint));
    e.stopPropagation();
    setShowAddMeterPane(false)
  }

  const billingSum = () => {
    if (billingInfo) {
      // const sum = billingInfo.reduce((i, s) => i + s.amount + s.meteringPoints.reduce((mi, ms) => mi + ms.amount, 0), 0)
      const sum = billingInfo.reduce((i, s) => i + s.participantFee + s.meteringPoints.reduce((mi, ms) => mi + ms.amount, 0), 0)
      return (Math.round(sum * 100) / 100).toFixed(2);
    }
    return 0
  }

  const dismiss = (range: [Date|null, Date|null]) => {
    const [startDate, endDate] = range
    if (startDate === null || endDate === null) {
      return
    }
  }

  const [reportPopover, dismissReport] = useIonPopover(DatepickerPopover, {
    tenant: tenant,
    onDismiss: (type: number, startDate: Date, endDate: Date) => {
      loading({message: "Daten exportieren ..."})
      onExport(type, [startDate, endDate])
        .then(b => {
          dismissReport([startDate, endDate], "")
          dismissLoading()
        })
        .catch((e) => {
          dismissReport(undefined)
          dismissLoading()
          errorToast("Export konnte nicht generiert werden." + e.toString())
        })
    }
  });

  const [uploadPopover, dismissUpload] = useIonPopover(UploadPopup, {
    tenant,
    onDismiss: (data: any, role: string) => dismissUpload(data, role)
  });

  const onExport = async (type: number, data: any) => {
    if (data && eeg) {
      if (type === 0) {
        const meta = selectMetaRecord(store.getState())
        const [start, end] = data
        const exportdata = {
          start: start.getTime(),
          end: end.getTime(),
          communityId: eeg.communityId,
          cps: filterActiveParticipantAndMeter(participants, start, end).reduce((r, p) =>
            r.concat(p.meters.filter(m=> m.status==="ACTIVE" && filterActiveMeter(meta, m, moment(start), moment(end)) ).map(m => {
              return {
                meteringPoint: m.meteringPoint,
                direction: m.direction,
                name: p.firstname + " " + p.lastname
              } as InvestigatorCP
            })), [] as InvestigatorCP[])
        } as ExcelReportRequest
        return eegService.createReport(tenant, exportdata)
      } else {
        return eegService.exportMasterdata(tenant)
      }
    }
  }

  const onImport = (data: any) => {
    if (data) {
      const [file, sheetName, type] = data
      if (file && file.length === 1 && sheetName) {
        switch (type) {
          case 0:
            loading({message: "Energiedaten importieren ..."})
            eegService.uploadEnergyFile(tenant, sheetName, file[0])
              .then(() => refresh())
              .then(() => dismissLoading())
              .then(() => infoToast("Energiedaten-Upload beendet."))
              .catch((e) => {
                errorToast("Energiedatenfile nicht korrekt. [" + e.toString()+"]")
                dismissLoading()
              })
            break
          case 1:
            loading({message: "Stammdaten importieren ..."})
            eegService.uploadMasterDataFile(tenant, sheetName, file[0])
              .then(() => refresh())
              .then(() => dismissLoading())
              .then(() => infoToast("Stammdaten-Upload beendet."))
              .catch((e) => {
                dismissLoading()
                errorToast("Stammdaten sind nicht korrekt. " + e.toString())
              })
            break;
        }
      }
    }
  }

  const onDoBilling = (preview : boolean, documentDate : Date) => {
    if (activePeriod) {
      documentDate?.setHours(12);
      const invoiceRequest = {
        allocations: buildAllocationMapFromSelected(),
        tenantId: tenant,
        preview: preview,
        clearingPeriodIdentifier: createPeriodIdentifier(activePeriod.type, activePeriod.year, activePeriod.segment),
        clearingPeriodType: activePeriod.type,
        clearingDocumentDate: documentDate? documentDate.toISOString().substring(0,10) : documentDate} as ClearingPreviewRequest;
      dispatcher(
        fetchEnergyBills({tenant, invoiceRequest}))
        .then((returnValue: any) => {
                              returnValue.payload.billing.abstractText =
                                'Abrechnung fehlgeschlagen: Cannot invoke "java.lang.Boolean.booleanValue()" because the return value of "org.vfeeg.eegfaktura.billing.domain.BillingMasterdata.getTariffUseVat()" is null';
            if (
              returnValue.payload.billing.abstractText
                .toString()
                .includes("Abrechnung fehlgeschlagen")
            ) {
              presentAlert({
                subHeader: "Fehler bei der Vorschauerstellung",
                message:
                  "Bei der Erstellung der Vorschau ist ein Fehler aufgetreten. Bitte prüfen Sie die Stammdaten und achten Sie vor allem darauf, bei allen Nutzern & Zählpunkten einen Tarif zu setzen. Wiederholen Sie den Vorgang, wenn allen Daten korrigiert wurden.",
                buttons: ["OK"],
              });
            }
            dispatcher(fetchBillingRun({
              tenant: tenant,
              clearingPeriodType: activePeriod.type,
              clearingPeriodIdentifier: createPeriodIdentifier(activePeriod.type,
                activePeriod.year, activePeriod.segment)
            }))

          }
        );
    }
  }

  const onUpdateDocumentDate = (name: string, value: any) => {
    if (name === "documentDatePreview") documentDatePreview = value;
    if (name === "documentDateBilling") documentDateBilling = value;
  }

  async function sendBilling (billingRunId : string) {
    if (billingRunId) {
      dispatcher(
        billingRunSendmail( {tenant, billingRunId}))
        .then(() => {
          dispatcher(fetchBillingRunById({tenant, billingRunId }));
        })
    }
  }

  async function exportBillingExcel(billingRunId: string) {
    try {
      await eegService.exportBillingExcel(tenant, billingRunId);
    } catch (e) {
      console.log(e as string)
    }
  }

  async function exportBillingArchive(billingRunId: string) {
    try {
      await eegService.exportBillingArchive(tenant, billingRunId);
    } catch (e) {
      console.log(e as string)
    }
  }

  const handleSearchInput = (ev: Event) => {
    let query = '';
    const target = ev.target as HTMLIonSearchbarElement;
    if (target) query = target.value!.toLowerCase();

    if (query && query.length > 0) {
      const filterEntries = (d: EegParticipant) => {
        return [d.lastname.toLowerCase().indexOf(query) > -1 || d.firstname.toLowerCase().indexOf(query) > -1, filterMetering(d)]
      }
      const filterMetering = (d: EegParticipant) => {
        return d.meters.find(m => {

          const eq = (m.equipmentName && m.equipmentName.length > 0) ? m.equipmentName.toLowerCase().indexOf(query) > -1 : false
          console.log(eq)
          return m.meteringPoint.toLowerCase().indexOf(query) > -1 || eq
        }) !== undefined
      }

      const origin = JSON.parse(JSON.stringify(sortedParticipants)) as EegParticipant[]

      const sp = origin.filter((d: EegParticipant) => {
        const [matchParticipant, matchMeter] = filterEntries(d)
        if (matchParticipant || matchMeter) {
          if (matchMeter) {
            d.meters = d.meters.filter(m => {
              const eq = (m.equipmentName && m.equipmentName.length > 0) ? m.equipmentName.toLowerCase().indexOf(query) > -1 : false
              return m.meteringPoint.toLowerCase().indexOf(query) > -1 || eq
            })
          }
          return true
        }
        return false
      })
      setResult(sp)
    } else {
      setResult(sortedParticipants)
    }
    // setResult(sortedParticipants.filter((d) => filterEntries(d)));
  };

  const popoverRef = useRef<HTMLIonToolbarElement>(null)
  return (
    <div className={"participant-pane"}>
      <div className={"pane-body"}>
        {/*<DatepickerComponent range={dismiss} trigger="open-datepicker-dialog" />*/}
        <div className={"pane-content"}>
          <IonToolbar
            color="eeglight"
            style={{ "--min-height": "56px" }}
            ref={popoverRef}
          >
            <IonButtons slot="end">
              <IonButton
                // id="open-datepicker-dialog"
                color="primary"
                shape="round"
                fill={"solid"}
                style={{
                  "--border-radius": "50%",
                  width: "36px",
                  height: "36px",
                  marginRight: "16px",
                }}
                onClick={() => setSearchActive(!searchActive)}
              >
                <IonIcon slot="icon-only" icon={search}></IonIcon>
              </IonButton>
              {eeg && !eeg.online && (
                <IonButton
                  color="primary"
                  shape="round"
                  fill={"solid"}
                  aria-label="Favorite"
                  style={{
                    "--border-radius": "50%",
                    width: "36px",
                    height: "36px",
                    marginRight: "16px",
                  }}
                  onClick={(e: any) =>
                    uploadPopover({
                      event: e,
                      size: "auto",
                      side: "bottom",
                      alignment: "start",
                      cssClass: "upload-popover",
                      onDidDismiss: (e: CustomEvent) => onImport(e.detail.data),
                    })
                  }
                >
                  <IonIcon slot="icon-only" icon={cloudUploadOutline}></IonIcon>
                </IonButton>
              )}
              <IonButton
                // id="open-datepicker-dialog"
                color="primary"
                shape="round"
                fill={"solid"}
                style={{
                  "--border-radius": "50%",
                  width: "36px",
                  height: "36px",
                  marginRight: "16px",
                }}
                onClick={(e: any) =>
                  reportPopover({
                    event: e,
                    size: "auto",
                    side: "bottom",
                    alignment: "start",
                    cssClass: "upload-popover",
                    // onDidDismiss: (e: CustomEvent) => onExport(e.detail.data),
                  })
                }
              >
                <IonIcon slot="icon-only" icon={downloadOutline}></IonIcon>
              </IonButton>
              <IonButton
                color="primary"
                shape="round"
                fill={"solid"}
                style={{
                  "--border-radius": "50%",
                  width: "36px",
                  height: "36px",
                  marginRight: "16px",
                }}
                routerLink="/page/addParticipant"
                routerDirection="root"
              >
                <IonIcon slot="icon-only" icon={add}></IonIcon>
              </IonButton>
            </IonButtons>
          </IonToolbar>
          {searchActive &&
              <IonToolbar>
                <IonSearchbar
                    style={{"--box-shadow": "undefined"}}
                    debounce={500} onIonInput={(ev) => handleSearchInput(ev)}>
                </IonSearchbar>
              </IonToolbar>}
          <ParticipantPeriodHeaderComponent activePeriod={activePeriod} selectAll={selectAll}
                                            onUpdatePeriod={onUpdatePeriodSelection}/>


          {result.map((p, idx) => {
            if (p.meters.length > 0) {
              return (
                <div
                  key={idx}
                  onClick={onSelectParticipant(p)}
                  className={cn("participant", {
                    selected: p.id === selectedParticipant?.id,
                  })}
                >
                  <MemberComponent
                    participant={p}
                    onCheck={onCheckParticipant(p)}
                    isChecked={
                      checkedParticipant && (checkedParticipant[p.id] || false)
                    }
                    hideMeter={hideMeter}
                    hideMember={hideMember}
                    showAmount={showAmount}
                    showDetailsPage={showDetailsPage}
                    onShowAddMeterPage={onShowAddMeterPage}
                  >
                    {hideMeter ||
                      p.meters.map((m, i) => (
                        <MeterCardComponent
                          key={"meter" + i}
                          participant={p}
                          meter={m}
                          hideMeter={false}
                          showCash={showAmount}
                          onSelect={onSelectMeter}
                          isSelected={m.meteringPoint === selectedMeterId}
                        />
                      ))}
                  </MemberComponent>
                </div>
              );
            } else {
              return (
                <div
                  key={idx}
                  onClick={onSelectParticipant(p)}
                  className={cn("participant", {
                    selected: p.id === selectedParticipant?.id,
                  })}
                >
                  <MemberComponent
                    participant={p}
                    onCheck={onCheckParticipant(p)}
                    isChecked={
                      checkedParticipant && (checkedParticipant[p.id] || false)
                    }
                    hideMeter={hideMeter}
                    hideMember={hideMember}
                    showAmount={showAmount}
                    showDetailsPage={showDetailsPage}
                    onShowAddMeterPage={onShowAddMeterPage}
                  />
                </div>
              );
            }
          })}
        </div>
        <div className={"pane-footer"}>
          {showAmount && (
            <div>
              <IonRow>
                <IonCol>
                  <IonItem lines="none">
                    <IonLabel slot="end">
                      Gesamte EEG: {billingSum()} €
                    </IonLabel>
                  </IonItem>
                </IonCol>
              </IonRow>
              <IonRow>
                <IonCol size="12">
                  {billingRunIsFetching ||
                    (selectBillIsFetching && (
                      <IonSpinner name="dots"></IonSpinner>
                    ))}
                  {!billingRunIsFetching && !billingRun && (
                    <>
                      <DatePickerCoreElement
                        initialValue={documentDatePreview}
                        name={"documentDatePreview"}
                        label="Rechnungsdatum"
                        placeholder={"Datum"}
                        onChange={onUpdateDocumentDate}
                      />
                      <IonButton
                        expand="block"
                        disabled={activePeriod === undefined}
                        onClick={() => onDoBilling(true, documentDatePreview)}
                      >{`VORSCHAU ERSTELLEN`}</IonButton>
                    </>
                  )}
                  {!billingRunIsFetching && billingRunStatus === "NEW" && (
                    <>
                      {"Vorschau (" +
                        reformatDateTimeStamp(billingRun.runStatusDateTime) +
                        ")"}
                      <DatePickerCoreElement
                        initialValue={documentDateBilling}
                        name={"documentDateBilling"}
                        label="Rechnungsdatum"
                        placeholder={"Datum"}
                        onChange={onUpdateDocumentDate}
                      />

                      <IonButton 
                        disabled={activePeriod === undefined}
                        onClick={() => onDoBilling(true, documentDateBilling)}
                      >{`Vorschau Akt.`}
                      <IonIcon slot="end" icon={reloadCircleOutline}></IonIcon>
                      </IonButton>
                      <IonButton
                        onClick={() => exportBillingArchive(billingRun.id)}
                      >
                        <IonIcon slot="end" icon={archiveOutline}></IonIcon>
                        {"ZIP"}
                      </IonButton>
                      <IonButton 
                        onClick={() => exportBillingExcel(billingRun.id)}
                      >
                        <IonIcon
                          slot="end"
                          icon={documentTextOutline}
                        ></IonIcon>
                        {"EXCEL"}
                      </IonButton>
                      <IonButton
                        expand="block"
                        disabled={activePeriod === undefined}
                        onClick={() => onDoBilling(false, documentDateBilling)}
                      >{`ABRECHNUNG DURCHFÜHREN (${billingInfo.length})`}</IonButton>
                    </>
                  )}
                  {!billingRunIsFetching && billingRunStatus === "DONE" && (
                    <>
                      <div>
                        {billingRun.mailStatus === "SENT"
                          ? "Versendet (" +
                            reformatDateTimeStamp(
                              billingRun.mailStatusDateTime
                            ) +
                            ")"
                          : "Abgerechnet (" +
                            reformatDateTimeStamp(
                              billingRun.runStatusDateTime
                            ) +
                            ")"}
                      </div>
                      <div>
                        <IonButton id="confirm-send">
                          <IonIcon slot="end" icon={mailOutline}></IonIcon>
                          {"SENDEN"}
                        </IonButton>
                        <IonAlert
                          header="SENDEN"
                          subHeader="Mit Klick auf OK versenden Sie alle Abrechnungsdokumente per E-Mail."
                          trigger="confirm-send"
                          buttons={[
                            {
                              text: "Abbrechen",
                              role: "cancel",
                            },
                            {
                              text: "OK",
                              role: "confirm",
                              handler: () => {
                                sendBilling(billingRun.id);
                              },
                            },
                          ]}
                        ></IonAlert>
                        <IonButton
                          onClick={() => exportBillingArchive(billingRun.id)}
                        >
                          <IonIcon slot="end" icon={archiveOutline}></IonIcon>
                          {"DOWNLOAD"}
                        </IonButton>
                        <IonButton
                          onClick={() => exportBillingExcel(billingRun.id)}
                        >
                          <IonIcon
                            slot="end"
                            icon={documentTextOutline}
                          ></IonIcon>
                          {"EXCEL"}
                        </IonButton>
                      </div>
                    </>
                  )}
                </IonCol>
              </IonRow>
            </div>
          )}
          <div className={"button-bar"}>
            <div style={{ marginLeft: "20px" }}>
              <SlideButtonComponent
                checked={showAmount}
                disabled={!billingEnabled}
                setChecked={(c) => activateBilling(c)}
              ></SlideButtonComponent>
            </div>
            <div
              style={{
                marginRight: "20px",
                display: "flex",
                flexDirection: "row",
              }}
            >
              <div style={{ marginRight: "10px" }}>
                <ButtonGroup
                  buttons={[
                    {
                      icon: <IonIcon slot="icon-only" icon={person}></IonIcon>,
                    },
                    { icon: <IonIcon slot="icon-only" icon={flash}></IonIcon> },
                  ]}
                  onChange={toggleMembersMeter}
                />
              </div>
              <div>
                <ButtonGroup
                  buttons={[
                    {
                      icon: (
                        <IonIcon slot="icon-only" icon={eegSolar}></IonIcon>
                      ),
                    },
                    {
                      icon: <IonIcon slot="icon-only" icon={eegPlug}></IonIcon>,
                    },
                  ]}
                  onChange={toggleMetering}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ParticipantPaneComponent;