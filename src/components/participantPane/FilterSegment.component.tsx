import React, {FC, useState} from "react";
import {
  IonIcon,
  IonItem,
  IonLabel,
  IonSegment,
  IonSegmentButton,
  IonSelect,
  IonSelectOption,
  useIonAlert
} from "@ionic/react";
import cn from "classnames";

import './FilterSegment.component.scss'
import {airplane} from "ionicons/icons";
import {eegFilterList} from "../../eegIcons";
import {useLocale} from "../../store/hook/useLocale";



const FilterSegmentComponent: FC = () => {
  const [filterAlert] = useIonAlert();
  const [selectedMenuItem, setSelectedMenuItem] = useState<number>(0)
  const [selectOption, setSelectOptions] = useState<string>('revoked');
  const {t} = useLocale()

  const onClickFilter = () => {
    filterAlert({
      header: 'Filter Optionen:',
      inputs: [
        {label: 'Aufgehoben', type: 'radio', value: 'invalid', checked: selectOption === 'invalid'},
        {label: 'Abgelehnt', type: 'radio', value: 'revoked', checked: selectOption === 'revoked'},
        {label: 'Ausstehend', type: 'radio', value: 'init', checked: selectOption === 'init'},
        {label: 'Zurückgewiesen', type: 'radio', value: 'rejected', checked: selectOption === 'rejected'},
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
            console.log('Selected value', value);
            setSelectOptions(value);
          },
        },
      ]
    })
    // filterAlert({options: {
    //   header: 'A Short Title Is Best',
    //   subHeader: 'A Sub Header Is Optional',
    //   inputs: {[
    //     {
    //       label: 'Red',
    //       type: 'radio',
    //       value: 'red',
    //     },
    //     {
    //       label: 'Blue',
    //       type: 'radio',
    //       value: 'blue',
    //     },
    //     {
    //       label: 'Green',
    //       type: 'radio',
    //       value: 'green',
    //     },
    //     ]},
    //   buttons: ['Action'],
    // }})
  }

  return (
    // <IonSegment value="custom">
    //   <IonSegmentButton value="custom">
    //     <IonLabel>Custom</IonLabel>
    //   </IonSegmentButton>
    //   <IonSegmentButton value="segment">
    //     <IonLabel>Segment</IonLabel>
    //   </IonSegmentButton>
    //   <IonSegmentButton value="buttons">
    //     <IonItem>
    //       <IonSelect value="inactive">
    //         <IonSelectOption value="inactive">Inaktiv</IonSelectOption>
    //         <IonSelectOption value="revoked">Abgelehnt</IonSelectOption>
    //       </IonSelect>
    //     </IonItem>
    //   </IonSegmentButton>
    // </IonSegment>
    <div className="period-filter-menu">
      <div className={cn("item", {selected: selectedMenuItem === 0})} onClick={() => setSelectedMenuItem(0)}>
        <IonItem lines="none">Periode</IonItem></div>
      <div className={cn("item", {selected: selectedMenuItem === 1})} onClick={() => setSelectedMenuItem(1)}>
        <IonItem lines="none">
          <IonIcon aria-hidden="true" icon={eegFilterList} slot="end" onClick={() => onClickFilter()}></IonIcon>
          <IonLabel>{t("meterlist.filter_text_"+selectOption)}</IonLabel>
        </IonItem>
      </div>
    </div>
  )
}

export default FilterSegmentComponent