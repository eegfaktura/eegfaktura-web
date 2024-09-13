import React, {FC, useEffect, useState} from "react";
import {ReportNamedData, SelectedPeriod} from "../../models/energy.model";
import {Bar, ComposedChart, Legend, Line, ResponsiveContainer, Tooltip, XAxis, YAxis} from "recharts";
import {periodDisplayString} from "../../util/Helper.util";
import {IonIcon, IonSpinner, useIonPopover} from "@ionic/react";
import {ActiveTenant} from "../../models/eeg.model";
import {Api} from "../../service";
import ChartProperties from "./ChartProperties.component";
import {settings} from "ionicons/icons";

import './LoadCurveReport.component.scss'
import {calcXAxisNameV2} from "./LoadCurveReport.functions";
import {transformData} from "./dashboard.functions";
import {NameType, ValueType} from "recharts/types/component/DefaultTooltipContent";

interface LoadSharingComponentProps {
  tenant: ActiveTenant;
  report: ReportNamedData[] | undefined;
  activePeriod: SelectedPeriod;
  energyDate: { begin: string, end: string };
}

type LoadSharingData = {
  name: string
  consumed: number
  produced: number
  distributed: number
  cntCons?: number
}

const EMPTY_LOAD_CURVE_DATA = {} as LoadSharingData

const LoadSharingComponent: FC<LoadSharingComponentProps> = ({tenant, report, activePeriod, energyDate}) => {

  // const chartData = transformData(report, calcXAxisNameV2)
  // console.log("Render Load Curve Screen", chartData)
  const [data, setData] = useState<LoadSharingData[]>([EMPTY_LOAD_CURVE_DATA] as LoadSharingData[])
  const [selectedPeriod, setSelectedPeriod] = useState<SelectedPeriod>(activePeriod)
  const [loading, dismissLoading] = useState<boolean>(false);

  useEffect(() => {
    setData(transformData(report, calcXAxisNameV2))
  }, [report]);

  useEffect(() => {
    setSelectedPeriod(activePeriod)
  }, [activePeriod]);

  const [properties, dismiss] = useIonPopover(ChartProperties, {
    periods: energyDate, //{begin: "01.01.2023 00:00:0000", end: moment().format("DD.MM.YYYY HH:mm:ss")},
    selectedPeriod: selectedPeriod,
    onDismiss: (data: SelectedPeriod, role: string) => { dismiss(data, role)},
  });

  const onSelectionChanged = async (selectedPeriod: SelectedPeriod) => {
    if (selectedPeriod) {
      dismissLoading(true)
      Api.energyService.fetchLoadCurveReportV2(tenant, selectedPeriod).then((d) => {
        dismissLoading(false)
        d !== null && setData(transformData(d, calcXAxisNameV2))
      }).catch(() => {
        dismissLoading(false)
        setData([EMPTY_LOAD_CURVE_DATA] as LoadSharingData[])
      })
      setSelectedPeriod(selectedPeriod)
    }
  }

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

  const tooltipFormater = (arg: ValueType, name: NameType/*, props: Payload<ValueType, NameType>*/) => {
    // console.log("tooltip", arg, name, props)
    switch (name) {
      case 'Abnehmer':
      case 'Einspeiser':
        return Number(arg)
      default:
        return Number(arg).toFixed(3) + " kWh"
    }
  }

  if (!selectedPeriod || loading) {
    return <div style={{height: "100%", display: "flex"}}><IonSpinner
      style={{margin: "auto", height: "48px", width: "48px"}}></IonSpinner></div>
  }

  return (
    <div style={{position: "relative", height: "100%", width: "100%"}}>
      <div style={{
        position: "absolute",
        top: "4px",
        right: "4px",
        height: "26px",
        width: "26px",
        fontSize: "24px",
        cursor: "pointer"
      }}>
        <IonIcon icon={settings} size="32px" color="primary" onClick={(e: any) =>
          properties({
            event: e,
            onDidDismiss: (e: CustomEvent) => onSelectionChanged(e.detail.data),
            cssClass: "property-popover"
          })}></IonIcon>
      </div>
      <div style={{display: "flex", flexFlow: "column", height: "100%"}}>
        <div style={{textAlign: "center", margin: "6px"}}>
          <div style={{fontSize: "24px"}}>Lastverlauf</div>
          <div style={{fontSize: "14px"}}>Zeitraum: {periodDisplayString(selectedPeriod)}</div>
        </div>
        <div style={{display: "flex", flexFlow: "column", height: "100%", margin: "16px"}}>
          <div className={"eeg-card eeg-card-border"}
               style={{flex: "1", width: "100%", height: "100%", minHeight: "100px"}}>
            <ResponsiveContainer width="100%" height={"100%"} minHeight={300} minWidth={100}>
              <ComposedChart width={600} height={400} data={data} margin={{top: 15, right: 15, bottom: 5, left: 0}}>
              {/*<BarChart width={600} height={400} data={data} margin={{top: 15, right: 15, bottom: 5, left: 0}}>*/}
                <YAxis yAxisId="left" orientation="left" fontSize={10} unit={" kWh"}/>
                <YAxis yAxisId="right" orientation="right" stroke="#82ca9d" fontSize={10} unit={""}/>
                <XAxis dataKey="name" angle={315} tickMargin={5} fontSize={10}/>
                <Tooltip formatter={tooltipFormater}/>
                <Legend align={'center'} verticalAlign={'bottom'} height={20} wrapperStyle={{fontSize: "10px"}}/>
                {/*<Legend content={renderLegend} align={'center'} verticalAlign={'bottom'} height={40} fontSize={"4px"}/>*/}
                <Bar yAxisId="left" name="EEG" stackId="a" dataKey="distributed" fill="#0AF2D3"/>
                <Bar yAxisId="left" name="EVU" stackId="a" dataKey="consumed" fill="#F20A5E"/>
                <Bar yAxisId="left" name="Erzeugt" dataKey="produced" fill="#2B6860"/>
              {/*</BarChart>*/}
              <Line yAxisId="right" type="monotone" name="Abnehmer" dataKey="cntCons" stroke="#ff7300" />
              <Line yAxisId="right" type="monotone" name="Einspeiser" dataKey="cntProd" stroke="#456035FF" />
            </ComposedChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  )
}

export default LoadSharingComponent