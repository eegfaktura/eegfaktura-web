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
import {swapVertical} from "ionicons/icons";
import {MEMBER_SORT_OPTIONS, MemberSort} from "./participantSort";


interface FilterSegmentProps {
  selectedOption: string;
  setSelectedOption: (option: string) => void;
  memberSort: MemberSort;
  setMemberSort: (sort: MemberSort) => void;
}

const FilterSegmentComponent: FC<FilterSegmentProps> = ({selectedOption, setSelectedOption, memberSort, setMemberSort}) => {
  const [filterAlert] = useIonAlert();
  const [selectedMenuItem, setSelectedMenuItem] = useState<number>(0)
  const [selectOption, setSelectOption] = useState<string>('init');
  const {t} = useLocale("common")

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
        {label: t('meterlist.filter_text_active'), type: 'radio', value: 'active', checked: selectOption === 'active'},
        {label: t('meterlist.filter_text_init'), type: 'radio', value: 'init', checked: selectOption === 'init'},
        {label: t('meterlist.filter_text_inactive'), type: 'radio', value: 'inactive', checked: selectOption === 'inactive'},
        {label: t('meterlist.filter_text_rejected'), type: 'radio', value: 'rejected', checked: selectOption === 'rejected'},
      ],
      buttons: [
        {
          text: 'Cancel',
          role: 'cancel',
          handler: () => {
            // console.log('Alert canceled');
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

  const onClickSort = () => {
    filterAlert({
      header: t('meterlist.sort_header'),
      message: t('meterlist.sort_message'),
      inputs: MEMBER_SORT_OPTIONS.map(o =>
        ({label: t('meterlist.sort_' + o), type: 'radio' as const, value: o, checked: memberSort === o})),
      buttons: [
        {text: 'Cancel', role: 'cancel'},
        {text: 'Select', role: 'confirm', handler: (value: MemberSort) => setMemberSort(value)},
      ]
    })
  }

  const sortLabel = t('meterlist.sort_header') + ' ' + t('meterlist.sort_' + memberSort)

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
      <div className="sort" onClick={onClickSort} title={sortLabel}>
        <IonItem lines="none">
          <IonIcon icon={swapVertical} aria-label={sortLabel}></IonIcon>
        </IonItem>
      </div>
    </div>
  )
}

export default FilterSegmentComponent