import React, {FC, useCallback, useState} from "react";
import ProcessHeaderComponent from "../ProcessHeader.component";
import DateComponent from "../../dialogs/date.component";
import ProcessContentComponent from "../ProcessContent.component";
import CorePageTemplate from "../../core/CorePage.template";
import {IonAccordion, IonAccordionGroup, IonItem, IonLabel, IonSearchbar} from "@ionic/react";
import PaginationComponent from "../../core/Pagination.component";
import {EdaProcess, Eeg} from "../../../models/eeg.model";
import {useAllParticipants} from "../../../store/hook/ParticipantProvider";
import {Api} from "../../../service";
import {useLocale} from "../../../store/hook/useLocale";
import {Process_EC_REQ_ONL_MY_REQ_ONL} from "./Process_EC_REQ_ONL.component";

interface ProcessHistoryComponentProps {
  eeg: Eeg
  edaProcess: EdaProcess
  today: Date
}

const ProcessHistoryComponent: FC<ProcessHistoryComponentProps> = ({eeg, edaProcess, today}) => {

  const {t} = useLocale("common")
  const [historyDate, setHistoryDate] = useState<[Date | null, Date | null]>([new Date(today.getTime() - (86400000 * 14)), today])
  const [selectedItem, setSelectedItem] = useState(0)

  const participants = useAllParticipants()

  const historyItems = ["EC_REQ_ONL", "CM_REV_IMP", "CR_REQ_PT", "EC_PRTFACT_CHANGE", "CR_MSG"]

  const renderSelectedItem = (item: number) => {
    switch (item) {
      case 1:
      case 2:
      case 3:
      case 4:
      case 5: {
        const protocols = [historyItems[item-1]]
        if (item === 2) {
          protocols.push("CM_REV_SP")
        }
        return (
          <Process_EC_REQ_ONL_MY_REQ_ONL eeg={eeg} protocols={protocols} participants={participants} historyDate={historyDate} />
        )
      }
      default:
        return <></>
    }
  }

  return (
    <>
      <ProcessHeaderComponent name={edaProcess.name}>
        <DateComponent range={setHistoryDate} initialDate={historyDate}/>
      </ProcessHeaderComponent>
      <ProcessContentComponent>
        <CorePageTemplate>
          {/*style={{position: "absolute", top: "0", bottom: "0", left: "0", right: "0"}}*/}
          <div style={{margin: "16px"}}>

            {historyItems.map((p, i) => (
              <div key={p + i}>
                <IonItem button onClick={() => selectedItem !== i + 1 ? setSelectedItem(i + 1) : setSelectedItem(0)}>
                  <IonLabel>{t(`process.${p}`)}</IonLabel>
                </IonItem>
                {selectedItem === (i + 1) && renderSelectedItem(selectedItem)}
              </div>
            ))}
          </div>
        </CorePageTemplate>
      </ProcessContentComponent>
    </>
  )
}

export default ProcessHistoryComponent