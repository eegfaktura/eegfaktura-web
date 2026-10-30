import React, {FC} from "react";
import {IonButton, IonIcon, useIonToast} from "@ionic/react";
import {mailOutline} from "ionicons/icons";
import {BillingRun} from "../../models/meteringpoint.model";
import moment from "moment";
import {useConfirm} from "../core/useConfirm";
import {BillingTotals} from "./BillingTotals.functions";
import {count} from "../notification/EnergyRequestSummary.functions";
import {useAppDispatch} from "../../store";
import {billingRunSendmail, fetchBillingRunById} from "../../store/billingRun";
import {withReason} from "../../service/error.text";

// billing sends one mail per document: every document of the run is counted once in the totals
export const documentCount = (totals: BillingTotals | undefined) =>
  totals ? totals.invoices.count + totals.creditNotes.count + totals.infos.count : undefined

// billing writes the time as LocalDateTime in a UTC container (no offset): read as UTC, shown in local time
const sentAt = (dateTime: string | undefined) => {
  const d = dateTime ? moment.utc(dateTime) : undefined
  return d && d.isValid() ? ` am ${d.local().format("DD.MM.YYYY HH:mm")}` : ""
}

// platform#228 step 3: the billing mails of a run can be sent once. billing records the send in mailStatus
// ("IN PROGRESS", then "SENT") and refuses every further send of the run (since bc52c5b), so the button is disabled
// then and says why. Before the send it asks and names the number of mails (one per document; the count comes from the
// documents loaded for the totals, undefined while they load).
export const sendMailState = (run: BillingRun, documentCount: number | undefined) => {
  if (run.mailStatus === "SENT") return {disabled: true, label: `Bereits versendet${sentAt(run.mailStatusDateTime)}`}
  if (run.mailStatus) return {disabled: true, label: "Wird versendet …"}
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

  const send = async () => {
    const billingRunId = run.id
    const result = await dispatcher(billingRunSendmail({tenant, billingRunId}))
    if (billingRunSendmail.rejected.match(result)) {
      // billing refuses e.g. a busy run (409) or one sent meanwhile from elsewhere: say so, with billing's reason
      // (web 261030-mm1: the result was ignored)
      toaster({message: withReason("Der Mailversand ist fehlgeschlagen.", result.error.message), duration: 8000,
        position: "bottom", color: "danger"})
    }
    dispatcher(fetchBillingRunById({tenant, billingRunId}))
  }

  return (
    <IonButton disabled={state.disabled}
               onClick={() => state.message && confirm("Senden", state.message, "Senden", send)}>
      <IonIcon slot="end" icon={mailOutline}></IonIcon>
      {state.label}
    </IonButton>
  )
}

export default BillingSendButton
