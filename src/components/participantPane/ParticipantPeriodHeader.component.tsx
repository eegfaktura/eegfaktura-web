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

const todayDottedDate = (): string => {
  const n = new Date();
  return `${n.getDate()}.${n.getMonth() + 1}.${n.getFullYear()}`;
};

const ParticipantPeriodHeaderComponent: FC<ParticipantPeriodHeaderComponentProps> = ({activePeriod, selectAll, onUpdatePeriod}) => {
  const periods = useAppSelector(periodsSelector);
  const eeg = useAppSelector(eegSelector);

  // periodsSelector derives the selectable range purely from energy metadata. That range
  // is the wrong model for the billing period picker: billing is time-driven (you bill
  // every period that has elapsed), so it must not be capped by where energy data happens
  // to end. Two failure modes it caused: (1) an EEG with no energy data at all degenerated
  // to "today"; (2) an EEG whose energy data is frozen in the past (e.g. the platform-fee
  // EEG with a single stale record) only offered that old period. Fix: lower bound = energy
  // start, or the EEG creation date when there is no energy data; upper bound = always the
  // current period, so every quarter from the start up to today stays selectable.
  const effectivePeriods = useMemo(() => {
    const hasEnergyData = periods.end !== "";
    const begin = hasEnergyData
      ? periods.begin
      : (eeg?.createdAt ? isoToDottedDate(eeg.createdAt) : undefined);
    if (!begin) return periods;
    return {begin, end: todayDottedDate()};
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
