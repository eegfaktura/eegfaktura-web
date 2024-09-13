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
import {periodDisplayString, splitCpPeriod} from "../../util/Helper.util";
import {ReportType, SelectedPeriod} from "../../models/energy.model";
import cn from "classnames";

interface ChartPropertiesProps {
  selectedPeriod: SelectedPeriod;
  periods: CpPeriodType
  onDismiss: (selectedPeriod: SelectedPeriod) => void
}

const ChartProperties:FC<ChartPropertiesProps> = ({selectedPeriod, periods, onDismiss}) => {

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
    return getPeriodValue(transformPeriodFromSegment(periodType, selectedPeriod, moment(periods.end.substring(0,19), "DD.MM.YYYY HH:mm:ss")/*moment()*/))
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

  const isSelected = (period: ReportType): boolean => {
    switch (period) {
      case 'Y': return selectedPeriod.type === 'Y';
      case 'YH': return selectedPeriod.type === 'YH';
      case 'YQ': return selectedPeriod.type === 'YQ';
      case 'YM': return selectedPeriod.type === 'YM';
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
      </IonGrid>
    </IonContent>
  )
}

export default ChartProperties;