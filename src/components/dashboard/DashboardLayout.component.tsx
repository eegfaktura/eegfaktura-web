import React, {FC, ReactNode, useEffect, useMemo, useState} from "react";
import {ReportNamedData, SelectedPeriod} from "../../models/energy.model";
import {PieSeriesType} from "../../pages/Dashboard.page";
import LoadSharingComponent from "./LoadSharing.component";
import IntraDayReportComponent from "./IntraDayReport.component";
import EnergyOverviewComponent from "./EnergyOverview.component";
import {EegParticipant} from "../../models/members.model";
import EegOverviewComponent from "./EegOverview.component";
import {useAppSelector} from "../../store";
import {ratesMapSelector} from "../../store/rate";

import "./eeg-card.scss"
import {periodsSelector, selectedPeriodSelector} from "../../store/energy";
import {useTenant} from "../../store/hook/Eeg.provider";
import {Api} from "../../service";
import {IonSpinner} from "@ionic/react";
import {DashboardMode, DayToolbar, useDayReport} from "./DayView.component";
import {DayHourChart, DayLoadCurveChart} from "./DayCharts.component";
import {clampDay, dayBounds, daySums} from "./DayView.functions";

interface LoadSharingComponentProps {
  participants: EegParticipant[]
  consumed: PieSeriesType
  produced: PieSeriesType
  allocated: PieSeriesType
  activePeriod: SelectedPeriod
}
const DashboardLayoutComponent: FC<LoadSharingComponentProps> = ({consumed, produced, allocated, participants, activePeriod}) => {
  const rates = useAppSelector(ratesMapSelector)
  // const activePeriod = useAppSelector(selectedPeriodSelector);
  const periods = useAppSelector(periodsSelector);
  const tenant = useTenant()

  const [combinedReport, setCombinedReport] = useState<Record<string, ReportNamedData[] | undefined>>({intraday: undefined, loadcurve: undefined})

  useEffect(() => {
    if (tenant && activePeriod) {
      // dismissLoading(true)
      Api.energyService.fetchCombinedReportV2(tenant, ["intraday", "loadcurve"], activePeriod).then((d) => {
        // dismissLoading(false)
        d !== null && setCombinedReport(d.reduce((r, d) => {
          return {...r, [d.reportName]: d.reportData}
        }, {}))
      }).catch(() => {
        // dismissLoading(false)
        setCombinedReport({intraday: undefined, loadcurve: undefined})
      })
    }
  }, [activePeriod, participants]);

  const energyDate = useMemo(() => periods, [periods])

  // Day view (platform#210): one day of the selected period, whole community, quarter hours.
  const [mode, setMode] = useState<DashboardMode>("period")
  const [day, setDay] = useState<Date | undefined>(undefined)
  const bounds = useMemo(() => dayBounds(activePeriod, periods, new Date()), [activePeriod, periods])
  useEffect(() => { setDay(d => clampDay(d, bounds)) }, [bounds])
  const {state: dayState, reload: reloadDay} = useDayReport(tenant, mode === "day" ? day : undefined)
  const sums = useMemo(() => dayState.status === "ok" ? daySums(dayState.quarters) : undefined, [dayState])
  const showDay = mode === "day" && day !== undefined

  const showChart = (report: ReportNamedData[] | undefined, children: ReactNode) => {
    if (report) {
      return children
    } else {
      return <div style={{height: "100%", display: "flex"}}><IonSpinner style={{margin: "auto", height: "48px", width: "48px"}}></IonSpinner></div>
    }
  }

  return (
    <div style={{display: "flex", flexFlow: "column", height: "100%", padding: "10px"}}>
      <DayToolbar mode={mode} onModeChange={setMode} day={day} bounds={bounds} onDayChange={setDay} sums={sums}/>
      <div style={{flex: "1", display: "grid", gridTemplateColumns: "50% 50%", minHeight: 0}}>
        <div style={{display: "grid", gridTemplateRows: "50% 50%", overflowY: "auto"}}>
          <div className="eeg-card eeg-card-border" style={{margin: "10px"}}>
            <EegOverviewComponent participants={participants} rateMap={rates} />
          </div>
          <div className="eeg-card-border" style={{margin: "10px"}}>
            {showDay ? <DayLoadCurveChart day={day} state={dayState} onRetry={reloadDay}/> :
              showChart(combinedReport.intraday, <LoadSharingComponent activePeriod={activePeriod} report={combinedReport.loadcurve} tenant={tenant} energyDate={energyDate}/>)}
          </div>
        </div>
        <div style={{display: "grid", gridTemplateRows: "50% 50%"}}>
          <div className="eeg-card-border" style={{margin: "10px", maxHeight: "100%"}}>
            <EnergyOverviewComponent consumed={consumed} allocated={allocated} produced={produced} rates={rates}/>
          </div>
          <div className="eeg-card-border" style={{margin: "10px"}}>
            {showDay ? <DayHourChart day={day} state={dayState} onRetry={reloadDay}/> :
              showChart(combinedReport.intraday, <IntraDayReportComponent activePeriod={activePeriod} tenant={tenant}
                                                                           report={combinedReport.intraday}
                                                                           energyDate={energyDate}/>)}
          </div>
        </div>
      </div>
    </div>
  )
}

export default DashboardLayoutComponent