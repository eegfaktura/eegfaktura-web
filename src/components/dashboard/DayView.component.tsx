import React, {FC, useCallback, useEffect, useRef, useState} from "react";
import {IonButton, IonIcon} from "@ionic/react";
import {chevronBack, chevronForward, settings} from "ionicons/icons";
import {ActiveTenant} from "../../models/eeg.model";
import {Api} from "../../service";
import {
  DayBounds, DayReportState, DaySums, dayRequestRange, formatDay, shiftDay, startOfDay, stateForDay, toQuarterHours
} from "./DayView.functions";

export type DashboardMode = "period" | "day"

// Loads the quarter hours of one day for the whole community. A slower, older answer (fast paging) never
// overwrites the answer for the day shown now.
export const useDayReport = (tenant: ActiveTenant | undefined, day: Date | undefined) => {
  const [state, setState] = useState<DayReportState>({status: "loading"})
  const request = useRef(0)

  const load = useCallback(() => {
    if (!tenant || !day) return
    const id = ++request.current
    const key = startOfDay(day).getTime()
    setState({status: "loading", day: key})
    const {start, end} = dayRequestRange(day)
    Api.energyService.fetchLoadCurveRangeV2(tenant, start, end)
      .then(report => { if (id === request.current) setState({status: "ok", day: key, quarters: toQuarterHours(report)}) })
      .catch((e: unknown) => {
        if (id === request.current) setState({status: "error", day: key, message: e instanceof Error ? e.message : String(e)})
      })
  }, [tenant, day?.getTime()])

  useEffect(() => { load() }, [load])

  return {state: stateForDay(state, day), reload: load}
}

const kwh = (v: number) => `${v.toLocaleString("de-AT", {minimumFractionDigits: 3, maximumFractionDigits: 3})} kWh`

interface DayToolbarProps {
  day: Date | undefined
  bounds: DayBounds | undefined
  onDayChange: (day: Date) => void
  sums: DaySums | undefined
  onProperties: (e: any) => void   // the period popover (gear), as on the other dashboard cards
}

export const DayToolbar: FC<DayToolbarProps> = ({day, bounds, onDayChange, sums, onProperties}) => {
  const atFirst = !day || !bounds || day.getTime() <= bounds.first.getTime()
  const atLast = !day || !bounds || day.getTime() >= bounds.last.getTime()

  return (
    <div style={{display: "flex", alignItems: "center", flexWrap: "wrap", gap: "12px", padding: "0 20px"}}>
      <IonIcon icon={settings} color="primary" style={{fontSize: "24px", cursor: "pointer"}} aria-label="Zeitraum wählen"
               onClick={onProperties}/>
      {bounds && day ? (
        <>
          <div style={{display: "flex", alignItems: "center"}}>
            <IonButton fill="clear" size="small" disabled={atFirst} aria-label="Vorheriger Tag"
                       onClick={() => onDayChange(shiftDay(day, -1, bounds))}>
              <IonIcon slot="icon-only" icon={chevronBack}/>
            </IonButton>
            <div style={{minWidth: "90px", textAlign: "center"}}>{formatDay(day)}</div>
            <IonButton fill="clear" size="small" disabled={atLast} aria-label="Nächster Tag"
                       onClick={() => onDayChange(shiftDay(day, 1, bounds))}>
              <IonIcon slot="icon-only" icon={chevronForward}/>
            </IonButton>
          </div>
          {sums && (
            <div style={{fontSize: "13px"}}>
              Tagessumme: Produktion {kwh(sums.produced)} · Verbrauch {kwh(sums.consumed)} ·
              Eigendeckung {kwh(sums.distributed)} · Überschuss {kwh(sums.unused)}
            </div>
          )}
        </>
      ) : (
        <div style={{fontSize: "14px"}}>Es gibt keinen Tag mit Energiedaten.</div>
      )}
    </div>
  )
}
