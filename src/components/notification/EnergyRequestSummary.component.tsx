import React, {FC, useEffect, useMemo, useRef, useState} from "react";
import {IonButton, IonChip} from "@ionic/react";
import {useAppSelector} from "../../store";
import {allParticipantsSelector, meterSelector} from "../../store/participant";
import {useTenant} from "../../store/hook/Eeg.provider";
import {Api} from "../../service";
import {BillingCheckOverview, buildBillingCheckRequest, evaluateBillingChecks} from "../participantPane/BillingCheck.functions";
import {incompleteText} from "../participantPane/BillingCheck.dialog";
import {
  acceptedMetersToCheck,
  EnergyRequestSummary,
  formatDay,
  meterCount,
  meterNames,
  summaryGroups
} from "./EnergyRequestSummary.functions";

type DataCheck =
  { state: 'idle' }
  | { state: 'running' }
  | { state: 'done', result: BillingCheckOverview['completeness'], notCheckable: string[] }

// platform#173: one notification per energy data request for several metering points. The answers come with the
// notification; the energy data of the accepted metering points is checked on demand, so it is current when checked.
const EnergyRequestSummaryComponent: FC<{ summary: EnergyRequestSummary }> = ({summary}) => {
  const meters = useAppSelector(meterSelector)
  const participants = useAppSelector(allParticipantsSelector)
  const tenant = useTenant()
  const [check, setCheck] = useState<DataCheck>({state: 'idle'})
  const controller = useRef<AbortController>()

  useEffect(() => () => controller.current?.abort(), [])

  const names = useMemo(() => meterNames(meters), [meters])
  const groups = summaryGroups(summary)
  const accepted = summary.accepted ?? []

  const checkData = () => {
    const {toCheck, notCheckable} = acceptedMetersToCheck(summary, participants)
    controller.current?.abort()
    const c = new AbortController()
    controller.current = c
    setCheck({state: 'running'})
    const request = toCheck.length > 0
      ? Api.energyService.fetchBillingCheck(tenant, buildBillingCheckRequest(toCheck, new Date(summary.from), new Date(summary.to)), c.signal)
        .then(res => evaluateBillingChecks(toCheck, {}, res))
        .catch(() => evaluateBillingChecks(toCheck, {}, {error: "Energiedaten konnten nicht abgefragt werden."}))
      : Promise.resolve(evaluateBillingChecks(toCheck, {}, {error: "Keiner der angenommenen Zählpunkte ist geladen."}))
    request.then(o => {
      if (!c.signal.aborted) setCheck({state: 'done', result: o.completeness, notCheckable})
    })
  }

  const renderDataCheck = () => {
    if (check.state === 'running') {
      return <p>Datenstand wird geprüft …</p>
    }
    const button = <IonButton size="small" fill="outline" onClick={checkData}>
      {check.state === 'idle' ? "Datenstand prüfen" : "Erneut prüfen"}
    </IonButton>
    if (check.state === 'idle') {
      return button
    }
    const {status, incomplete, reason} = check.result
    return (
      <>
        {status === 'NOT_CHECKED' && <p>{reason}</p>}
        {status !== 'NOT_CHECKED' && incomplete.length === 0 && check.notCheckable.length === 0 &&
          <p>Alle angenommenen Zählpunkte haben Daten für den ganzen Zeitraum.</p>}
        {incomplete.length > 0 && (
          <details open>
            <summary>Daten unvollständig ({incomplete.length})</summary>
            <ul style={{margin: "4px 0"}}>
              {incomplete.map(m => <li key={m.meter.meteringPoint}>{incompleteText(m)}</li>)}
            </ul>
          </details>
        )}
        {check.notCheckable.length > 0 && (
          <details open>
            <summary>Nicht prüfbar, Zählpunkt nicht geladen ({check.notCheckable.length})</summary>
            <ul style={{margin: "4px 0"}}>
              {check.notCheckable.map(m => <li key={m}>{m}</li>)}
            </ul>
          </details>
        )}
        {button}
      </>
    )
  }

  return (
    <div>
      <p>
        <strong><u>{summary.live ? "Energiedaten-Anforderung läuft" : "Zusammenfassung Energiedaten-Anforderung"}</u></strong>
        {summary.live && <IonChip color="primary" style={{height: "20px", fontSize: "12px", margin: "0 4px"}}>läuft</IonChip>}
        {" "}{formatDay(summary.from)} – {formatDay(summary.to)}
        <br/>
        {meterCount(summary.requested)} angefordert, {accepted.length} angenommen
      </p>
      {groups.length === 0 && <p>Alle Zählpunkte wurden angefordert und angenommen.</p>}
      {groups.map(g => (
        <details key={g.title}>
          <summary>{g.title} ({g.lines.length})</summary>
          <ul style={{margin: "4px 0"}}>
            {g.lines.map(l => (
              <li key={l.meteringPoint}>
                {l.meteringPoint}
                {names.get(l.meteringPoint) ? ` ${names.get(l.meteringPoint)}` : ""}
                {l.detail ? ` – ${l.detail}` : ""}
              </li>
            ))}
          </ul>
        </details>
      ))}
      {accepted.length > 0 && renderDataCheck()}
    </div>
  )
}

export default EnergyRequestSummaryComponent
