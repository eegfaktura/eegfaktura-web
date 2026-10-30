import React, {FC} from "react";
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

// platform#228 step 3: sending the billing mails of a run asks first and names the number of mails. The count comes
// from the documents loaded for the totals (undefined while they load). billing records the mail run in mailStatus
// ("IN PROGRESS", then "SENT"): once it is set, the button reads "Erneut senden" and the question names the earlier send.
export const sendMailConfirmation = (run: BillingRun, documentCount: number | undefined) => {
  const alreadySent = !!run.mailStatus
  const mails = documentCount === undefined
    ? "alle Abrechnungsdokumente"
    : documentCount === 1 ? "1 Abrechnungsdokument" : `${count(documentCount)} Abrechnungsdokumente`
  const earlier = run.mailStatus === "SENT"
    ? `Die Abrechnungsdokumente dieses Laufs wurden bereits versendet (${reformatDateTimeStamp(run.mailStatusDateTime)}). `
    : alreadySent ? "Der Versand für diesen Lauf wurde bereits gestartet. " : ""
  return {
    // upper case like the buttons next to it
    label: alreadySent ? "ERNEUT SENDEN" : "SENDEN",
    subHeader: alreadySent ? "Erneut senden" : "Senden",
    message: `${earlier}${alreadySent ? "Erneut" : "Jetzt"} ${mails} per E-Mail an die Mitglieder versenden?`,
    confirmText: alreadySent ? "Erneut senden" : "Senden",
  }
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
  const c = sendMailConfirmation(run, documentCount)

  const send = async () => {
    const billingRunId = run.id
    const result = await dispatcher(billingRunSendmail({tenant, billingRunId}))
    if (billingRunSendmail.rejected.match(result)) {
      // billing refuses a busy run (409) or one whose mails were already sent: say so, with billing's reason
      // (web 261030-mm1: the result was ignored)
      toaster({message: withReason("Der Mailversand ist fehlgeschlagen.", result.error.message), duration: 8000,
        position: "bottom", color: "danger"})
    }
    dispatcher(fetchBillingRunById({tenant, billingRunId}))
  }

  return (
    <IonButton onClick={() => confirm(c.subHeader, c.message, c.confirmText, send)}>
      <IonIcon slot="end" icon={mailOutline}></IonIcon>
      {c.label}
    </IonButton>
  )
}

export default BillingSendButton
