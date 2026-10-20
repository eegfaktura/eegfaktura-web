import React, {FC, useMemo} from "react";
import {useAppSelector} from "../../store";
import {meterSelector} from "../../store/participant";
import {EnergyRequestSummary, formatDay, summaryGroups} from "./EnergyRequestSummary.functions";

// platform#173: one notification per energy data request for several metering points
const EnergyRequestSummaryComponent: FC<{ summary: EnergyRequestSummary }> = ({summary}) => {
  const meters = useAppSelector(meterSelector)
  const names = useMemo(() => new Map(meters
    .filter(m => m.equipmentName && m.equipmentName.length > 0)
    .map(m => [m.meteringPoint, m.equipmentName])), [meters])
  const groups = summaryGroups(summary)

  return (
    <div>
      <p>
        <strong><u>Zusammenfassung Energiedaten-Anforderung</u></strong> {formatDay(summary.from)} – {formatDay(summary.to)}
        <br/>
        {summary.requested} Zählpunkte angefordert, {summary.complete} mit vollständigen Daten
      </p>
      {groups.length === 0 && <p>Alle Zählpunkte haben Daten für den ganzen Zeitraum geliefert.</p>}
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
    </div>
  )
}

export default EnergyRequestSummaryComponent
