import React, {FC, useMemo} from "react";
import {
  IonCheckbox,
  IonCol,
  IonGrid,
  IonItem,
  IonRow,
} from "@ionic/react";
import {SelectedPeriod} from "../../models/energy.model";
import {IonCheckboxCustomEvent} from "@ionic/core/dist/types/components";
import {CheckboxChangeEventDetail} from "@ionic/core";

// import "./ParticipantPeriodHeader.component.css"
import PeriodSelectorElement from "../core/PeriodSelector.element";
import {useAppSelector} from "../../store";
import {periodsSelector} from "../../store/energy";
import {eegSelector} from "../../store/eeg";

interface ParticipantPeriodHeaderComponentProps {
  activePeriod: SelectedPeriod | undefined;
  selectAll: (event: IonCheckboxCustomEvent<CheckboxChangeEventDetail>) => void;
  onUpdatePeriod: (selectedPeriod: SelectedPeriod) => void;
}

// ISO date ("YYYY-MM-DD") -> "DD.MM.YYYY" as expected by splitDate/yearMonth.
const isoToDottedDate = (iso: string): string | undefined => {
  const parts = iso.split(/[T\s]/)[0].split("-");
  return parts.length === 3 ? `${parts[2]}.${parts[1]}.${parts[0]}` : undefined;
};

const ParticipantPeriodHeaderComponent: FC<ParticipantPeriodHeaderComponentProps> = ({activePeriod, selectAll, onUpdatePeriod}) => {
  const periods = useAppSelector(periodsSelector);
  const eeg = useAppSelector(eegSelector);

  // periodsSelector derives the selectable range from energy metadata only. For an EEG
  // without any energy data (e.g. the platform-fee EEG) it degenerates to "today", which
  // drops past periods once a period boundary is crossed. Fall back to the EEG creation
  // date so past billing periods stay selectable; EEGs with energy data are unaffected.
  const effectivePeriods = useMemo(() => {
    if (periods.end === "" && eeg?.createdAt) {
      const begin = isoToDottedDate(eeg.createdAt);
      if (begin) return {begin, end: ""};
    }
    return periods;
  }, [periods, eeg?.createdAt]);

  return (
    <div style={{marginLeft: "5px", margin: "0 5px 10px 5px", borderBottom: "2px solid gray"}}>
    <IonGrid>
      <IonRow>
        <IonCol size={"2"}>
          <IonItem lines="none">
            <IonCheckbox style={{"--size": "16px", margin: "0px"}} onIonChange={selectAll} aria-label=""></IonCheckbox>
          </IonItem>
        </IonCol>
        <IonCol>
          <IonItem lines="none">
          <PeriodSelectorElement activePeriod={activePeriod} periods={effectivePeriods} onUpdatePeriod={onUpdatePeriod} />
          </IonItem>
        </IonCol>
      </IonRow>
    </IonGrid>
    </div>
  )
}
export default ParticipantPeriodHeaderComponent;
