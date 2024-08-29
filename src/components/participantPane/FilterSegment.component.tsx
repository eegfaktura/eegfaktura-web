import React, {FC, useEffect, useState} from "react";
import {
  IonIcon,
  IonItem,
  IonLabel,
  useIonAlert
} from "@ionic/react";
import cn from "classnames";

import './FilterSegment.component.scss'
import {eegFilterList} from "../../eegIcons";
import {useLocale} from "../../store/hook/useLocale";


interface FilterSegmentProps {
  selectedOption: string;
  setSelectedOption: (option: string) => void;
}

const FilterSegmentComponent: FC<FilterSegmentProps> = ({selectedOption, setSelectedOption}) => {
  const [filterAlert] = useIonAlert();
  const [selectedMenuItem, setSelectedMenuItem] = useState<number>(0)
  const [selectOption, setSelectOption] = useState<string>('init');
  const {t} = useLocale()

  useEffect(() => {
    switch(selectedOption) {
      case 'period':
        setSelectedMenuItem(0)
        break;
      default:
        setSelectedMenuItem(1)
        setSelectOption(selectedOption);
    }
  }, [selectedOption]);

  const onSelectOptionClick = (value: string) => {
    setSelectedOption(value)
  }

  const onChangeSelection = (t: number) => {
    setSelectedMenuItem(t)
    switch(t) {
      case 0:
        setSelectedOption('period')
        break
      default:
        setSelectedOption(selectOption)
    }
  }

  const onClickFilter = (e: React.MouseEvent<HTMLIonIconElement, MouseEvent>) => {
    filterAlert({
      header: t('meterlist.filter_header'),
      inputs: [
        {label: t('meterlist.filter_text_init'), type: 'radio', value: 'init', checked: selectOption === 'init'},
        {label: t('meterlist.filter_text_inactive'), type: 'radio', value: 'inactive', checked: selectOption === 'inactive'},
        {label: t('meterlist.filter_text_rejected'), type: 'radio', value: 'rejected', checked: selectOption === 'rejected'},
      ],
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel',
          handler: () => {
            console.log('Alert canceled');
          },
        },
        {
          text: 'Select',
          role: 'confirm',
          handler: (value: string) => {
            onSelectOptionClick(value);
          },
        },
      ]
    })
    e.stopPropagation()
    e.preventDefault()
  }

  return (
    <div className="period-filter-menu">
      <div className={cn("item", {selected: selectedMenuItem === 0})} onClick={() => onChangeSelection(0)}>
        <IonItem lines="none">Periode</IonItem></div>
      <div className={cn("item", {selected: selectedMenuItem === 1})} onClick={() => onChangeSelection(1)}>
        <IonItem lines="none">
          <IonIcon aria-hidden="true" icon={eegFilterList} slot="end" onClick={onClickFilter}></IonIcon>
          <IonLabel>{t("meterlist.filter_text_"+selectOption)}</IonLabel>
        </IonItem>
      </div>
    </div>
  )
}

export default FilterSegmentComponent