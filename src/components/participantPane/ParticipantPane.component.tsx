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
  SearchbarInputEventDetail,
  useIonAlert,
  useIonLoading, useIonModal,
  useIonPopover,
  useIonToast,
} from "@ionic/react";
import {CheckboxChangeEventDetail} from "@ionic/core";
import {IonCheckboxCustomEvent} from "@ionic/core/dist/types/components";
import {createPeriodIdentifier, SelectedPeriod,} from "../../models/energy.model";
import ParticipantPeriodHeaderComponent from "./ParticipantPeriodHeader.component";
import MemberComponent from "./Member.component";
import {ClearingPreviewRequest, Metering,} from "../../models/meteringpoint.model";
import MeterCardComponent from "./MeterCard.component";
import {ParticipantContext} from "../../store/hook/ParticipantProvider";
import {MemberViewContext} from "../../store/hook/MemberViewProvider";

import "./ParticipantPane.component.scss";
import SlideButtonComponent from "../SlideButton.component";
import {store, useAppDispatch, useAppSelector} from "../../store";
import {
  billingSelector,
  fetchEnergyBills,
  fetchParticipantAmounts,
  resetParticipantAmounts,
  selectBillFetchingSelector,
} from "../../store/billing";
import {selectMetaRecord, setSelectedPeriod,} from "../../store/energy";
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
  search,
} from "ionicons/icons";
import {eegPlug, eegSolar} from "../../eegIcons";
import {
  allParticipantsSelector,
  selectedMeterIdSelector,
  selectedParticipantSelector,
  selectMetering,
  selectParticipant,
} from "../../store/participant";
import cn from "classnames";
import {isParticipantActivated, reformatDateTimeStamp,} from "../../util/Helper.util";
import DatepickerPopover from "../dialogs/datepicker.popover";
import {ExcelReportRequest, ParticipantCp} from "../../models/reports.model";
import UploadPopup from "../dialogs/upload.popup";
import {EegContext, useRefresh, useTenant} from "../../store/hook/Eeg.provider";
import {
  billingRunErrorSelector,
  billingRunIsFetchingSelector,
  billingRunSelector,
  billingRunSendmail,
  billingRunStatusSelector,
  fetchBillingRun,
  fetchBillingRunById,
} from "../../store/billingRun";
import DatePickerCoreElement from "../core/elements/DatePickerCore.element";

import {filterActiveMeter, filterActiveParticipantAndMeter,} from "../../util/FilterHelper.unit";
import moment from "moment";
import {Api} from "../../service";
import {buildAllocationMapFromSelected, filterSearchQuery} from "./ParticipantPane.functions";
import {filterParticipant, sortParticipants} from "./ParticipantPane.effects";
import FilterSegmentComponent from "./FilterSegment.component";
import {VariableSizeList} from "react-window";

import HeaderFavButtonComponent from "../core/HeaderFavButton.component";
import {Virtuoso} from "react-virtuoso";
import {types} from "sass";
import {DownloadBillingDialog} from "./DownloadBilling.dialog";

