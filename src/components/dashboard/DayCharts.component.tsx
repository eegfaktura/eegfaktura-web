import React, {FC, ReactNode, useMemo} from "react";
import {IonButton, IonIcon, IonSpinner} from "@ionic/react";
import {chevronBack, chevronForward, settings} from "ionicons/icons";
import {Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis} from "recharts";
import {ActiveTenant} from "../../models/eeg.model";
import {useDayReport} from "./DayView.component";
import {DayBounds, DayReportState, daySums, formatDay, hasEnergy, shiftDay, toHours} from "./DayView.functions";
import {BALANCE_HELP, balanceOf, balanceText, isBalanced} from "./Balance.functions";

import "./eeg-card.scss"

const formatKwh = (value: unknown) => Number(value).toFixed(3) + " kWh"
const kwh = (v: number) => `${v.toLocaleString("de-AT", {minimumFractionDigits: 3, maximumFractionDigits: 3})} kWh`

// A card in day mode ("Tag" chosen in its period popover): its own day, arrows and gear.
export interface DayChartProps {
  tenant: ActiveTenant
  day: Date
  bounds: DayBounds
  onDayChange: (day: Date) => void
  onProperties: (e: any) => void
}

const DayCard: FC<DayChartProps & { title: string, state: DayReportState, children: ReactNode }> =
  ({title, day, bounds, onDayChange, onProperties, state, children}) => {
  const sums = state.status === "ok" && hasEnergy(state.quarters) ? daySums(state.quarters) : undefined
  return (
    <div style={{position: "relative", height: "100%", width: "100%"}}>
      <div style={{position: "absolute", top: "4px", right: "4px", height: "26px", width: "26px", fontSize: "24px", cursor: "pointer"}}>
        <IonIcon icon={settings} color="primary" aria-label="Zeitraum wählen" onClick={onProperties}/>
      </div>
      <div style={{display: "flex", flexFlow: "column", height: "100%"}}>
        <div style={{textAlign: "center", margin: "6px"}}>
          <div style={{fontSize: "24px"}}>{title}</div>
          <div style={{display: "flex", alignItems: "center", justifyContent: "center", fontSize: "14px"}}>
            <IonButton fill="clear" size="small" aria-label="Vorheriger Tag" disabled={day.getTime() <= bounds.first.getTime()}
                       onClick={() => onDayChange(shiftDay(day, -1, bounds))}>
              <IonIcon slot="icon-only" icon={chevronBack}/>
            </IonButton>
            <div>Tag: {formatDay(day)}</div>
            <IonButton fill="clear" size="small" aria-label="Nächster Tag" disabled={day.getTime() >= bounds.last.getTime()}
                       onClick={() => onDayChange(shiftDay(day, 1, bounds))}>
              <IonIcon slot="icon-only" icon={chevronForward}/>
            </IonButton>
          </div>
          {sums && (
            <div style={{fontSize: "12px"}}>
              Produktion {kwh(sums.produced)} · Verbrauch {kwh(sums.consumed)} · Eigendeckung {kwh(sums.distributed)} ·
              Überschuss {kwh(sums.unused)} ·{" "}
              <span title={BALANCE_HELP} style={isBalanced(balanceOf(sums)) ? undefined : {color: "#F20A5E", fontWeight: "bold"}}>
                {balanceText(balanceOf(sums))}
              </span>
            </div>
          )}
        </div>
        <div style={{display: "flex", flexFlow: "column", height: "100%", margin: "16px"}}>
          <div className={"eeg-card-chart eeg-card-border"}
               style={{flex: "1", width: "100%", height: "100%", minHeight: "100px"}}>
            {children}
          </div>
        </div>
      </div>
    </div>
  )
}

