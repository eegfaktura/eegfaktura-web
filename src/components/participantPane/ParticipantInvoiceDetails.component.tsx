import React, {FC, useEffect, useState} from "react";
import {useAppSelector} from "../../store";
import {ratesSelector} from "../../store/rate";
import {selectBillById} from "../../store/billing";
import {selectedParticipantSelector} from "../../store/participant";
import {toRecord} from "../../util/Helper.util";
import RateCardComponent from "../RateCard.component";
import MeterCardComponent from "./MeterCard.component";
import {IonGrid, IonIcon, IonItem, IonLabel, IonRow} from "@ionic/react";
import {eegSumSign} from "../../eegIcons";


type RateModelGroup = Record<string, Record<string, number>>

const ParticipantInvoiceDetailsComponent: FC = () => {
  const rates = useAppSelector(ratesSelector);
  const selectedParticipant = useAppSelector(selectedParticipantSelector);

  const memberBill = useAppSelector(selectBillById(selectedParticipant?.id))
  const [rateGroups, setRateGroups] = useState<RateModelGroup>({});
  const [participantRate, setParticipantRate] = useState<{ tariff_id: string, fee: number } | undefined>(undefined);

  useEffect(() => {
    if (memberBill && selectedParticipant && selectedParticipant.meters) {

      const meterBillGroup = toRecord(memberBill.meteringPoints, "id")

      const m = selectedParticipant.meters.filter(m => meterBillGroup[m.meteringPoint]).reduce((group, meter) =>
        ({
          ...group, [meter.tariff_id]:
            {...group[meter.tariff_id], [meter.meteringPoint]: meterBillGroup[meter.meteringPoint].amount}
        }), {} as RateModelGroup)
      setRateGroups(m);

      if (selectedParticipant.tariffId && memberBill.participantFee !== 0) {
        setParticipantRate({tariff_id: selectedParticipant.tariffId, fee: memberBill.participantFee})
      } else {
        setParticipantRate(undefined)
      }
    }

    if (selectedParticipant && memberBill === undefined) {
      setRateGroups({})
      setParticipantRate(undefined)
    }

  }, [memberBill, selectedParticipant])

  const createParticipantFeeCard = (tariff_id: string, fee: number) => {
    const tariff = rates.find((r) => r.id === tariff_id)
    return (
      <div key={tariff_id}>
        <RateCardComponent rate={tariff!}/>
        <IonItem lines="none" fill={undefined} style={{"--background": "transparent"}}>
          <IonLabel slot="end">{fee.toFixed(2)} €</IonLabel>
        </IonItem>
      </div>
    )

  }

  const createRateCard = (tariffGroup: [string, Record<string, number>]) => {
    if (!selectedParticipant) {
      return (
        <></>
      )
    }
    const [tariff_id, meters] = tariffGroup
    const tariff = rates.find((r) => r.id === tariff_id)
    const meterGroup = toRecord(selectedParticipant!.meters, "meteringPoint")
    const sum = Object.values(meters).reduce((s, m) => s + m, 0)

    if (!tariff) {
      return (
        <></>
      )
    }

    return (
      <div key={tariff_id}>
        <RateCardComponent rate={tariff!}/>
        {Object.keys(meters).map((m, i) => {
          if (meterGroup[m]) {
            return (
              <MeterCardComponent key={i} participant={selectedParticipant} meter={meterGroup[m]} hideMeter={true}
                                  showCash={false}/>)
          }
        })}
        <IonItem lines="none" fill={undefined} style={{"--background": "transparent"}}>
          <IonLabel slot="end">{sum.toFixed(2)} €</IonLabel>
        </IonItem>
      </div>
    )
  }

  const getParticipantLine = (fee: number) => {
    if (fee > 0) {
      return (
        <div style={{display: "flex", justifyContent: "space-between", width: "100%"}}>
          <div style={{padding: "5px"}}>Mitgliedsbeitrag:</div>
          <div style={{padding: "5px"}}>{fee.toFixed(2)} €</div>
        </div>
      )
    }
    return (<></>)
  }

  const getCreditLine = (credit: number) => {
    if (credit > 0) {
      return (
        <div style={{display: "flex", justifyContent: "space-between", width: "100%"}}>
          <div style={{padding: "5px"}}>Energielieferung netto:</div>
          <div style={{padding: "5px"}}>{credit.toFixed(2)} €</div>
        </div>
      )
    }
    return (<></>)
  }
  const getDebitLine = (debit: number) => {
    if (debit < 0) {
      return (
        <div style={{display: "flex", justifyContent: "space-between", width: "100%"}}>
          <div style={{padding: "5px"}}>Energiebezug netto:</div>
          <div style={{padding: "5px"}}>{debit.toFixed(2)} €</div>
        </div>
      )
    }
    return (<></>)
  }

  const createFooterSummary = () => {
    if (memberBill) {
      const [credit, debit] = memberBill.meteringPoints.reduce(([c, d], m) =>
          m.amount > 0 ? [c + m.amount, d] : [c, d + m.amount],
        [0, 0] as [credit: number, debit: number])
      return (
        <div style={{width: "100%"}}>
          {getParticipantLine(memberBill.participantFee)}
          {getCreditLine(credit)}
          {getDebitLine(debit)}
        </div>
      )
    }
  }

  if (!rateGroups || Object.keys(rateGroups).length === 0) {
    return (
      <></>
    )
  } else {
    return (
      <div style={{position: "absolute", paddingTop: "16px", paddingLeft: "16px", maxHeight: "100%", overflow: "auto"}}>
        <div style={{
          width: "50%",
          margin: "16px",
          padding: "16px",
          boxShadow: "0px 4px 5px rgba(0, 0, 0, 0.14), 0px 1px 10px rgba(0, 0, 0, 0.12), 0px 2px 4px rgba(0, 0, 0, 0.2)",
          background: "var(--ion-color-eeglight-tint)"
        }}>
          <div>
            {participantRate && createParticipantFeeCard(participantRate.tariff_id, participantRate.fee)}
            {rateGroups ? Object.entries(rateGroups).map((tariffId) => (createRateCard(tariffId))) : <></>}
          </div>
          <div>
            <IonGrid className={"rate-modal-footer"}>
              <IonRow>
                {createFooterSummary()}
              </IonRow>
              <IonRow style={{
                flexDirection: "row-reverse",
                borderTop: "1px solid var(--ion-border-color, #dcdcdc)",
                marginTop: "10px"
              }}>
                <div style={{paddingRight: "10px", marginBottom: "10px", marginTop: "10px"}}>
                  {memberBill ? <>
                    <IonItem lines="none" mode="md" style={{"--min-height": "32px", fontSize: "14px"}}>
                      <IonIcon style={{marginTop: "5px", marginBottom: "5px"}} icon={eegSumSign} slot="start"></IonIcon>
                      <span>{memberBill.meteringPoints.reduce((s, m) => s + m.amount, memberBill.participantFee).toFixed(2)}</span> €
                    </IonItem></> : <></>}
                </div>
              </IonRow>
            </IonGrid>
          </div>
        </div>
      </div>
    )
  }
}

export default ParticipantInvoiceDetailsComponent;