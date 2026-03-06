import React, {FC, ReactNode} from "react";
import {EegParticipant} from "../../models/members.model";
import {
  CheckboxCustomEvent,
  IonCol,
  IonGrid,
  IonIcon,
  IonItem,
  IonRow
} from "@ionic/react";

import "./Member.component.css";
import {eegSumSign} from "../../eegIcons";
import MemberNameComponent from "./MemberName.component";
import {useAppSelector} from "../../store";
import {selectBillById} from "../../store/billing";

interface MemberProps {
  participant: EegParticipant;
  children?: ReactNode;
  isChecked: boolean;
  hideMember: boolean;
  hideMeter: boolean;
  showAmount: boolean;
  onCheck: (e: CheckboxCustomEvent) => void;
  showDetailsPage: (participant: EegParticipant) => void;
  onShowAddMeterPage: (p: EegParticipant) => (e: React.MouseEvent<HTMLIonButtonElement, MouseEvent>) => void
}

const MemberComponent: FC<MemberProps> = ( {participant,
                                             children,
                                             isChecked,
                                             hideMember,
                                             hideMeter,
                                             showAmount,
                                             onCheck,
                                             showDetailsPage,
                                             onShowAddMeterPage}) => {

  const memberBill = useAppSelector(selectBillById(participant.id))

  const ratio = (own: number, total: number) => {
    return 100 - Math.round((own / total) * 100);
  }

  const isPending = () => participant.status === 'PENDING';

  const memberSum = () => {
    if (memberBill) {
      const sum = memberBill.meteringPoints.reduce((i,s) => i + s.amount, memberBill.participantFee);
      return (Math.round(sum * 100) / 100).toFixed(2);
    }
    return 0;
  }

  return (
    <div>
    <IonGrid fixed={true} style={{paddingBottom: "0px", paddingTop: "0px", maxWidth:"380px"}}>
      { hideMember || (
        <IonRow class="ion-align-items-center" style={{"--ion-background-color": "transparent", "--ion-item-background": "transparent", flexWrap: "nowrap"}}>
          <MemberNameComponent data-testid="member-name" participant={participant} isChecked={isChecked} onCheck={onCheck} showAmount={showAmount} onAdd={onShowAddMeterPage}/>
        </IonRow>
      )}
      <IonRow>
        <IonCol size="12">
          {children}
        </IonCol>
      </IonRow>
      { showAmount && !isPending() && !hideMeter &&
      <IonRow style={{flexDirection: "row-reverse"}}>
        <div style={{paddingRight: "10px", marginBottom:"10px"}}>
          <IonItem lines="none" style={{"--min-height": "32px", fontSize: "14px", border: "2px solid rgb(0 0 0 / 12%)", borderRadius: "4px", color: "#368060"}} onClick={(e) => {
            showDetailsPage(participant);
            e.preventDefault();
          }}><IonIcon style={{marginTop: "5px", marginBottom: "5px",  color: "#368060"}} icon={eegSumSign} slot="start"></IonIcon>
            {memberSum()} €
          </IonItem>
        </div>
      </IonRow>
      }
    </IonGrid>
    </div>
  )
}

export default MemberComponent;
