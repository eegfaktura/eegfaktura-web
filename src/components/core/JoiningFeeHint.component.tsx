import React, {FC, useEffect, useState} from "react";
import {EegTariff, JoiningFeeState} from "../../models/eeg.model";
import {Api} from "../../service";
import {useLocale} from "../../store/hook/useLocale";
import {hasJoiningFee, joiningFeeStateOf, showJoiningFeeHint} from "../../util/JoiningFee.util";

interface JoiningFeeHintProps {
  tenant: string
  participantId: string
  // the tariff chosen in the member form, also before it is saved
  tariff?: EegTariff
}

/**
 * platform#217, decision 2026-10-27: at the member's tariff, a hint that a joining fee will not be charged any more.
 * billing's joiningFeeState is loaded once per member, and only when a tariff with a fee is chosen; without an answer
 * from billing no hint is shown.
 */
const JoiningFeeHint: FC<JoiningFeeHintProps> = ({tenant, participantId, tariff}) => {
  const {t} = useLocale("common")
  const feeChosen = hasJoiningFee(tariff)
  const key = `${tenant}/${participantId}`
  const [loaded, setLoaded] = useState<{ key: string, state?: JoiningFeeState }>()

  useEffect(() => {
    if (!feeChosen || loaded?.key === key) return
    let current = true
    Api.eegService.fetchJoiningFeeState(tenant)
      .then(all => joiningFeeStateOf(all, participantId), () => undefined)
      .then(state => {
        if (current) setLoaded({key, state})
      })
    return () => { current = false }
  }, [key, feeChosen])

  if (loaded?.key !== key || !showJoiningFeeHint(loaded.state, tariff)) return null
  return (
    <p style={{color: "var(--ion-color-warning-shade)", fontSize: "0.85em", margin: "4px 16px 8px"}}>
      {t("joiningFee.hint_billed")}
    </p>
  )
}

export default JoiningFeeHint
