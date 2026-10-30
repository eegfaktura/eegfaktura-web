import React, {FC, useRef, useState} from "react";
import {IonButton, IonIcon, useIonToast} from "@ionic/react";
import {mailOutline} from "ionicons/icons";
import {BillingRun} from "../../models/meteringpoint.model";
import {reformatDateTimeStamp} from "../../util/Helper.util";
import {useConfirm} from "../core/useConfirm";
import {BillingTotals} from "./BillingTotals.functions";
import {count} from "../notification/EnergyRequestSummary.functions";
import {useAppDispatch} from "../../store";
import {billingRunSendmail, fetchBillingRunById} from "../../store/billingRun";
import {withReason} from "../../service/error.text";

// billing sends one mail per document: every document of the run is counted once in the totals
export const documentCount = (totals: BillingTotals | undefined) =>
  totals ? totals.invoices.count + totals.creditNotes.count + totals.infos.count : undefined

// platform#228 step 3: the billing mails of a run can be sent once. billing records the send in mailStatus
// ("IN PROGRESS", then "SENT") and refuses every further send of the run (since bc52c5b), so the button is disabled
// then and says why. Before the send it asks and names the number of mails (one per document; the count comes from the
// documents loaded for the totals, undefined while they load).
export const sendMailState = (run: BillingRun, documentCount: number | undefined) => {
  if (run.mailStatus === "SENT") {
    return {disabled: true, label: run.mailStatusDateTime
        ? `Bereits versendet (${reformatDateTimeStamp(run.mailStatusDateTime)})` : "Bereits versendet"}
  }
  if (run.mailStatus) {
    // billing sets it before the first mail and "SENT" after the last; it stays when billing stops in between
    return {disabled: true, label: "Wird versendet …",
      hint: "Der Versand läuft. Bleibt dieser Stand bestehen, bitte den Support kontaktieren."}
  }
  const mails = documentCount === undefined
    ? "alle Abrechnungsdokumente"
    : documentCount === 1 ? "1 Abrechnungsdokument" : `${count(documentCount)} Abrechnungsdokumente`
  return {disabled: false, label: "SENDEN", message: `Jetzt ${mails} per E-Mail an die Mitglieder versenden?`}
}

interface BillingSendButtonProps {
  tenant: string
  run: BillingRun
  documentCount: number | undefined
}

const BillingSendButton: FC<BillingSendButtonProps> = ({tenant, run, documentCount}) => {
  const dispatcher = useAppDispatch()
  const confirm = useConfirm()
  const [toaster] = useIonToast()
  const state = sendMailState(run, documentCount)
  // from the click until billing answered: a double click opens one dialog and sends once
  const busy = useRef(false)
  const [sending, setSending] = useState(false)

  const ask = async () => {
    if (busy.current || !state.message) return
    busy.current = true
    setSending(true)
    try {
      if (await confirm("Senden", state.message, "Senden")) await send()
    } finally {
      busy.current = false
      setSending(false)
    }
  }

  const send = async () => {
    const billingRunId = run.id
    const result = await dispatcher(billingRunSendmail({tenant, billingRunId}))
    if (billingRunSendmail.rejected.match(result)) {
      // billing refuses e.g. a busy run (409) or one sent meanwhile from elsewhere: say so, with billing's reason
      // (web 261030-mm1: the result was ignored)
      toaster({message: withReason("Der Mailversand ist fehlgeschlagen.", result.error.message), duration: 8000,
        position: "bottom", color: "danger"})
    }
    // once after the send: the button shows the state billing recorded (no polling)
    dispatcher(fetchBillingRunById({tenant, billingRunId}))
  }

  return (
    <>
      <IonButton disabled={state.disabled || sending} onClick={ask}>
        <IonIcon slot="end" icon={mailOutline}></IonIcon>
        {state.label}
      </IonButton>
      {state.hint && <div style={{fontSize: "0.85em"}}>{state.hint}</div>}
    </>
  )
}

export default BillingSendButton
