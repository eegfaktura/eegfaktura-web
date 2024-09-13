import React, {FC, useCallback, useEffect, useState} from "react";
import {IonButton, IonButtons} from "@ionic/react";
import {createNewPeriod} from "../../util/Helper.util";
import {
  EegEnergyReport,
  EnergySeries,
  ReportType,
  SelectedPeriod
} from "../../models/energy.model";
import PeriodSelectorElement from "../core/PeriodSelector.element";
import {useAppSelector} from "../../store";
import {periodsSelector} from "../../store/energy";

interface MeterChartNavbarComponentProps {
  selectedMeterId: string
  activePeriod: SelectedPeriod
  onSelectionChanged: (selectedPeriod: SelectedPeriod) => void
}

const MeterChartNavbarComponent: FC<MeterChartNavbarComponentProps> = ({selectedMeterId, activePeriod, onSelectionChanged}) => {
  const periods = useAppSelector(periodsSelector);

  const [selectedPeriod, setSelectedPeriod] = useState<SelectedPeriod|undefined>(activePeriod)
  const [lastSegmentIdx, setLastSegmentIdx] = useState<number>(1)

  useEffect(() => {
    setSelectedPeriod(activePeriod)
  }, [activePeriod, selectedMeterId])

  const isPeriodSelected = (periodType: string) => selectedPeriod?.type === periodType

  const selectLastSegmentIdx = (series: EnergySeries[]) => {
    if (series && series.length > 0) {
      setLastSegmentIdx(series[series.length-1].segmentIdx)
    } else {
      setLastSegmentIdx(1)
    }
    return series
  }

  const updateSeries = (meterId: string, selectedPeriod: SelectedPeriod) => {
    // eegService.fetchReport(tenant, selectedPeriod.year, selectedPeriod.segment, selectedPeriod.type)
    //   .then((r) => calcSelectedEnergySeries(selectedPeriod.type, meterId, r))
    //   .then((r) => selectLastSegmentIdx(r) )
    //   .then((r) => setEnergySeries({period: selectedPeriod, series:r}))

    onSelectionChanged(selectedPeriod)
  }

  const onChangePeriod = useCallback((selectedPeriod: SelectedPeriod | undefined) => {
    if (selectedPeriod) {
      setSelectedPeriod(selectedPeriod)
      updateSeries(selectedMeterId, selectedPeriod)
    }
  }, [selectedPeriod])

  return (
    <div style={{display: "flex", alignItems: "center", justifyContent: "space-around"}}>
      <div>
        <IonButtons>
          {(["Y", "YH", "YQ", "YM"] as ('YH' | "YQ" | 'YM' | 'Y')[]).map((p, i) => (
            <IonButton
              key={i}
              onClick={() => onChangePeriod(createNewPeriod(selectedPeriod, p, lastSegmentIdx, periods))}
              shape="round"
              size="small"
              className="stateButton"
              fill={isPeriodSelected(p) ? "solid" : undefined}
              color={isPeriodSelected(p) ? 'success' : undefined}
            style={{minWidth: "32px", maxWidth: "32px"}}>
              {p}
            </IonButton>
          ))}
        </IonButtons>
      </div>
      <div style={{width: "30%"}}>
        <PeriodSelectorElement periods={periods} activePeriod={selectedPeriod} onUpdatePeriod={onChangePeriod} />
      </div>
    </div>
  )
}

export default MeterChartNavbarComponent;