import React, {FC, useState} from "react";
import {IonButton, IonButtons, IonCheckbox, IonItem, IonList, IonListHeader, IonRadio, IonRadioGroup} from "@ionic/react";
import {useLocale} from "../../store/hook/useLocale";
import {MEMBER_SORT_OPTIONS, MemberSort} from "./participantSort";

import "./MemberSortPopover.component.scss"

// The sort choice of the member list (platform#214). Not an alert: an Ionic alert cannot mix radio buttons with a
// checkbox. The choice is applied with "Übernehmen" only.
interface MemberSortPopoverProps {
  memberSort: MemberSort
  actionFirst: boolean
  onApply: (memberSort: MemberSort, actionFirst: boolean) => void
  onDismiss: () => void
}

const MemberSortPopover: FC<MemberSortPopoverProps> = ({memberSort, actionFirst, onApply, onDismiss}) => {
  const {t} = useLocale("common")
  const [sort, setSort] = useState<MemberSort>(memberSort)
  const [first, setFirst] = useState<boolean>(actionFirst)

  return (
    <IonList lines="none" className="member-sort-popover">
      <IonListHeader>{t('meterlist.sort_header')}</IonListHeader>
      <IonRadioGroup value={sort} onIonChange={e => setSort(e.detail.value)}>
        {MEMBER_SORT_OPTIONS.map(o => (
          <IonItem key={o}>
            <IonRadio value={o} labelPlacement="end" justify="start">{t('meterlist.sort_' + o)}</IonRadio>
          </IonItem>
        ))}
      </IonRadioGroup>
      <IonItem>
        <IonCheckbox checked={first} labelPlacement="end" justify="start"
                     onIonChange={e => setFirst(e.detail.checked)}>{t('meterlist.sort_action_first')}</IonCheckbox>
      </IonItem>
      <IonButtons style={{justifyContent: "flex-end"}}>
        <IonButton onClick={onDismiss}>{t('meterlist.cancel')}</IonButton>
        <IonButton onClick={() => onApply(sort, first)}>{t('meterlist.apply')}</IonButton>
      </IonButtons>
    </IonList>
  )
}

export default MemberSortPopover
