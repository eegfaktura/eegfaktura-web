import React, {FC, useEffect, useState} from "react";
import {IonButton, useIonAlert, useIonToast} from "@ionic/react";
import {EegTariff, JoiningFeeRecord, JoiningFeeState} from "../../models/eeg.model";
import {Api} from "../../service";
import {JoiningFeeAlreadyBilledError} from "../../service/eeg.service";
import {useLocale} from "../../store/hook/useLocale";
import {
  joiningFeeActions,
  joiningFeeStateOf,
  joiningFeeStatus,
  joiningFeeStatusText,
  showJoiningFeeHint
} from "../../util/JoiningFee.util";
import {formatDecimal2} from "../../util/Number.util";

interface JoiningFeeMemberProps {
  tenant: string
  participantId: string
  // the tariff chosen in the member form (saved on change)
  tariff?: EegTariff
  // some tariff of the community has a joining fee; otherwise nothing is shown and billing is not asked
  feeInUse: boolean
  // runs an action through the member form's save status (platform#228 step 4): the call answers false when it failed
  track?: (call: () => Promise<boolean>) => void
}

// today in local time: billing checks the payment date against Europe/Vienna, toISOString() would give the UTC date
const today = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}

/**
 * platform#217 with the extension of 2026-10-27, member details, EEG admins only (billing allows the calls only to
 * them): the hint at the tariff, the status line „Beitrittsgebühr“ and the actions request / withdraw, record / correct
 * / remove a payment made outside eegfaktura. billing's joiningFeeState is loaded once per member and again after an
 * action; without an answer from billing nothing is shown.
 */
const JoiningFeeMember: FC<JoiningFeeMemberProps> = ({tenant, participantId, tariff, feeInUse, track}) => {
  const {t} = useLocale("common")
  const [alert] = useIonAlert()
  const [toast] = useIonToast()
  const [version, setVersion] = useState(0)
  const key = `${tenant}/${participantId}/${version}`
  const [loaded, setLoaded] = useState<{ key: string, ok: boolean, state?: JoiningFeeState }>()
  // one change at a time: a double click would send the record twice
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (!feeInUse || loaded?.key === key) return
    let current = true
    Api.eegService.fetchJoiningFeeState(tenant)
      .then(all => ({ok: true, state: joiningFeeStateOf(all, participantId)}), () => ({ok: false}))
      .then(result => {
        if (current) setLoaded({key, ...result})
      })
    return () => { current = false }
  }, [key, feeInUse])

  // while reloading after an action the last state of the same member stays visible
  if (!feeInUse || !loaded?.ok || !loaded.key.startsWith(`${tenant}/${participantId}/`)) return null
  const state = loaded.state
  const actions = joiningFeeActions(state, tariff)

  // billing's reason is not in its error body (Spring sends only the status phrase), so a German text per case
  // a retry from the save status runs the attempt again
  const run = (call: () => Promise<void>) => {
    if (busy) return
    setBusy(true)
    const attempt = () => call()
      .then(() => true, e => {
        const conflict = e instanceof JoiningFeeAlreadyBilledError
        toast({
          message: conflict ? e.message : t("joiningFee.change_failed"),
          duration: 5000, position: "bottom", color: conflict ? "warning" : "danger",
        })
        return false
      })
      .finally(() => {
        setBusy(false)
        setVersion(v => v + 1)
      })
    track ? track(attempt) : attempt()
  }

  const save = (record: JoiningFeeRecord) => run(() => Api.eegService.saveJoiningFeeRecord(tenant, participantId, record))
  const remove = () => run(() => Api.eegService.deleteJoiningFeeRecord(tenant, participantId))

  const confirm = (header: string, message: string, confirmText: string, action: () => void) =>
    alert({
      header, message,
      buttons: [{text: t("joiningFee.cancel"), role: "cancel"}, {text: confirmText, role: "confirm", handler: action}],
    })

  const onRequest = () => {
    if (!tariff) return
    const vat = tariff.joiningFeeUseVat ? t("joiningFee.request_vat", {rate: Number(tariff.joiningFeeVatInPercent ?? 0)}) : ""
    confirm(t("joiningFee.request"),
      t("joiningFee.request_message", {tariff: tariff.name, amount: formatDecimal2(Number(tariff.joiningFee)), vat}),
      t("joiningFee.request_confirm"), () => save({kind: "CHARGE_REQUESTED"}))
  }

  const onPaid = () => {
    const paid = state?.paidExternally
    alert({
      header: t(paid ? "joiningFee.correct_paid" : "joiningFee.record_paid"),
      message: t("joiningFee.paid_message"),
      inputs: [
        {name: "paidOn", type: "date", value: paid?.paidOn ?? "", max: today()},
        {name: "note", type: "text", value: paid?.note ?? "", placeholder: t("joiningFee.paid_note"), attributes: {maxlength: 200}},
      ],
      buttons: [
        {text: t("joiningFee.cancel"), role: "cancel"},
        {
          text: t("joiningFee.save"), role: "confirm",
          handler: (v: { paidOn?: string, note?: string }) => {
            if (!v.paidOn) {
              toast({message: t("joiningFee.paid_date_missing"), duration: 3500, position: "bottom", color: "warning"})
              return false
            }
            const note = v.note?.trim()
            save({kind: "PAID_EXTERNALLY", paidOn: v.paidOn, note: note ? note : null})
          },
        },
      ],
    })
  }

  const button = (label: string, onClick: () => void) =>
    <IonButton size="small" fill="outline" disabled={busy} onClick={onClick}>{label}</IonButton>

  return (
    <div style={{margin: "4px 16px 8px", fontSize: "0.9em"}}>
      {showJoiningFeeHint(state, tariff) &&
          <p style={{color: "var(--ion-color-warning-shade)", fontSize: "0.95em", margin: "0 0 4px"}}>
            {t("joiningFee.hint_billed")}
          </p>}
      <div>{t("joiningFee.status_label")}: {joiningFeeStatusText(joiningFeeStatus(state, tariff))}</div>
      <div style={{display: "flex", flexWrap: "wrap", gap: "4px", marginTop: "4px"}}>
        {actions.request && button(t("joiningFee.request"), onRequest)}
        {actions.withdraw && button(t("joiningFee.withdraw"), () =>
          confirm(t("joiningFee.withdraw"), t("joiningFee.withdraw_message"), t("joiningFee.withdraw"), remove))}
        {actions.recordPaid && button(t("joiningFee.record_paid"), onPaid)}
        {actions.changePaid && button(t("joiningFee.correct_paid"), onPaid)}
        {actions.changePaid && button(t("joiningFee.remove_paid"), () =>
          confirm(t("joiningFee.remove_paid"), t("joiningFee.remove_paid_message"), t("joiningFee.remove"), remove))}
      </div>
    </div>
  )
}

export default JoiningFeeMember
