import React, {FC} from "react";
import {
  IonIcon,
  IonItem,
  IonLabel,
  useIonAlert,
  useIonPopover
} from "@ionic/react";

import './FilterSegment.component.scss'
import {eegFilterList} from "../../eegIcons";
import {useLocale} from "../../store/hook/useLocale";
import {swapVertical} from "ionicons/icons";
import {MemberSort} from "./participantSort";
import {MEMBER_FILTER_OPTIONS} from "./memberFilter.functions";
import MemberSortPopover from "./MemberSortPopover.component";

// One choice for the list (decided 28.10.2026, replaces the tabs „Periode“ and the filter): „Standard“ is the former
// „Periode“ (members active in the selected period, the view for billing), then the filters of platform#214.
export const MEMBER_VIEW_OPTIONS = ['period', ...MEMBER_FILTER_OPTIONS]

interface FilterSegmentProps {
  selectedOption: string;
  setSelectedOption: (option: string) => void;
  memberSort: MemberSort;
  actionFirst: boolean;
  setMemberSort: (sort: MemberSort, actionFirst: boolean) => void;
}

const FilterSegmentComponent: FC<FilterSegmentProps> = ({selectedOption, setSelectedOption, memberSort, actionFirst, setMemberSort}) => {
  const [filterAlert] = useIonAlert();
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

  const onClickView = () => {
    filterAlert({
      header: t('meterlist.view_header'),
      inputs: MEMBER_VIEW_OPTIONS.map(o =>
        ({label: t('meterlist.filter_text_' + o), type: 'radio' as const, value: o, checked: selectedOption === o})),
      buttons: [
        {
          text: t('meterlist.cancel'),
          role: 'cancel',
        },
        {
          text: t('meterlist.apply'),
          role: 'confirm',
          handler: (value: string) => {
            setSelectedOption(value);
          },
        },
      ]
    })
  }

  const onClickSort = (e: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
    sortPopover({event: e.nativeEvent, side: "bottom", alignment: "end"})
  }

  const viewLabel = t('meterlist.filter_text_' + selectedOption)
  const sortLabel = t('meterlist.sort_header') + ' ' + t('meterlist.sort_' + memberSort)

  return (
    <div className="period-filter-menu">
      <div className="item" onClick={onClickView} title={t('meterlist.view_tooltip_' + selectedOption)}>
        <IonItem lines="none">
          <IonIcon aria-hidden="true" icon={eegFilterList} slot="end"></IonIcon>
          <IonLabel>{t('meterlist.view_header')} {viewLabel}</IonLabel>
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