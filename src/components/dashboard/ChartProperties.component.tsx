import React, {FC, useState} from "react";
import {
  IonCheckbox,
  IonCol,
  IonContent,
  IonGrid,
  IonRow,
  IonSelect,
  IonSelectOption
} from "@ionic/react";

import "./ChartProperty.popup.scss"
import {generatePeriodOptions, transformPeriodFromSegment} from "../../util/PeriodHelper.functions";
import {CpPeriodType} from "../../models/reports.model";
import moment from "moment";
import {dateToDayOfYear, dayOfYearToDate, periodDisplayString, splitCpPeriod, toLocalISODate} from "../../util/Helper.util";
import {ReportType, SelectedPeriod} from "../../models/energy.model";
import cn from "classnames";
import {clampDay, DayBounds} from "./DayView.functions";

interface ChartPropertiesProps {
  selectedPeriod: SelectedPeriod;
  periods: CpPeriodType
  onDismiss: (selectedPeriod: SelectedPeriod) => void
  dayRange?: DayBounds   // offers the row "Tag" (dashboard day view): energy data range up to yesterday
}

const ChartProperties:FC<ChartPropertiesProps> = ({selectedPeriod, periods, onDismiss, dayRange}) => {

  // const periods = {begin: "01.01.2023 00:00:0000", end: moment().format("DD.MM.YYYY HH:mm:ss")} as CpPeriodType
  // const [selectedPeriod, setSelectedPeriod] = useState<SelectedPeriod>(activePeriod);
  const [beginYear, beginMonth, endYear, endMonth] = splitCpPeriod(periods)

  // const peroidOptions_Y = generatePeriodOptions('Y', endMonth, endYear, beginMonth, beginYear)

  const getPeriodValue = (period: SelectedPeriod) => {
    let periodString = period.type
    if (period.type == 'Y')
      return periodString + '_' + period.year
    return period.type + '_' + period.segment + '_' + period.year
  }

  const getPeriodOptions = (periodType: ReportType) => {
    return (
      <>
        {generatePeriodOptions(periodType, endMonth, endYear, beginMonth, beginYear).map((o, idx) => (
          <IonSelectOption key={idx} value={getPeriodValue(o)}>{periodDisplayString(o)}</IonSelectOption>
        ))}
      </>
    )
  }

  const getSelectedPeriod = (periodType: ReportType) => {
    // Default segment when switching period: current date, NOT the EEG period
    // end. periods.end is typically the year end → the switch would land in a
    // segment that has no data yet. (Matches prod behaviour.)
    return getPeriodValue(transformPeriodFromSegment(periodType, selectedPeriod, moment()))
  }

  const getPeroidFromString = (periodString: string): SelectedPeriod => {
    const el = periodString.split('_')
    if (el.length < 2) {
      return selectedPeriod;
    }

    if (el[0] === 'Y') {
      return {type: 'Y', segment: 0, year: +el[1]} as SelectedPeriod
    } else {
      if (el.length < 3) {
        return selectedPeriod
      }
      return {type: el[0], segment: +el[1], year: +el[2]} as SelectedPeriod
    }
  }

  const onChange = (value: string) => {
    onDismiss(getPeroidFromString(value))
  }

  const selectedDay = (range: DayBounds) =>
    selectedPeriod.type === 'D' ? clampDay(dayOfYearToDate(selectedPeriod.year, selectedPeriod.segment), range)! : range.last

  const onDay = (range: DayBounds, iso: string) => {
    const [y, m, d] = iso.split('-').map(Number)
    if (!y || !m || !d) return
    const day = clampDay(new Date(y, m - 1, d), range)!
    onDismiss({type: 'D', year: day.getFullYear(), segment: dateToDayOfYear(day)})
  }

  const isSelected = (period: ReportType): boolean => {
    switch (period) {
      case 'Y': return selectedPeriod.type === 'Y';
      case 'YH': return selectedPeriod.type === 'YH';
      case 'YQ': return selectedPeriod.type === 'YQ';
      case 'YM': return selectedPeriod.type === 'YM';
      case 'D': return selectedPeriod.type === 'D';
    }
  }

  return (
    <IonContent className="ion-padding">
      <IonGrid style={{fontSize: "14px"}}>
        <IonRow className={cn({selected: isSelected('Y')})}>
          <IonCol>
            <IonCheckbox labelPlacement="end" checked={isSelected('Y')} onIonChange={() => onChange(getSelectedPeriod('Y'))}>Jahr</IonCheckbox>
          </IonCol>
          <IonCol>
            <IonSelect value={getSelectedPeriod('Y')} onIonChange={(e) => onChange(e.detail.value)}>
              {getPeriodOptions('Y')}
            </IonSelect>
          </IonCol>
        </IonRow>
        <IonRow className={cn({selected: isSelected('YH')})}>
          <IonCol style={{margin: "auto"}}>
            <IonCheckbox labelPlacement="end" checked={isSelected('YH')} onIonChange={() => onChange(getSelectedPeriod('YH'))}>Halbjahr</IonCheckbox>
          </IonCol>
          <IonCol>
            <IonSelect value={getSelectedPeriod('YH')} onIonChange={(e) => onChange(e.detail.value)}>
              {getPeriodOptions('YH')}
            </IonSelect>
          </IonCol>
        </IonRow>
        <IonRow className={cn({selected: isSelected('YQ')})}>
          <IonCol>
            <IonCheckbox labelPlacement="end" checked={isSelected('YQ')} onIonChange={() => onChange(getSelectedPeriod('YQ'))}>Vierteljahr</IonCheckbox>
          </IonCol>
          <IonCol>
            <IonSelect value={getSelectedPeriod('YQ')} onIonChange={(e) => onChange(e.detail.value)}>
              {getPeriodOptions('YQ')}
            </IonSelect>
          </IonCol>
        </IonRow>
        <IonRow className={cn({selected: isSelected('YM')})}>
          <IonCol>
            <IonCheckbox labelPlacement="end" checked={isSelected('YM')} onIonChange={() => onChange(getSelectedPeriod('YM'))}>Monat</IonCheckbox>
          </IonCol>
          <IonCol>
            <IonSelect value={getSelectedPeriod('YM')} onIonChange={(e) => onChange(e.detail.value)}>
              {getPeriodOptions('YM')}
            </IonSelect>
          </IonCol>
        </IonRow>
        {dayRange && (
          <IonRow className={cn({selected: isSelected('D')})}>
            <IonCol>
              <IonCheckbox labelPlacement="end" checked={isSelected('D')} onIonChange={() => onDay(dayRange, toLocalISODate(selectedDay(dayRange)))}>Tag</IonCheckbox>
            </IonCol>
            <IonCol>
              <input type="date" aria-label="Tag" value={toLocalISODate(selectedDay(dayRange))}
                     min={toLocalISODate(dayRange.first)} max={toLocalISODate(dayRange.last)}
                     onChange={(e) => onDay(dayRange, e.target.value)}/>
            </IonCol>
          </IonRow>
        )}
      </IonGrid>
    </IonContent>
  )
}

export default ChartProperties;