import React, {FC, useMemo, useState} from "react";
import {IonButton} from "@ionic/react";
import {useAppSelector} from "../../store";
import {allParticipantsSelector, meterSelector} from "../../store/participant";
import {useTenant} from "../../store/hook/Eeg.provider";
import {Api} from "../../service";
import {BillingCheckOverview, buildBillingCheckRequest, evaluateBillingChecks} from "../participantPane/BillingCheck.functions";
import {incompleteText} from "../participantPane/BillingCheck.dialog";
import {acceptedMetersToCheck, EnergyRequestSummary, formatDay, summaryGroups} from "./EnergyRequestSummary.functions";

type DataCheck = { state: 'idle' } | { state: 'running' } | { state: 'done', result: BillingCheckOverview['completeness'] }

// platform#173: one notification per energy data request for several metering points. The answers come with the
// notification; the energy data of the accepted metering points is checked on demand, so it is always current.
const EnergyRequestSummaryComponent: FC<{ summary: EnergyRequestSummary }> = ({summary}) => {
  const meters = useAppSelector(meterSelector)
  const participants = useAppSelector(allParticipantsSelector)
  const tenant = useTenant()
  const [check, setCheck] = useState<DataCheck>({state: 'idle'})

  const names = useMemo(() => new Map(meters
    .filter(m => m.equipmentName && m.equipmentName.length > 0)
    .map(m => [m.meteringPoint, m.equipmentName])), [meters])
  const groups = summaryGroups(summary)
  const accepted = summary.accepted ?? []

  const checkData = () => {
    const toCheck = acceptedMetersToCheck(summary, participants)
    const start = new Date(summary.from), end = new Date(summary.to)
    setCheck({state: 'running'})
    Api.energyService.fetchBillingCheck(tenant, buildBillingCheckRequest(toCheck, start, end))
      .then(res => evaluateBillingChecks(toCheck, {}, res))
      .catch(() => evaluateBillingChecks(toCheck, {}, {error: "Energiedaten konnten nicht abgefragt werden."}))
      .then(o => setCheck({state: 'done', result: o.completeness}))
  }

  const renderDataCheck = () => {
    if (check.state === 'idle') {
      return <IonButton size="small" fill="outline" onClick={checkData}>Datenstand prüfen</IonButton>
    }
    if (check.state === 'running') {
      return <p>Datenstand wird geprüft …</p>
    }
    const {status, incomplete, reason} = check.result
    if (status === 'NOT_CHECKED') {
      return <p>{reason}</p>
    }
    if (incomplete.length === 0) {
      return <p>Alle angenommenen Zählpunkte haben Daten für den ganzen Zeitraum.</p>
    }
    return (
      <details open>
        <summary>Daten unvollständig ({incomplete.length})</summary>
        <ul style={{margin: "4px 0"}}>
          {incomplete.map(m => <li key={`${m.meter.meteringPoint}-${m.meter.activeSince}`}>{incompleteText(m)}</li>)}
        </ul>
      </details>
    )
  }

  return (
    <div>
      <p>
        <strong><u>Zusammenfassung Energiedaten-Anforderung</u></strong> {formatDay(summary.from)} – {formatDay(summary.to)}
        <br/>
        {summary.requested} Zählpunkte angefordert, {accepted.length} angenommen
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
