import React, {FC, useEffect, useState} from "react";
import {IonButton, IonButtons, IonSpinner} from "@ionic/react";
import {Eeg, SettlementIntervalResult, SettlementState} from "../../models/eeg.model";
import {Api} from "../../service";
import {longDate, periodLabel, settlementIntervalLabel} from "../../util/SettlementInterval.util";

export const SETTLEMENT_INTERVAL_HELP_URL =
  "https://eegfaktura.github.io/eegfaktura-user-guide/05-abrechnung/#abrechnungszeitraum-wechseln"

interface SettlementIntervalChangeDialogProps {
  tenant: string
  current: Eeg["settlementInterval"]
  next: Eeg["settlementInterval"]
  // the saved change, or nothing when the dialog was cancelled
  onDone: (result?: SettlementIntervalResult) => void
}

type Phase = "checking" | "ready" | "saving"

// platform#230: billing's state goes to the backend, first as a check (dryRun), after the confirmation as the change
const SettlementIntervalChangeDialog: FC<SettlementIntervalChangeDialogProps> = ({tenant, current, next, onDone}) => {
  const [phase, setPhase] = useState<Phase>("checking")
  const [billingState, setBillingState] = useState<SettlementState>()
  const [check, setCheck] = useState<SettlementIntervalResult>()
  const [error, setError] = useState<string>()

  useEffect(() => {
    let cancelled = false
    Api.eegService.fetchSettlementState(tenant)
      .then(state => {
        if (cancelled) return
        setBillingState(state)
        return Api.eegService.changeSettlementInterval(tenant, next, true, state)
          .then(result => { if (!cancelled) setCheck(result) })
      })
      .catch((e: Error) => { if (!cancelled) setError(`Der Wechsel kann gerade nicht geprüft werden: ${e.message}`) })
      .finally(() => { if (!cancelled) setPhase("ready") })
    return () => { cancelled = true }
  }, [tenant, next])

  const confirm = () => {
    if (!billingState) return
    setPhase("saving")
    Api.eegService.changeSettlementInterval(tenant, next, false, billingState)
      .then(result => onDone(result))
      .catch((e: Error) => {
        setError(`Der Wechsel wurde nicht gespeichert: ${e.message}`)
        setPhase("ready")
      })
  }

  const canConfirm = phase === "ready" && !!check?.allowed && !error

  return (
    <div className="ion-padding" data-testid="settlement-interval-dialog">
      <h6>Abrechnungszeitraum wechseln</h6>
      <div>Bisher: {settlementIntervalLabel(current)}</div>
      <div>Neu: {settlementIntervalLabel(next)}</div>
      {phase === "checking" && <IonSpinner/>}
      {check && <>
        <p><strong>{check.message}</strong></p>
        {!check.allowed && check.earliestFrom &&
          <div>Frühestmöglicher Beginn: {longDate(check.earliestFrom)}</div>}
        <div>Zuletzt endgültig abgerechnet: {check.lastFinalPeriod ? periodLabel(check.lastFinalPeriod) : "noch nichts"}</div>
      </>}
      {error && <p style={{color: "var(--ion-color-danger)"}}>{error}</p>}
      <p>Bestehende Belege, Nummern und Exporte bleiben unverändert.</p>
      <p>Mitgliedsbeitrag, Zählpunktgebühr und kostenlose Energie (kWh) gelten je Abrechnung. Mit einem anderen Intervall
        ändert sich der Jahresbetrag, wenn der Tarif gleich bleibt. Bitte die Tarife prüfen.</p>
      <a href={SETTLEMENT_INTERVAL_HELP_URL} target="_blank" rel="noopener noreferrer">Mehr dazu im Handbuch</a>
      <div style={{display: "flex", flexDirection: "row-reverse"}}>
        <IonButtons color="eeg" slot={"end"} style={{color: "black"}}>
          <IonButton fill="clear" onClick={() => onDone()} disabled={phase === "saving"}>Abbrechen</IonButton>
          <IonButton fill="clear" onClick={confirm} disabled={!canConfirm}>Wechseln</IonButton>
        </IonButtons>
      </div>
    </div>
  )
}

export default SettlementIntervalChangeDialog
