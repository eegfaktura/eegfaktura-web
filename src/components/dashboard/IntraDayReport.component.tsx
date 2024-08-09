import {FC, useEffect, useState} from "react";
import {Bar, BarChart, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis} from "recharts";
import {useAppSelector} from "../../store";
import {selectedPeriodSelector} from "../../store/energy";

import "./eeg-card.scss"
import {periodDisplayString} from "../../util/Helper.util";
import {IonSpinner} from "@ionic/react";
import {Api} from "../../service";
import {useTenant} from "../../store/hook/Eeg.provider";

type LoadSharingData = {
  name: string
  consumed: number
  produced: number
  distributed: number
}

const EMPTY_DATA = Array.from({length: 24}, (x, i) => {
  return {name: `${i.toString().padStart(2, '0')}:00`} as LoadSharingData}
)

const IntraDayReportComponent: FC = () => {
  const activePeriod = useAppSelector(selectedPeriodSelector);
  const tenant = useTenant()

  const [data, setData] = useState<LoadSharingData[]>(EMPTY_DATA)

  useEffect(() => {
    if (tenant && activePeriod) {
      Api.energyService.fetchIntraDayReportV2(tenant, activePeriod).then((d) =>
          d !== null && setData(d.map((r, i) => {
            return {
              name: `${i.toString().padStart(2, '0')}:00`,
              consumed: r.consumed - r.distributed,
              produced: r.produced,
              distributed: r.distributed,
            } as LoadSharingData
          }))
      ).catch(() => setData(EMPTY_DATA))
    }
  }, [activePeriod]);

  // useEffect(() => {
  //   setData(EMPTY_DATA)
  // }, [tenant]);

  const renderLegend = (props: any) => {
    const {payload} = props;
    return (
      <ul>
        {
          payload.map((entry: any, index: any) => (
            <li key={`item-${index}`}>{entry.value}</li>
          ))
        }
      </ul>
    );
  }

  if (!activePeriod) {
    return <IonSpinner></IonSpinner>
  }

  return (
    <div style={{display: "flex", flexFlow: "column", height: "100%"}}>
      <div style={{textAlign: "center", margin: "6px"}}>
        <div style={{fontSize: "24px"}}>Tagesverlauf</div>
        {activePeriod && <div style={{fontSize: "14px"}}>Zeitraum: {periodDisplayString(activePeriod)}</div>}
      </div>
      <div style={{display: "flex", flexFlow: "column", height: "100%", margin: "16px"}}>
        <div className={"eeg-card eeg-card-border"} style={{flex: "1", width: "100%", height: "100%", minHeight: "100px"}}>
          <ResponsiveContainer width="100%" height="100%" minHeight="100px" minWidth="50px">
            <BarChart width={600} height={400} data={data} margin={{top: 15, right: 15, bottom: 5, left: 0}}>
              <YAxis fontSize={10} unit={" kWh"}/>
              <XAxis dataKey="name" angle={315} tickMargin={5} fontSize={10}/>
              <Tooltip formatter={(value) => Number(value).toFixed(3) + " kWh"}/>
              <Legend align={'center'} verticalAlign={'bottom'} height={20} wrapperStyle={{fontSize: "10px"}}/>
              {/*<Legend content={renderLegend} align={'center'} verticalAlign={'bottom'} height={40} fontSize={"4px"}/>*/}
              <Bar name="EEG" stackId="a" dataKey="distributed" fill="#0AF2D3"/>
              <Bar name="EVU" stackId="a" dataKey="consumed" fill="#F20A5E"/>
              <Bar name="Erzeugt" dataKey="produced" fill="#2B6860"/>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  )
}

export default IntraDayReportComponent