const ParticipantPaneComponent: FC = () => {
  const dispatcher = useAppDispatch();
  const {tenant, ecId, rcNr} = useTenant()

  const selectedParticipant = useAppSelector(selectedParticipantSelector);
  const selectedMeterId = useAppSelector(selectedMeterIdSelector);
  const billingInfo = useAppSelector(billingSelector);

  const billingRun = useAppSelector(billingRunSelector);
  const billingRunStatus = useAppSelector(billingRunStatusSelector);
  const billingRunIsFetching = useAppSelector(billingRunIsFetchingSelector);
  const selectBillIsFetching = useAppSelector(selectBillFetchingSelector);
  const billingRunErrorMessage = useAppSelector(billingRunErrorSelector);

  const {eeg} = useContext(EegContext)

  let documentDatePreview: Date = new Date();
  let documentDateBilling: Date = new Date();

  const [loading, dismissLoading] = useIonLoading();

  const {refresh} = useRefresh();

  const [toaster] = useIonToast();

  const {
    participants,
    allParticipants,
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
    hideMember,
  } = useContext(MemberViewContext);

  const [presentAlert] = useIonAlert();

  const [searchQuery, setSearchQuery] = useState<string | undefined>(undefined)
  const [searchActive, setSearchActive] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState<string>('period');
  const [downloadBillingId, setDownloadBillingId] = useState<string | undefined>();

  const [billingDownload, billingDownloadDismiss] = useIonModal(DownloadBillingDialog, {
    billingRunId: downloadBillingId,
    period: activePeriod,
    tenant: tenant,
    eeg: eeg,
    onDismiss: (data: string, role: string) => {
      setDownloadBillingId(undefined);
      billingDownloadDismiss(data, role)
    },
  });

  const openBillingDownloadDialog = (billingRunId: string)=> {
    setDownloadBillingId(billingRunId)
    billingDownload()
  }

  useEffect(() => {
    if (showAmount && billingRun && billingRun.id) {
      dispatcher(
        fetchParticipantAmounts({tenant: tenant, billingRunId: billingRun.id})
      );
    }
    if (showAmount && !billingRun) {
      dispatcher(resetParticipantAmounts());
    }
  }, [billingRun, showAmount]);

  useEffect(() => {
    if (checkedParticipant) {
      const nextBillingEnabled = Object.entries(checkedParticipant).reduce(
        (r, e) => (isParticipantActivated(participants, e[0]) && e[1]) || r,
        false
      );
      setBillingEnabled(nextBillingEnabled);
      if (!nextBillingEnabled) toggleShowAmount(false);
    }
  }, [checkedParticipant]);

  useEffect(() => {
    if (billingRunErrorMessage) {
      errorToast(billingRunErrorMessage)
    }
  }, [billingRunErrorMessage])

  const sortedParticipants1 = sortParticipants({participants, hideProducers, hideConsumers})

  const viewEntities = filterParticipant({
    selectedFilter,
    sortedParticipants: sortedParticipants1,
    participants: allParticipants,
    hideConsumers,
    hideProducers,
    hideMeter
  })

  const infoToast = (message: string) => {
    toaster({
      message: message,
      duration: 3500,
      position: "bottom",
    })
  }

  const errorToast = (message: string) => {
    toaster({
      message: message,
      duration: 4500,
      position: "bottom",
      color: "danger",
    });
  };

  const selectAll = (event: IonCheckboxCustomEvent<CheckboxChangeEventDetail>) => {
    participants.forEach((p) => {
      if (p.status === "ACTIVE") {
        const tariffConfigured =
          p.meters.reduce((c, e) => c || (e.tariff_id !== undefined && e.tariff_id !== null && e.status !== 'INIT'),
            p.tariffId !== undefined && p.tariffId != null);
        if (tariffConfigured) {
          setCheckedParticipant(p.id, event.detail.checked);
        }
      }
    });
  };

  const onCheckParticipant = (p: EegParticipant) => (e: CheckboxCustomEvent) => {
    if (p.status === "ACTIVE") {
      setCheckedParticipant(p.id, e.detail.checked);
    }
  };

  const activateBilling = (c: boolean) => {
    if (c) {
      presentAlert({
        subHeader: "Abrechnungsmodus",
        message:
          "Wenn Du „OK“ wählst, werden Rechnungsentwürfe erstellt, die beim jeweiligen Mitglied mit dem Zusatz „VORSCHAU“ abgelegt werden. Weiters kann eine Rechnungszusammenstellung als Excel-Datei und alle Rechnungen gesammelt als Zip-Datei erstellt und runtergeladen werden. Werden nun Änderungen bei den Stammdaten, Energiedaten oder Tarifdaten durchgeführt, so kann mit der Funktion „Vorschau aktualisieren“ beliebig oft Optimierung und Änderungen an den Rechnungen durchgeführt werden.",
        buttons: [
          {
            text: "Cancel",
            role: "cancel",
          },
          {
            text: "OK",
            role: "confirm",
          },
        ],
        onDidDismiss: (e: CustomEvent) => {
          if (e.detail.role === "confirm") {
            if (activePeriod) {
              dispatcher(
                fetchBillingRun({
                  tenant: tenant,
                  clearingPeriodType: activePeriod.type,
                  clearingPeriodIdentifier: createPeriodIdentifier(
                    activePeriod.type,
                    activePeriod.year,
                    activePeriod.segment
                  ),
                })
              );
            }
            toggleShowAmount(true);
          } else {
            toggleShowAmount(false);
          }
        },
      });
    } else {
      toggleShowAmount(false);
      setBillingEnabled(false);
    }
  };

  const onUpdatePeriodSelection = (selectedPeriod: SelectedPeriod) => {
    dispatcher(setSelectedPeriod(selectedPeriod));
    dispatcher(
      fetchBillingRun({
        tenant: tenant,
        clearingPeriodType: selectedPeriod.type,
        clearingPeriodIdentifier: createPeriodIdentifier(
          selectedPeriod.type,
          selectedPeriod.year,
          selectedPeriod.segment
        ),
      })
    );
  };

  const onSelectParticipant =
    (p: EegParticipant) => (e: React.MouseEvent<Element, MouseEvent>) => {
      dispatcher(selectParticipant(p.id));
      if (p.meters.length > 0) {
        dispatcher(selectMetering(p.meters[0].meteringPoint));
      }
      setShowAddMeterPane(false);
    };

  const onShowAddMeterPage = (p: EegParticipant) => (e: React.MouseEvent<HTMLIonButtonElement, MouseEvent>) => {
    dispatcher(selectParticipant(p.id));
    if (p.meters.length > 0) {
      dispatcher(selectMetering(p.meters[0].meteringPoint));
    }
    setShowAddMeterPane(true);
    e.preventDefault();
    e.stopPropagation();
  };

  const onSelectMeter = (
    e: React.MouseEvent<HTMLIonCardElement, MouseEvent>,
    participantId: string,
    meter: Metering
  ) => {
    dispatcher(selectParticipant(participantId));
    dispatcher(selectMetering(meter.meteringPoint));
    e.stopPropagation();
    setShowAddMeterPane(false);
  };

  const billingSum = () => {
    if (billingInfo) {
      // const sum = billingInfo.reduce((i, s) => i + s.amount + s.meteringPoints.reduce((mi, ms) => mi + ms.amount, 0), 0)
      const sum = billingInfo.reduce(
        (i, s) =>
          i +
          s.participantFee +
          s.meteringPoints.reduce((mi, ms) => mi + ms.amount, 0),
        0
      );
      return (Math.round(sum * 100) / 100).toFixed(2);
    }
    return 0;
  };

  const dismiss = (range: [Date | null, Date | null]) => {
    const [startDate, endDate] = range;
    if (startDate === null || endDate === null) {
      return;
    }
  };

  const [reportPopover, dismissReport] = useIonPopover(DatepickerPopover, {
    tenant: tenant,
    onDismiss: (type: number, startDate: Date, endDate: Date) => {
      loading({message: "Daten exportieren ..."});
      onExport(type, [startDate, endDate])
        .then(_ => {
          dismissReport([startDate, endDate], "");
          return dismissLoading();
        })
        .catch(e => {
          dismissReport(undefined);
          dismissLoading().then(_ => errorToast("Export konnte nicht generiert werden." + e.toString()));
        });
    },
  });

  const [uploadPopover, dismissUpload] = useIonPopover(UploadPopup, {
    tenant: tenant,
    online: (eeg ? eeg.online : false),
    onDismiss: (data: any, role: string) => dismissUpload(data, role),
  });

  const onExport = async (type: number, data: any) => {
    if (data && eeg) {
      if (type === 0) {
        const ap = allParticipantsSelector(store.getState())
        const meta = selectMetaRecord(store.getState())
        const [start, end] = data as [Date, Date]
        const _end = moment(end).add(1, 'day');
        const exportdata = {
          start: start.getTime(),
          end: end.getTime(),
          communityId: eeg.communityId,
          cps: filterActiveParticipantAndMeter(ap, start, end).filter(p => p.meters.length > 0).reduce(
            (r, p) =>
              r.concat(
                p.meters
                  .filter(
                    (m) =>
                      (m.status === "ACTIVE" || m.status === 'INACTIVE') &&
                      filterActiveMeter(meta, m, moment(start), moment(_end))
                  )
                  .map((m) => {
                    return {
                      meteringPoint: m.meteringPoint,
                      direction: m.direction,
                      name: p.firstname + " " + p.lastname,
                      activeSince: moment(m.participantState.activeSince).valueOf(),
                      inactiveSince: moment(m.participantState.inactiveSince).valueOf(),
                    } as ParticipantCp;
                  })
              ),
            [] as ParticipantCp[]
          ),
        } as ExcelReportRequest
        return Api.energyService.createReport({tenant, ecId, rcNr}, exportdata);
      } else {
        return Api.eegService.exportMasterdata(tenant);
      }
    }
  };

  const onImport = (data: any) => {
    if (data) {
      const [file, sheetName, type] = data;
      if (file && file.length === 1 && sheetName) {
        switch (type) {
          case 1:
            loading({message: "Energiedaten importieren ..."});
            Api.energyService
              .uploadEnergyFile({tenant, ecId, rcNr}, sheetName, file[0])
              .then(() => refresh())
              .then(() => dismissLoading())
              .then(() => infoToast("Energiedaten-Upload beendet."))
              .catch((e) => {
                errorToast(
                  "Energiedatenfile nicht korrekt. [" + e.toString() + "]"
                );
                dismissLoading();
              });
            break;
          case 0:
            loading({message: "Stammdaten importieren ..."});
            Api.eegService
              .uploadMasterDataFile(tenant, sheetName, file[0])
              .then(() => refresh())
              .then(() => dismissLoading())
              .then(() => infoToast("Stammdaten-Upload beendet."))
              .catch((e) => {
                dismissLoading();
                errorToast("Stammdaten sind nicht korrekt. " + e.toString());
              });
            break;
        }
      }
    }
  };

  const [previewValid, setPreviewValid] = useState(true);
  const onDoBilling = (preview: boolean, documentDate: Date) => {
    if (activePeriod) {
      documentDate?.setHours(12);
      const invoiceRequest = {
        allocations: buildAllocationMapFromSelected(participants, checkedParticipant),
        tenantId: tenant,
        preview: preview,
        clearingPeriodIdentifier: createPeriodIdentifier(
          activePeriod.type,
          activePeriod.year,
          activePeriod.segment
        ),
        clearingPeriodType: activePeriod.type,
        clearingDocumentDate: documentDate
          ? documentDate.toISOString().substring(0, 10)
          : documentDate,
      } as ClearingPreviewRequest;
      dispatcher(fetchEnergyBills({tenant, invoiceRequest})).then((returnValue: any) => {
        if (
          returnValue.payload.billing.abstractText
            .toString()
            .includes("Abrechnung fehlgeschlagen")
          //"erfolgreich abgeschlossen."
          //Abrechnung fehlgeschlagen
        ) {
          setPreviewValid(false);
          presentAlert({
            subHeader: "Fehler bei der Vorschauerstellung",
            message:
              "Bei der Erstellung der Vorschau ist ein Fehler aufgetreten. Bitte prüfen Sie die Stammdaten und achten Sie vor allem darauf, bei allen Nutzern & Zählpunkten einen Tarif zu setzen. Wiederholen Sie den Vorgang, wenn allen Daten korrigiert wurden.",
            buttons: ["OK"],
          });
        } else {
          setPreviewValid(true);
          dispatcher(
            fetchBillingRun({
              tenant: tenant,
              clearingPeriodType: activePeriod.type,
              clearingPeriodIdentifier: createPeriodIdentifier(
                activePeriod.type,
                activePeriod.year,
                activePeriod.segment
              ),
            })
          );
        }
        // console.log("Valid 2 : ", previewValid);
        // var temp = activePeriod === undefined || !previewValid;
        //
        // console.log("res : ", temp);
      });
    }
  };

  const onUpdateDocumentDate = (name: string, value: any) => {
    if (name === "documentDatePreview") documentDatePreview = value;
    if (name === "documentDateBilling") documentDateBilling = value;
  };

  async function sendBilling(billingRunId: string) {
    if (billingRunId) {
      dispatcher(billingRunSendmail({tenant, billingRunId})).then(() => {
        dispatcher(fetchBillingRunById({tenant, billingRunId}));
      });
    }
  }

  async function exportBillingExcel(billingRunId: string) {
    if (eeg?.accountInfo.sepa) {
      openBillingDownloadDialog(billingRunId)
    } else {
      try {
        await Api.eegService.exportBillingExcel(tenant, billingRunId);
      } catch (e) {
        console.log(e as string);
      }
    }
  }

  async function exportBillingArchive(billingRunId: string) {
    try {
      await Api.eegService.exportBillingArchive(tenant, billingRunId);
    } catch (e) {
      console.log(e as string);
    }
  }

  // const viewPortRef = useRef<HTMLDivElement | null>(null);
  const viewPortRef = useRef(null);
  // const listRef = useRef<ViewportListRef | null>(null);
  const listRef = useRef<VariableSizeList>(null);
  const rowHeights = useRef<Record<number, number>>({});
  const popoverRef = useRef<HTMLIonToolbarElement>(null);

  const handleSearchInput = (e: CustomEvent<SearchbarInputEventDetail>) => {
    setSearchQuery(e.detail.value?.toLowerCase())
  };

  // // const handleSearchClear = (e:  IonSearchbarCustomEvent<void>) => {
  // //   if (selectedParticipant) {
  // //     const p_idx = findIndexInParticipantList(viewEntities, selectedParticipant.id)
  // //     console.log("Handle Search Clear", selectedParticipant, p_idx, viewEntities)
  // //     if (p_idx < 0) {
  // //       listRef.current?.scrollToIndex({index: 0, offset: p_idx})
  // //     }
  // //   }
  // // }
  //
  // const findIndexInParticipantList = (viewEntities: EegParticipant[], participantId: string) => {
  //   return viewEntities.findIndex(v => v.id === participantId)
  // }

  const viewPortItems = filterSearchQuery(viewEntities, searchQuery)

  const setRowHeight = (index: number, size: number) => {
    // listRef.current?.resetAfterIndex(0);
    console.log("setRowHeight", index, size)
    rowHeights.current = {...rowHeights.current, [index]: size};
  }

  const getRowHeight = (index: number) => {
    if (rowHeights.current) {
      console.log("getRowHeight", index, rowHeights.current[index] + 8 || 82)
      return rowHeights.current[index] + 8 || 82;
    }
    console.log("getRowHeight", index, "Default 200")
    return 200
  }


  const RowElement: FC<{ participant: EegParticipant }> = ({participant}) => {
    const command = participant
    if (command.meters.length > 0) {
      return (
        <div
          key={command.id}
          onClick={onSelectParticipant(command)}
          className={cn("participant", {
            selected: command.id === selectedParticipant?.id,
          })}
        >
          <MemberComponent
            participant={command}
            onCheck={onCheckParticipant(command)}
            isChecked={
              checkedParticipant && (checkedParticipant[command.id] || false)
            }
            hideMeter={hideMeter}
            hideMember={hideMember}
            showAmount={showAmount}
            showDetailsPage={showDetailsPage}
            onShowAddMeterPage={onShowAddMeterPage}
          >
            {hideMeter ||
              command.meters.map((m, i) => (
                <MeterCardComponent
                  key={"meter" + i}
                  participant={command}
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
          key={command.id}
          onClick={onSelectParticipant(command)}
          className={cn("participant", {
            selected: command.id === selectedParticipant?.id,
          })}
        >
          <MemberComponent
            participant={command}
            onCheck={onCheckParticipant(command)}
            isChecked={
              checkedParticipant && (checkedParticipant[command.id] || false)
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
  }

  const [isScrolling, setIsScrolling] = useState<boolean>(false)
  return (
    <div className={"participant-pane"}>
      <div className={"pane-body"}>
        {/*<DatepickerComponent range={dismiss} trigger="open-datepicker-dialog" />*/}
        <div className={"pane-content"}>
          <IonToolbar
            color="eeglight"
            style={{"--min-height": "56px"}}
            ref={popoverRef}
          >
            <IonButtons slot="end">
              <HeaderFavButtonComponent icon={search} onClick={() => setSearchActive(!searchActive)}/>
              {/*{eeg && !eeg.online && (*/}
              <HeaderFavButtonComponent icon={cloudUploadOutline} onClick={(e: any) =>
                uploadPopover({
                  event: e,
                  size: "auto",
                  side: "bottom",
                  alignment: "start",
                  cssClass: "upload-popover",
                  onDidDismiss: (e: CustomEvent) => onImport(e.detail.data),
                })
              }/>
              {/*)}*/}
              <HeaderFavButtonComponent icon={downloadOutline} onClick={(e: any) =>
                reportPopover({
                  event: e,
                  size: "auto",
                  side: "bottom",
                  alignment: "start",
                  cssClass: "upload-popover",
                  // onDidDismiss: (e: CustomEvent) => onExport(e.detail.data),
                })}/>
              <HeaderFavButtonComponent icon={add} routerLink="/page/addParticipant" routerDirection="root"/>
            </IonButtons>
          </IonToolbar>
          {searchActive && (
            <IonToolbar>
              <IonSearchbar
                style={{"--box-shadow": "undefined"}}
                debounce={500}
                onIonInput={handleSearchInput}
                // onIonClear={handleSearchClear}
              ></IonSearchbar>
            </IonToolbar>
          )}
          <FilterSegmentComponent selectedOption={selectedFilter} setSelectedOption={setSelectedFilter}/>
          <ParticipantPeriodHeaderComponent
            activePeriod={activePeriod}
            selectAll={selectAll}
            onUpdatePeriod={onUpdatePeriodSelection}
          />
          {/*<div className={"scroll-container"} ref={viewPortRef}>*/}
          {/*<AutoSizer className={"scroll-container"} disableWidth={false}>*/}
          {/*  {({ height, width }) => (*/}
          {/*    <VariableSizeList*/}
          {/*      className="List"*/}
          {/*      height={height - 74}*/}
          {/*      itemCount={viewPortItems.length}*/}
          {/*      itemSize={getRowHeight}*/}
          {/*      ref={listRef}*/}
          {/*      width={width}*/}
          {/*    >*/}
          {/*      {ListRow}*/}
          {/*    </VariableSizeList>*/}
          {/*  )}*/}
          {/*</AutoSizer>*/}
          {/*  <AutoSizer disableWidth={true}>*/}
          {/*    {({ height }) => {*/}
          {/*      console.log("Autosizer: ", height)*/}
          {/*      return(*/}
          {/*  <ViewportList*/}

          {/*    viewportRef={viewPortRef}*/}
          {/*    items={viewPortItems}*/}
          {/*    itemSize={Math.max(1, height / viewPortItems.length)}>*/}
          {/*    {(item) => (*/}
          {/*      <RowElement key={item.id} participant={item}/>*/}
          {/*    )}*/}
          {/*  </ViewportList>*/}
          {/*      )}}*/}
          {/*      </AutoSizer>*/}
          {/*</div>*/}
          {viewPortItems.length > 0 &&
          <Virtuoso style={{overflowX: "hidden"}}
            // ref={listRef}
            // viewportRef={viewPortRef}
                    context={{isScrolling}}
                    isScrolling={setIsScrolling}
                    totalCount={viewPortItems.length}
                    itemSize={(el, field) => {
                      const index = parseInt(el.getAttribute("data-index") ?? "0");
                      if (viewPortItems[index]) {
                        const mp = /*hideMeter || hideMember ? 0 : */viewPortItems[index].meters.length
                        // console.log("ItemSize", el.scrollHeight, el.offsetHeight, h, el.getBoundingClientRect().height, el, field, hideMeter, hideMember, hideConsumers, hideProducers)
                        return el.offsetHeight === 0
                          ? (hideMeter ? 0 : mp * 65) + (hideMember ? 0 : 55)
                          : el.offsetHeight
                      }
                      console.log("ViewPortItems undefined", index, viewPortItems.length)
                      return 200
                    }}
            // data={viewPortItems}
            // initialPrerender={10}
            // initialIndex={9}
            // initialOffset={100}
            // itemSize={viewPortItems.length}
            // initialAlignToTop={false}
            // overscan={10}
            // withCache={false}
            // itemMargin={8}
                    itemContent={(index, _, {isScrolling}) => {
                      const command = viewPortItems[index];
                      // if (isScrolling) {
                      //   return (
                      //     <div style={{height: "200px", width: "100%"}}></div>
                      //   )
                      // }
                      if (command.meters.length > 0) {
                        return (
                          <div
                            key={command.id}
                            onClick={onSelectParticipant(command)}
                            className={cn("participant", {
                              selected: command.id === selectedParticipant?.id,
                            })}
                          >
                            <MemberComponent
                              participant={command}
                              onCheck={onCheckParticipant(command)}
                              isChecked={
                                checkedParticipant && (checkedParticipant[command.id] || false)
                              }
                              hideMeter={hideMeter}
                              hideMember={hideMember}
                              showAmount={showAmount}
                              showDetailsPage={showDetailsPage}
                              onShowAddMeterPage={onShowAddMeterPage}
                            >
                              {hideMeter ||
                                command.meters.map((m, i) => (
                                  <MeterCardComponent
                                    key={"meter" + i}
                                    participant={command}
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
                            key={command.id}
                            onClick={onSelectParticipant(command)}
                            className={cn("participant", {
                              selected: command.id === selectedParticipant?.id,
                            })}
                          >
                            <MemberComponent
                              participant={command}
                              onCheck={onCheckParticipant(command)}
                              isChecked={
                                checkedParticipant && (checkedParticipant[command.id] || false)
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
                    }}>
          </Virtuoso>
          }
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

                      <div
                        style={{
                          display: "grid",
                          gridTemplateColumns: "repeat(3, 1fr)",
                          gap: "10px",
                        }}
                      >
                        <IonButton
                          disabled={activePeriod === undefined}
                          onClick={() => onDoBilling(true, documentDateBilling)}
                        >
                          {`Vorschau Akt.`}
                          <IonIcon
                            slot="end"
                            icon={reloadCircleOutline}
                          ></IonIcon>
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
                          {eeg?.accountInfo.sepa ? "SEPA" : "EXCEL"}
                        </IonButton>
                      </div>
                      <IonButton
                        expand="block"
                        disabled={activePeriod === undefined || !previewValid}
                        onClick={() =>
                          presentAlert({
                            subHeader: "Abrechnungslauf",
                            message:
                              "Wenn Du „OK“ wählst, werden die Rechnungen endgültig erstellt und die fortlaufenden Rechnungsnummern vergeben. Dieser Vorgang ist unumkehrbar und Änderungen an den Rechnungen sind danach nicht mehr möglich. Willst Du wirklich das angewählte Verrechnungsintervall jetzt abrechnen?",
                            buttons: [
                              {
                                text: "Cancel",
                                role: "cancel",
                              },
                              {
                                text: "OK",
                                role: "confirmInvoice",
                              },
                            ],
                            onDidDismiss: (e: CustomEvent) => {
                              if (e.detail.role === "confirmInvoice") {
                                onDoBilling(false, documentDateBilling);
                              }
                            },
                          })
                        }
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
                          {eeg?.accountInfo.sepa ? "SEPA" : "EXCEL"}
                        </IonButton>
                      </div>
                    </>
                  )}
                </IonCol>
              </IonRow>
            </div>
          )}
          <div className={"button-bar"}>
            <div style={{marginLeft: "20px"}}>
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
              <div style={{marginRight: "10px"}}>
                <ButtonGroup
                  buttons={[
                    {
                      icon: <IonIcon slot="icon-only" icon={person}></IonIcon>,
                    },
                    {icon: <IonIcon slot="icon-only" icon={flash}></IonIcon>},
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
};

export default ParticipantPaneComponent;
