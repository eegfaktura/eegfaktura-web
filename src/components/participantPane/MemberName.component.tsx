import React, {FC, useContext} from "react";
import {memberActivity} from "../../util/MemberActivity.util";
import {selectParticipantById} from "../../store/participant";
import {IonButton, IonCol, IonIcon, IonItem, IonLabel,} from "@ionic/react";
import {eegExclamation} from "../../eegIcons";
import {EegParticipant} from "../../models/members.model";
import {EegTariff} from "../../models/eeg.model";
import {useAppSelector} from "../../store";
import {selectBillByParticipant} from "../../store/billing";
import {add} from "ionicons/icons";
import {ParticipantContext} from "../../store/hook/ParticipantProvider";


interface MemberNameComponentProps {
  participant: EegParticipant;
  showAmount: boolean;
  tariff?: EegTariff | undefined;
  onSelect?: (e: React.MouseEvent<HTMLIonCardElement, MouseEvent>) => void
  onAdd: (p: EegParticipant) => (e: React.MouseEvent<HTMLIonButtonElement, MouseEvent>) => void
}

const MemberNameComponent: FC<MemberNameComponentProps> =
  ({participant, showAmount, tariff, onSelect, onAdd}) => {

  const bill = useAppSelector(selectBillByParticipant(participant.id))
  // the list entry can hold only some metering points (filters, period): the status needs all of them
  const fullParticipant = useAppSelector(selectParticipantById(participant.id))
  const {
    setShowAddMeterPane,
  } = useContext(ParticipantContext);
  const isPending = () => participant.status === 'PENDING';

  const euroAmount = () => {
    if (bill) {
      return "" /*+ bill.toFixed(2) + " €"*/
    }
    return ""
  }

  const renderMemberName = ():string => {
    let name = ""
    if (participant.businessRole === 'EEG_PRIVATE') {
      if (participant.titleBefore) {
        name = participant.titleBefore + " "
      }
      name += participant.firstname + (participant.lastname ? (" " + participant.lastname) : "")
      if (participant.titleAfter) {
        name += ", " + participant.titleAfter
      }
    } else {
      name = participant.firstname
    }
    return name
  }

  // the member number in brackets after the name (08.11.2026); it stays visible when a long name is cut
  const memberNumber = participant.participantNumber
    ? <span style={{whiteSpace: "nowrap", flexShrink: 0, marginLeft: "4px"}}>({participant.participantNumber})</span>
    : null

  return (
    <>
      <IonCol size="12">
        <IonItem detail={!showAmount} lines="none" onClick={onSelect} style={{"--min-height": "24px", "--padding-start": "0"}}>
          {isPending() ? (
            <IonLabel style={{margin: "0px", color: "#DC631E"}}>
              <div style={{display: "flex"}}>
                <span style={{fontSize: "14px"}}>{renderMemberName()}</span>
                <span style={{fontSize: "14px"}}>{memberNumber}</span>
                <span style={{marginLeft: "5px"}}><IonIcon size="small" icon={eegExclamation}></IonIcon></span>
              </div>
            </IonLabel>
          ) : (
            <div style={{display: "flex", width: "100%", alignItems: "center", justifyContent: "space-between"}}>
              <IonLabel style={{margin: "0px", width: "200px"}}>
                <div style={{display: "flex", justifyContent: "space-between"}}>
                  <span style={{display: "flex", minWidth: 0, fontSize: "15px"}}>
                    <span style={{textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap"}}>{renderMemberName()}</span>
                    {memberNumber}
                  </span>
                  {/* platform#165: no active and no registering metering point left */}
                  {memberActivity(fullParticipant ?? participant) === 'INACTIVE' &&
                    <span style={{fontSize: "11px", color: "var(--ion-color-medium, #92949c)", marginLeft: "6px", whiteSpace: "nowrap"}}>inaktiv</span>}
                  {showAmount && <span>{euroAmount()}</span>}
                </div>
              </IonLabel>
              <IonButton slot="end" fill="clear" onClick={onAdd(participant)} style={{"marginInlineStart": "2px"}}>
                <IonIcon slot="icon-only" icon={add}/>
              </IonButton>
            </div>
          )}
        </IonItem>
      </IonCol>
    </>
  )
}

export default MemberNameComponent;