import React, {FC, useCallback, useContext, useEffect, useMemo, useState} from "react";
import {IonCard, IonCol, IonContent, IonGrid, IonPage, IonRow, IonSpinner} from "@ionic/react";
import {
  selectAllIntermediatesV2,
  selectedPeriodSelector
} from "../store/energy";
import {useAppSelector} from "../store";

import "./Dashboard.page.scss"
import DashboardLayoutComponent from "../components/dashboard/DashboardLayout.component";
import {ParticipantContext} from "../store/hook/ParticipantProvider";

export type PieSeriesType = {
  name: string;
  value: number;
  fill: string;
}

export type ReportSeriesType = {
  name: string, distributed: number, consumed: number, produced: number
}
const DashbaordPage: FC = () => {

  const intermediateSeriesV2 = useAppSelector(selectAllIntermediatesV2)
  const activePeriod = useAppSelector(selectedPeriodSelector);

  const {
    participants,
  } = useContext(ParticipantContext);

  const initialPeriod = useMemo(() => activePeriod, [activePeriod])
  const [allocatedSeries, consumedSeries, producedSeries] = useMemo(() => {
    const [allocated, consumed, produced, utilized] =
      intermediateSeriesV2.reduce(([a, b, c, d], s) =>
        ([
            a + s.allocation.reduce((as, a) => as + a, 0),
            b + s.consumption.reduce((bs, b) => bs + b, 0),
            c + s.production.reduce((cs, c) => cs + c, 0),
            d + s.utilization.reduce((cs, d) => cs + d, 0)
          ]),
        [0, 0, 0, 0])

    return [
      {name: "EEG", value: utilized, fill: '#1f7485'} as PieSeriesType,
      {name: "Verbrauch", value: consumed, fill: '#1657a6'} as PieSeriesType,
      {name: "Produktion", value: produced, fill: '#3a7234'} as PieSeriesType
    ]
  }, [intermediateSeriesV2])

  const style = {
    top: '10%',
    right: 0,
    // transform: 'translate(0, -50%)',
    lineHeight: '24px',
  };
  if (!initialPeriod) {
    return <div style={{height: "100%", display: "flex"}}><IonSpinner
      style={{margin: "auto", height: "48px", width: "48px"}}></IonSpinner></div>
  }

  return (
    <IonPage>
      <IonContent fullscreen color="eeg">
        <DashboardLayoutComponent participants={participants} consumed={consumedSeries} produced={producedSeries}
                                  allocated={allocatedSeries} activePeriod={initialPeriod}/>
      </IonContent>
    </IonPage>
  )
}

export default DashbaordPage;