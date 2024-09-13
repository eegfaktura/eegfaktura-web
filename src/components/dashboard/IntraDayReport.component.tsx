import React, {FC, useEffect, useState} from "react";
import {Bar, BarChart, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis} from "recharts";

import {periodDisplayString} from "../../util/Helper.util";
import {IonIcon, IonSpinner, useIonPopover} from "@ionic/react";
import {Api} from "../../service";
import {ReportNamedData, SelectedPeriod} from "../../models/energy.model";
import ChartProperties from "./ChartProperties.component";
import {settings} from "ionicons/icons";
import {ActiveTenant} from "../../models/eeg.model";
import {LoadSharingData, transformData} from "./dashboard.functions";

import "./eeg-card.scss"
import "./IntraDayReport.component.scss"
import {calcXAxisHourNameV2, calcXAxisNameV2} from "./LoadCurveReport.functions";

const EMPTY_DATA = Array.from({length: 24}, (x, i) => {
  return {name: `${i.toString().padStart(2, '0')}:00`} as LoadSharingData}
)

interface IntraDayReportComponentProps {
  tenant: ActiveTenant;
  report: ReportNamedData[] | undefined;
  energyDate: {begin: string, end: string}
  activePeriod: SelectedPeriod
}

const IntraDayReportComponent: FC<IntraDayReportComponentProps> = ({tenant, report, energyDate, activePeriod}) => {

  const [selectedPeriod, setSelectedPeriod] = useState<SelectedPeriod>(activePeriod)
  const [data, setData] = useState<LoadSharingData[]>(EMPTY_DATA)
  const [loading, dismissLoading] = useState<boolean>(false);

  const [properties, dismiss] = useIonPopover(ChartProperties, {
    periods: energyDate, //{begin: "01.01.2023 00:00:0000", end: moment().format("DD.MM.YYYY HH:mm:ss")},
    selectedPeriod: selectedPeriod,
    onDismiss: (data: SelectedPeriod, role: string) => { dismiss(data, role)},
  });

  useEffect(() => {
    setData(transformData(report, calcXAxisHourNameV2))
  }, [report]);

  useEffect(() => {
    setSelectedPeriod(activePeriod)
  }, [activePeriod]);

  const onSelectionChanged = async (selectedPeriod: SelectedPeriod) => {
    if (selectedPeriod) {
      dismissLoading(true)
      Api.energyService.fetchIntraDayReportV2(tenant, selectedPeriod).then((d) => {
        dismissLoading(false)
        d !== null && setData(d.map((r, i) => {
          return {
            name: `${i.toString().padStart(2, '0')}:00`,
            consumed: r.consumed - r.distributed,
            produced: r.produced,
            distributed: r.distributed,
          } as LoadSharingData
        }))
      }).catch(() => {
        dismissLoading(false)
        setData(EMPTY_DATA)
      })
      setSelectedPeriod(selectedPeriod)
    }
  }

  // const renderLegend = (props: any) => {
  //   const {payload} = props;
  //   return (
  //     <ul>
  //       {
  //         payload.map((entry: any, index: any) => (
  //           <li key={`item-${index}`}>{entry.value}</li>
  //         ))
  //       }
  //     </ul>
  //   );
  // }

  if (!selectedPeriod || loading) {
    return <div style={{height: "100%", display: "flex"}}><IonSpinner style={{margin: "auto", height: "48px", width: "48px"}}></IonSpinner></div>
  } else {
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
              onDidDismiss: (e: CustomEvent) => onSelectionChanged(e.detail.data), // console.log(`OnDidDismiss ${e.detail.data}`)
              // size: "auto",
              cssClass: "property-popover"
            })}></IonIcon>
        </div>
        <div style={{display: "flex", flexFlow: "column", height: "100%"}}>
          <div style={{textAlign: "center", margin: "6px"}}>
            <div style={{fontSize: "24px"}}>Tagesverlauf</div>
            <div style={{fontSize: "14px"}}>Zeitraum: {periodDisplayString(selectedPeriod)}</div>
          </div>
          <div style={{display: "flex", flexFlow: "column", height: "100%", margin: "16px"}}>
            <div className={"eeg-card eeg-card-border"}
                 style={{flex: "1", width: "100%", height: "100%", minHeight: "100px"}}>
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
      </div>
    )
  }
}

export default IntraDayReportComponent