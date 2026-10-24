import React, {FC, ReactNode, useMemo} from "react";
import {IonButton, IonSpinner} from "@ionic/react";
import {Bar, BarChart, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis} from "recharts";
import {DayReportState} from "./DayView.component";
import {formatDay, hasEnergy, toHours} from "./DayView.functions";

import "./eeg-card.scss"

const formatKwh = (value: unknown) => Number(value).toFixed(3) + " kWh"

interface DayChartProps {
  day: Date
  state: DayReportState
  onRetry: () => void
}

const DayCard: FC<{ title: string, day: Date, children: ReactNode }> = ({title, day, children}) => (
  <div style={{display: "flex", flexFlow: "column", height: "100%"}}>
    <div style={{textAlign: "center", margin: "6px"}}>
      <div style={{fontSize: "24px"}}>{title}</div>
      <div style={{fontSize: "14px"}}>Tag: {formatDay(day)}</div>
    </div>
    <div style={{display: "flex", flexFlow: "column", height: "100%", margin: "16px"}}>
      <div className={"eeg-card-chart eeg-card-border"}
           style={{flex: "1", width: "100%", height: "100%", minHeight: "100px"}}>
        {children}
      </div>
    </div>
  </div>
)

// Spinner, error with retry, or "no data" instead of an empty chart; otherwise the chart.
const DayState: FC<DayChartProps & { children: ReactNode }> = ({state, onRetry, children}) => {
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

// "Lastverlauf" of one day: quarter-hour lines Produktion, Verbrauch, Eigendeckung.
export const DayLoadCurveChart: FC<DayChartProps> = (props) => {
  const data = props.state.status === "ok" ? props.state.quarters : []
  return (
    <DayCard title="Lastverlauf" day={props.day}>
      <DayState {...props}>
        <ResponsiveContainer width="100%" height="100%" minHeight={100} minWidth={50}>
          <LineChart data={data} margin={{top: 15, right: 15, bottom: 5, left: 0}}>
            <YAxis fontSize={10} unit={" kWh"}/>
            <XAxis dataKey="label" angle={315} tickMargin={5} fontSize={10} interval={7}/>
            <Tooltip formatter={formatKwh}/>
            <Legend align={'center'} verticalAlign={'bottom'} height={20} wrapperStyle={{fontSize: "10px"}}/>
            <Line name="Produktion" dataKey="produced" stroke="#2B6860" dot={false} isAnimationActive={false}/>
            <Line name="Verbrauch" dataKey="consumed" stroke="#F20A5E" dot={false} isAnimationActive={false}/>
            <Line name="Eigendeckung" dataKey="distributed" stroke="#0AF2D3" dot={false} isAnimationActive={false}/>
          </LineChart>
        </ResponsiveContainer>
      </DayState>
    </DayCard>
  )
}

// "Tagesverlauf" of one day: hourly bars EEG and EVU stacked, Produziert beside them.
export const DayHourChart: FC<DayChartProps> = (props) => {
  const data = useMemo(() => props.state.status === "ok" ? toHours(props.state.quarters) : [], [props.state])
  return (
    <DayCard title="Tagesverlauf" day={props.day}>
      <DayState {...props}>
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