// Spinner, error with retry, or "no data" instead of an empty chart; otherwise the chart.
const DayState: FC<{ state: DayReportState, onRetry: () => void, children: ReactNode }> = ({state, onRetry, children}) => {
  const center = {height: "100%", display: "flex", flexFlow: "column", alignItems: "center", justifyContent: "center", gap: "8px"} as const
  switch (state.status) {
    case "loading":
      return <div style={center}><IonSpinner style={{height: "48px", width: "48px"}}/></div>
    case "error":
      return (
        <div style={center}>
          <div>{`Die Energiedaten des Tages konnten nicht geladen werden. (${state.message})`}</div>
          <IonButton size="small" onClick={onRetry}>Erneut versuchen</IonButton>
        </div>
      )
    default:
      return hasEnergy(state.quarters)
        ? <>{children}</>
        : <div style={center}>Für diesen Tag gibt es keine Energiedaten.</div>
  }
}

// "Lastverlauf" of one day: quarter-hour lines, styled like the day chart of a metering point
// (participantPane/MeterChart.component.tsx: monotone, no dots, width 2, its EEG/EVU colours, grid, tick density).
// Produktion is drawn last: when the community uses all its production, Eigendeckung equals Produktion and used to
// hide the Produktion line.
export const DayLoadCurveChart: FC<DayChartProps> = (props) => {
  const {state, reload} = useDayReport(props.tenant, props.day)
  const data = useMemo(() => state.status === "ok" ? state.quarters.map(q => ({...q, balance: balanceOf(q)})) : [], [state])
  return (
    <DayCard {...props} title="Lastverlauf" state={state}>
      <DayState state={state} onRetry={reload}>
        <ResponsiveContainer width="100%" height="100%" minHeight={100} minWidth={50}>
          <LineChart data={data} margin={{top: 15, right: 15, bottom: 5, left: 0}}>
            <CartesianGrid strokeDasharray="3 3"/>
            <XAxis dataKey="label" interval="preserveStart" minTickGap={20} fontSize={10}/>
            <YAxis fontSize={10} unit={" kWh"}/>
            <Tooltip formatter={formatKwh}/>
            <Legend align={'center'} verticalAlign={'bottom'} height={20} wrapperStyle={{fontSize: "10px"}}/>
            <Line name="Verbrauch" type="monotone" dataKey="consumed" stroke="#8884d8" dot={false} strokeWidth={2}/>
            <Line name="Eigendeckung" type="monotone" dataKey="distributed" stroke="#82ca9d" dot={false} strokeWidth={2}/>
            <Line name="Produktion" type="monotone" dataKey="produced" stroke="#2B6860" dot={false} strokeWidth={2}/>
            <Line name="Bilanzdifferenz" type="monotone" dataKey="balance" stroke="#F20A5E" dot={false} strokeWidth={2}
                  strokeDasharray="5 3"/>
          </LineChart>
        </ResponsiveContainer>
      </DayState>
    </DayCard>
  )
}

// "Tagesverlauf" of one day: hourly bars EEG and EVU stacked, Produziert beside them.
export const DayHourChart: FC<DayChartProps> = (props) => {
  const {state, reload} = useDayReport(props.tenant, props.day)
  const data = useMemo(() => state.status === "ok" ? toHours(state.quarters) : [], [state])
  return (
    <DayCard {...props} title="Tagesverlauf" state={state}>
      <DayState state={state} onRetry={reload}>
        <ResponsiveContainer width="100%" height="100%" minHeight={100} minWidth={50}>
          <BarChart data={data} margin={{top: 15, right: 15, bottom: 5, left: 0}}>
            <YAxis fontSize={10} unit={" kWh"}/>
            <XAxis dataKey="label" angle={315} tickMargin={5} fontSize={10}/>
            <Tooltip formatter={formatKwh}/>
            <Legend align={'center'} verticalAlign={'bottom'} height={20} wrapperStyle={{fontSize: "10px"}}/>
            <Bar name="EEG" stackId="a" dataKey="eeg" fill="#0AF2D3"/>
            <Bar name="EVU" stackId="a" dataKey="evu" fill="#F20A5E"/>
            <Bar name="Produziert" dataKey="produced" fill="#2B6860"/>
          </BarChart>
        </ResponsiveContainer>
      </DayState>
    </DayCard>
  )
}
