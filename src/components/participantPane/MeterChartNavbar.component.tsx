import React, {FC, useCallback, useEffect, useState} from "react";
import {IonButton, IonButtons, IonDatetime, IonDatetimeButton, IonModal} from "@ionic/react";
import {createNewPeriod, dateToDayOfYear, dayOfYearToDate, splitDate, toLocalISODate} from "../../util/Helper.util";
import {
  EnergySeries,
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

  const onDateChange = (isoDate: string) => {
    if (!isoDate || !selectedPeriod) return
    const d = new Date(isoDate)
    if (isNaN(d.getTime())) return
    onChangePeriod({type: 'D', year: d.getFullYear(), segment: dateToDayOfYear(d)})
  }

  const currentDateValue = (selectedPeriod && selectedPeriod.type === 'D')
    ? toLocalISODate(dayOfYearToDate(selectedPeriod.year, selectedPeriod.segment))
    : ''

  // Restrict the day picker to the range that actually has billing-period data
  // (begin..end from the meta periods) — mirrors the YM period selector, which
  // only lists months within that range. No range available -> leave unconstrained.
  const periodToISODate = (date: string): string | undefined => {
    const [day, month, year] = splitDate(date)
    return (year && month && day) ? toLocalISODate(new Date(year, month - 1, day)) : undefined
  }
  const minDate = periodToISODate(periods.begin)
  const maxDate = periodToISODate(periods.end)
  const hasDayRange = !!minDate && !!maxDate

  return (
    <div style={{display: "flex", alignItems: "center", justifyContent: "space-around"}}>
      <div>
        <IonButtons>
          {(["Y", "YH", "YQ", "YM", "D"] as ('YH' | "YQ" | 'YM' | 'Y' | 'D')[]).map((p, i) => (
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
        {selectedPeriod?.type === 'D' ? (
          <>
            <IonDatetimeButton datetime="meter-day-datetime"/>
            <IonModal keepContentsMounted={true}>
              <IonDatetime
                id="meter-day-datetime"
                presentation="date"
                locale="de-DE"
                value={currentDateValue}
                min={hasDayRange ? minDate : undefined}
                max={hasDayRange ? maxDate : undefined}
                onIonChange={(e) => { if (typeof e.detail.value === 'string') onDateChange(e.detail.value) }}
              />
            </IonModal>
          </>
        ) : (
          <PeriodSelectorElement periods={periods} activePeriod={selectedPeriod} onUpdatePeriod={onChangePeriod} />
        )}
      </div>
    </div>
  )
}

export default MeterChartNavbarComponent;