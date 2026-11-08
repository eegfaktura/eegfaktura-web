import React, {FC, useEffect, useState} from "react";
import {IonButton, IonButtons, IonSpinner} from "@ionic/react";
import {Eeg, SettlementIntervalResult} from "../../models/eeg.model";
import {Api} from "../../service";
import {periodLabel, settlementIntervalLabel} from "../../util/SettlementInterval.util";

export const SETTLEMENT_INTERVAL_HELP_URL =
  "https://eegfaktura.github.io/eegfaktura-user-guide/05-abrechnung/#abrechnungszeitraum-wechseln"

interface SettlementIntervalChangeDialogProps {
  tenant: string
  current: Eeg["settlementInterval"]
  next: Eeg["settlementInterval"]
  // the saved change, or nothing when the dialog was cancelled
  onDone: (result?: SettlementIntervalResult) => void
  // true while the change is being saved: the page keeps the dialog open meanwhile, so the result is seen
  onSaving: (saving: boolean) => void
}

type Phase = "checking" | "ready" | "saving"

const checkFailed = (e: Error) => `Der Wechsel kann gerade nicht geprüft werden: ${e.message}`

// platform#230: billing's state goes to the backend, first as a check (dryRun), after the confirmation as the change;
// the change is sent with billing's state read again at that moment (a run may have started while the dialog was open)
const SettlementIntervalChangeDialog: FC<SettlementIntervalChangeDialogProps> = ({tenant, current, next, onDone, onSaving}) => {
  const [phase, setPhase] = useState<Phase>("checking")
  const [check, setCheck] = useState<SettlementIntervalResult>()
  const [error, setError] = useState<string>()

  useEffect(() => {
    let cancelled = false
    Api.eegService.fetchSettlementState(tenant)
      .then(state => {
        if (cancelled) return
        return Api.eegService.changeSettlementInterval(tenant, next, true, state)
          .then(result => { if (!cancelled) setCheck(result) })
      })
      .catch((e: Error) => { if (!cancelled) setError(checkFailed(e)) })
      .finally(() => { if (!cancelled) setPhase("ready") })
    return () => { cancelled = true }
  }, [tenant, next])

  const confirm = () => {
    setPhase("saving")
    onSaving(true)
    const failed = (text: string) => {
      setError(text)
      setPhase("ready")
      onSaving(false)
    }
    Api.eegService.fetchSettlementState(tenant)
      .then(state => Api.eegService.changeSettlementInterval(tenant, next, false, state)
        .then(result => onDone(result), (e: Error) => failed(`Der Wechsel wurde nicht gespeichert: ${e.message}`)),
        (e: Error) => failed(checkFailed(e)))
  }

  const canConfirm = phase === "ready" && !!check?.allowed && !error

  return (
    <div className="ion-padding" data-testid="settlement-interval-dialog">
      <h6>Abrechnungsintervall wechseln</h6>
      <div>Bisher: {settlementIntervalLabel(current)}</div>
      <div>Neu: {settlementIntervalLabel(next)}</div>
      {phase === "checking" && <IonSpinner/>}
      {check && <>
        <p><strong>{check.message}</strong></p>
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
