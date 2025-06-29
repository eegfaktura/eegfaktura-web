import React, {FC, useContext} from "react";
import {CheckboxCustomEvent, IonButton, IonCheckbox, IonCol, IonIcon, IonItem, IonLabel,} from "@ionic/react";
import {eegExclamation} from "../../eegIcons";
import {EegParticipant} from "../../models/members.model";
import {EegTariff} from "../../models/eeg.model";
import {useAppSelector} from "../../store";
import {selectBillByParticipant} from "../../store/billing";
import {add} from "ionicons/icons";
import {ParticipantContext} from "../../store/hook/ParticipantProvider";


interface MemberNameComponentProps {
  participant: EegParticipant;
  isChecked: boolean;
  showAmount: boolean;
  tariff?: EegTariff | undefined;
  onCheck: (e: CheckboxCustomEvent) => void;
  onSelect?: (e: React.MouseEvent<HTMLIonCardElement, MouseEvent>) => void
  onAdd: (p: EegParticipant) => (e: React.MouseEvent<HTMLIonButtonElement, MouseEvent>) => void
}

const MemberNameComponent: FC<MemberNameComponentProps> =
  ({participant, isChecked, showAmount, tariff, onCheck, onSelect, onAdd}) => {

  const bill = useAppSelector(selectBillByParticipant(participant.id))
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

  return (
    <>
      <IonCol size="2" style={{flexWrap: "nowrap"}}>
        <IonItem lines="none" style={{background: "transparent", "--min-height": "24px"}}>
          <IonCheckbox style={{"--size": "16px", margin: "0px"}} onIonChange={onCheck} checked={isChecked} disabled={true} aria-label=""></IonCheckbox>
        </IonItem>
      </IonCol>
      <IonCol size="10">
        <IonItem detail={!showAmount} lines="none" onClick={onSelect} style={{"--min-height": "24px", "--padding-start": "0"}}>
          {isPending() ? (
            <IonLabel style={{margin: "0px", color: "#DC631E"}}>
              <div style={{display: "flex"}}>
                <span style={{fontSize: "14px"}}>{renderMemberName()}</span>
                <span style={{marginLeft: "5px"}}><IonIcon size="small" icon={eegExclamation}></IonIcon></span>
              </div>
            </IonLabel>
          ) : (
            <div style={{display: "flex", width: "100%", alignItems: "center", justifyContent: "space-between"}}>
              <IonLabel style={{margin: "0px", width: "200px"}}>
                <div style={{display: "flex", justifyContent: "space-between"}}>
                  <span style={{fontSize: "15px", textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap"}}>{renderMemberName()}</span>
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