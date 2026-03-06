import {FC, useCallback, useState} from "react";
import {IonButton, IonButtons} from "@ionic/react";
import {SelectedPeriod} from "../../models/energy.model";
import {createNewPeriod} from "../../util/Helper.util";
import PeriodSelectorElement from "./PeriodSelector.element";

interface PeriodChartNavbarProps {
  activePeriod: SelectedPeriod | undefined
  periods: {begin: string, end: string}
  onSelectionChanged: (selectedPeriod: SelectedPeriod) => void
}

const PeriodChartNavbarComponent: FC<PeriodChartNavbarProps> = ({activePeriod, onSelectionChanged, periods}) => {

  const [selectedPeriod, setSelectedPeriod] = useState<SelectedPeriod|undefined>(activePeriod)
  const [lastSegmentIdx, setLastSegmentIdx] = useState<number>(1)

  const isPeriodSelected = (periodType: string) => selectedPeriod?.type === periodType

  const onChangePeriod = useCallback((selectedPeriod: SelectedPeriod | undefined) => {
    if (selectedPeriod) {
      setSelectedPeriod(selectedPeriod)
      onSelectionChanged(selectedPeriod)
    }
  }, [selectedPeriod])

  return (
    <div style={{display: "flex", alignItems: "center", justifyContent: "space-around"}}>
      <div>
        <IonButtons>
          {(["Y", "YH", "YQ", "YM"] as ('YH' | "YQ" | 'YM' | 'Y')[]).map((p, i) => (
            <IonButton
              key={i}
              onClick={() => onChangePeriod(createNewPeriod(selectedPeriod, p, lastSegmentIdx, periods))}
              shape="round"
              size="small"
              className="stateButton"
              fill={isPeriodSelected(p) ? "solid" : undefined}
              color={isPeriodSelected(p) ? 'success' : undefined}
              style={{minWidth: "32px", maxWidth: "32px"}}>
              {p}
            </IonButton>
          ))}
        </IonButtons>
      </div>
      <div style={{width: "30%"}}>
        <PeriodSelectorElement periods={periods} activePeriod={selectedPeriod} onUpdatePeriod={onChangePeriod}/>
      </div>
    </div>)
}

export default PeriodChartNavbarComponent;