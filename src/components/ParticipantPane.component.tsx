import React, {FC, useContext, useEffect, useState} from "react";

import {EegParticipant} from "../models/members.model";
import {
  CheckboxCustomEvent, IonIcon, SelectCustomEvent, useIonAlert
} from "@ionic/react";
import {CheckboxChangeEventDetail} from "@ionic/core";
import {IonCheckboxCustomEvent} from "@ionic/core/dist/types/components";
import {SelectedPeriod} from "../models/energy.model";
import PeriodSelectorComponent from "./PeriodSelector.component";
import MemberComponent from "./Member.component";
import {ParticipantBillType} from "../models/meteringpoint.model";
import MeterCardComponent from "./MeterCard.component";
import {ParticipantContext} from "../store/hook/ParticipantProvider";
import {MemberViewContext} from "../store/hook/MemberViewProvider";

import "./ParticipantPane.component.scss"
import SlideButtonComponent from "./SlideButton.component";
import {useAppDispatch, useAppSelector} from "../store";
import {fetchEnergyBills} from "../store/billing";
import {selectedTenant} from "../store/eeg";
import {fetchEnergyReport, meteringEnergyGroup} from "../store/energy";
import ButtonGroup from "./ButtonGroup.component";
import {flash, person} from "ionicons/icons";
import {eegPlug, eegSolar} from "../eegIcons";
import {selectedParticipantSelector, selectParticipant} from "../store/participant";
import cn from "classnames";

interface ParticipantPaneProps {
  participants: EegParticipant[];
  periods: { begin: string, end: string };
  activePeriod: SelectedPeriod | undefined;
  memberBill?: ParticipantBillType;
  onUpdatePeriod: (e: SelectCustomEvent<number>) => void;
}

const ParticipantPaneComponent: FC<ParticipantPaneProps> = ({
                                                              participants,
                                                              periods,
                                                              activePeriod,
                                                              memberBill,
                                                              onUpdatePeriod
                                                            }) => {

  const dispatcher = useAppDispatch();
  const tenant = useAppSelector(selectedTenant);
  const energyMeterGroup = useAppSelector(meteringEnergyGroup);
  const selectedParticipant = useAppSelector(selectedParticipantSelector);

  const [sortedParticipants, setSortedParticipants] = useState(participants);
  const {
    enableBilling,
    setEnableBilling,
    checkedParticipant,
    setCheckedParticipant,
    detailsPageOpen,
    showDetailsPage
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
    setSortedParticipants(sorted);
  }, [participants])

  const selectAll = (event: IonCheckboxCustomEvent<CheckboxChangeEventDetail>) => {
    participants.forEach((p) => {
      if (p.status === 'ACTIVE') {
        setCheckedParticipant(p.id, event.detail.checked);
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
            dispatcher(
              fetchEnergyBills({tenant, energyMeterGroup}))
              .then(() => toggleShowAmount(true));
          } else {
            toggleShowAmount(false);
          }
        },
      })
    } else {
      toggleShowAmount(false);
    }
  }

  const onUpdatePeriodSelection = (selectedPeriod: SelectedPeriod) => {
    dispatcher(fetchEnergyReport({
      tenant: tenant!,
      year: selectedPeriod.year,
      month: selectedPeriod.month
    }))
    // setUsedPeriod(idx)
  }

  const onSelectParticipant = (p: EegParticipant) => {
    dispatcher(selectParticipant(p.id))
  }

  return (
    <div className={"participant-pane"}>
      <div className={"pane-body"}>
        <div className={"pane-content"}>
          <PeriodSelectorComponent periods={periods} activePeriod={activePeriod} selectAll={selectAll}
                                   onUpdatePeriod={onUpdatePeriodSelection}/>

          {sortedParticipants.map((p, idx) => {
            return (
              <div key={idx} onClick={() => onSelectParticipant(p)} className={cn("participant", {"selected": p.id === selectedParticipant.id})}>
                <MemberComponent
                                 participant={p}
                                 onCheck={onCheckParticipant(p)}
                                 isChecked={checkedParticipant && (checkedParticipant[p.id] || false)}
                                 hideMeter={hideMeter}
                                 hideMember={hideMember}
                                 showAmount={showAmount}
                                 showDetailsPage={showDetailsPage}
                                 memberBill={memberBill}
                >
                  {hideMeter || p.meters.filter((m) => {
                    if (m.direction === 'GENERATOR' && hideProducers)
                      return false;
                    if (m.direction === 'CONSUMPTION' && hideConsumers)
                      return false;
                    return true;
                  }).map((m, i) => (
                    <MeterCardComponent key={i} participant={p} meter={m} hideMeter={false}/>
                  ))}
                </MemberComponent>
              </div>
            )
          })}
        </div>
        <div className={"pane-footer"}>
          <div style={{marginLeft: "20px"}}>
            <SlideButtonComponent checked={showAmount} disabled={!enableBilling}
                                  setChecked={(c) => activateBilling(c)}></SlideButtonComponent>
          </div>
          <div style={{marginRight: "20px", display: "flex", flexDirection: "row"}}>
            <div style={{marginRight: "10px"}}>
              <ButtonGroup buttons={[
                {icon: <IonIcon slot="icon-only" icon={person}></IonIcon>},
                {icon: <IonIcon slot="icon-only" icon={flash}></IonIcon>}
              ]} onChange={toggleMembersMeter}/>
            </div>
            <div>
              <ButtonGroup buttons={[
                {icon: <IonIcon slot="icon-only" icon={eegSolar}></IonIcon>},
                {icon: <IonIcon slot="icon-only" icon={eegPlug}></IonIcon>}
              ]} onChange={toggleMetering}/>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ParticipantPaneComponent;