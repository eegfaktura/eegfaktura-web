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
import {IonButton, IonSpinner} from "@ionic/react";
import {dayBounds, formatDay} from "./DayView.functions";
import {useLocale} from "../../store/hook/useLocale";

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
  const {t} = useLocale("common")

  const [combinedReport, setCombinedReport] = useState<Record<string, ReportNamedData[] | undefined>>({intraday: undefined, loadcurve: undefined})
  // a failed load or an answer without data showed the spinner forever (platform#228); a failure now shows an error
  // with "Erneut versuchen", an answer without a report "no data"
  const [reportFailed, setReportFailed] = useState(false)
  const [reportLoaded, setReportLoaded] = useState(false)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let ignore = false   // a late answer for an earlier period or participant list sets nothing
    if (tenant && activePeriod) {
      setReportFailed(false)
      setReportLoaded(false)
      // dismissLoading(true)
      Api.energyService.fetchCombinedReportV2(tenant, ["intraday", "loadcurve"], activePeriod).then((d) => {
        // dismissLoading(false)
        if (ignore) return
        setCombinedReport((d ?? []).reduce((r, d) => {
          return {...r, [d.reportName]: d.reportData}
        }, {} as Record<string, ReportNamedData[] | undefined>))
        setReportLoaded(true)
      }).catch(() => {
        // dismissLoading(false)
        if (ignore) return
        setCombinedReport({intraday: undefined, loadcurve: undefined})
        setReportFailed(true)
      })
    }
    return () => { ignore = true }
  }, [activePeriod, participants, attempt]);

  const energyDate = useMemo(() => periods, [periods])

  // Day view (platform#210): "Tag" in a card's period popover; each card keeps its own day.
  const todayKey = formatDay(new Date())   // per render: an open dashboard reaches the new "yesterday" after midnight
  const bounds = useMemo(() => dayBounds(periods, new Date()), [periods, todayKey])

  const showChart = (report: ReportNamedData[] | undefined, children: ReactNode) => {
    if (reportFailed) {
      return (
        <div style={{height: "100%", display: "flex", flexFlow: "column", alignItems: "center", justifyContent: "center", gap: "10px"}}>
          <div>{t("dashboardCharts.load_failed")}</div>
          <IonButton size="small" onClick={() => setAttempt(a => a + 1)}>{t("dashboardCharts.retry")}</IonButton>
        </div>
      )
    }
    if (!report && reportLoaded) {
      return <div style={{height: "100%", display: "flex", alignItems: "center", justifyContent: "center"}}>{t("dashboardCharts.no_data")}</div>
    }
    if (report) {
      return children
    } else {
      return <div style={{height: "100%", display: "flex"}}><IonSpinner style={{margin: "auto", height: "48px", width: "48px"}}></IonSpinner></div>
    }
  }

  return (
    <div style={{display: "flex", flexFlow: "column", height: "100%", padding: "10px"}}>
      <div style={{flex: "1", display: "grid", gridTemplateColumns: "50% 50%", minHeight: 0}}>
        <div style={{display: "grid", gridTemplateRows: "50% 50%", overflowY: "auto"}}>
          <div className="eeg-card eeg-card-border" style={{margin: "10px"}}>
            <EegOverviewComponent participants={participants} rateMap={rates} />
          </div>
          <div className="eeg-card-border" style={{margin: "10px"}}>
            {showChart(combinedReport.intraday, <LoadSharingComponent activePeriod={activePeriod} report={combinedReport.loadcurve} tenant={tenant} energyDate={energyDate}
                                                                     dayRange={bounds}/>)}
          </div>
        </div>
        <div style={{display: "grid", gridTemplateRows: "50% 50%"}}>
          <div className="eeg-card-border" style={{margin: "10px", maxHeight: "100%"}}>
            <EnergyOverviewComponent consumed={consumed} allocated={allocated} produced={produced} rates={rates}/>
          </div>
          <div className="eeg-card-border" style={{margin: "10px"}}>
            {showChart(combinedReport.intraday, <IntraDayReportComponent activePeriod={activePeriod} tenant={tenant}
                                                                           dayRange={bounds}
                                                                           report={combinedReport.intraday}
                                                                           energyDate={energyDate}/>)}
          </div>
        </div>
      </div>
    </div>
  )
}

export default DashboardLayoutComponent