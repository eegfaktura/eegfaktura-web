import React, {FC, useCallback, useEffect, useState} from "react";
import {IonButton, IonButtons, IonDatetime, IonDatetimeButton, IonIcon, IonModal} from "@ionic/react";
import {chevronBack, chevronForward} from "ionicons/icons";
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

  // Step one day back/forward without opening the calendar. Clamp to the same
  // range the picker is restricted to (ISO date strings compare lexicographically).
  const stepDay = (delta: number) => {
    if (!selectedPeriod || selectedPeriod.type !== 'D') return
    const d = dayOfYearToDate(selectedPeriod.year, selectedPeriod.segment)
    d.setDate(d.getDate() + delta)
    if (hasDayRange && (toLocalISODate(d) < minDate! || toLocalISODate(d) > maxDate!)) return
    onChangePeriod({type: 'D', year: d.getFullYear(), segment: dateToDayOfYear(d)})
  }
  const prevDisabled = hasDayRange && currentDateValue <= minDate!
  const nextDisabled = hasDayRange && currentDateValue >= maxDate!

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
      {selectedPeriod?.type === 'D' ? (
        <div style={{display: "flex", alignItems: "center", justifyContent: "center", gap: "4px"}}>
          <IonButton fill="clear" size="small" onClick={() => stepDay(-1)} disabled={prevDisabled} aria-label="Vorheriger Tag">
            <IonIcon slot="icon-only" icon={chevronBack}/>
          </IonButton>
          {/* flexShrink:0 keeps the date on a single line — as a flex item next to
              the arrows it would otherwise collapse to min-content and wrap. */}
          <IonDatetimeButton datetime="meter-day-datetime" style={{flexShrink: 0}}/>
          <IonButton fill="clear" size="small" onClick={() => stepDay(1)} disabled={nextDisabled} aria-label="Nächster Tag">
            <IonIcon slot="icon-only" icon={chevronForward}/>
          </IonButton>
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
        </div>
      ) : (
        <div style={{width: "30%"}}>
          <PeriodSelectorElement periods={periods} activePeriod={selectedPeriod} onUpdatePeriod={onChangePeriod} />
        </div>
      )}
    </div>
  )
}

export default MeterChartNavbarComponent;