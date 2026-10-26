import React, {FC, useEffect, useState} from "react";
import {
  IonIcon,
  IonItem,
  IonLabel,
  useIonAlert,
  useIonPopover
} from "@ionic/react";
import cn from "classnames";

import './FilterSegment.component.scss'
import {eegFilterList} from "../../eegIcons";
import {useLocale} from "../../store/hook/useLocale";
import {swapVertical} from "ionicons/icons";
import {MemberSort} from "./participantSort";
import {DEFAULT_MEMBER_FILTER, MEMBER_FILTER_OPTIONS, MemberFilter} from "./memberFilter.functions";
import MemberSortPopover from "./MemberSortPopover.component";


interface FilterSegmentProps {
  selectedOption: string;
  setSelectedOption: (option: string) => void;
  memberSort: MemberSort;
  actionFirst: boolean;
  setMemberSort: (sort: MemberSort, actionFirst: boolean) => void;
}

const FilterSegmentComponent: FC<FilterSegmentProps> = ({selectedOption, setSelectedOption, memberSort, actionFirst, setMemberSort}) => {
  const [filterAlert] = useIonAlert();
  const [selectedMenuItem, setSelectedMenuItem] = useState<number>(0)
  const [selectOption, setSelectOption] = useState<MemberFilter>(DEFAULT_MEMBER_FILTER);
  const {t} = useLocale("common")
  const [sortPopover, dismissSortPopover] = useIonPopover(MemberSortPopover, {
    memberSort,
    actionFirst,
    onApply: (sort: MemberSort, first: boolean) => {
      setMemberSort(sort, first)
      dismissSortPopover()
    },
    onDismiss: () => dismissSortPopover(),
  })

  useEffect(() => {
    switch(selectedOption) {
      case 'period':
        setSelectedMenuItem(0)
        break;
      default:
        setSelectedMenuItem(1)
        setSelectOption(selectedOption as MemberFilter);
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
      inputs: MEMBER_FILTER_OPTIONS.map(o =>
        ({label: t('meterlist.filter_text_' + o), type: 'radio' as const, value: o, checked: selectOption === o})),
      buttons: [
        {
          text: t('meterlist.cancel'),
          role: 'cancel',
          handler: () => {
            // console.log('Alert canceled');
          },
        },
        {
          text: t('meterlist.apply'),
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

  const onClickSort = (e: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
    sortPopover({event: e.nativeEvent, side: "bottom", alignment: "end"})
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