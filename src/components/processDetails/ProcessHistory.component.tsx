import React, { FC, useCallback, useEffect, useState } from "react";
import CorePageTemplate from "../core/CorePage.template";
import { EdaHistories, EdaProcess, Eeg } from "../../models/eeg.model";
import { IonAccordion, IonAccordionGroup, IonContent, IonIcon, IonItem, IonLabel, IonSearchbar } from "@ionic/react";
import { chevronForwardOutline } from "ionicons/icons";
import ProcessHeaderComponent from "./ProcessHeader.component";
import ProcessContentComponent from "./ProcessContent.component";
import DateComponent from "../dialogs/date.component";
import { EdaHistory, EdaResponseCode } from "../../models/process.model";
import { Api } from "../../service";
import { GroupBy } from "../../util/Helper.util";
import { useLocale } from "../../store/hook/useLocale";

interface ProcessHistoryComponentProps {
  eeg: Eeg
  edaProcess: EdaProcess
  today: Date
}

const ProcessHistoryComponent: FC<ProcessHistoryComponentProps> = ({ eeg, edaProcess, today }) => {

  const { t } = useLocale("common")
  const [entries, setEntries] = useState<EdaHistories>({})
  const [processFilter, setProcessFilter] = useState<Record<string, string | undefined>>({})
  const [selectedItem, setSelectedItem] = useState(0)
  // const today = new Date()
  const [historyDate, setHistoryDate] = useState<[Date | null, Date | null]>([new Date(today.getTime() - (86400000 * 14)), today])

  const fetchHistory = useCallback(() => {
    const [beginDate, endDate] = historyDate
    if (beginDate && endDate) {
      Api.eegService.getHistories(eeg.id.toUpperCase(), beginDate.getTime(), endDate.getTime() + (60 * 60 * 24 * 1000))
        .then(h => setEntries(h))
    }
  }, [historyDate])

  useEffect(() => {
    fetchHistory()
  }, [fetchHistory]);

  const getEntriesForProcessId = (process: string): Record<string, EdaHistory[]> => {
    switch (process) {
      case "CM_REV_IMP":
        return { ...entries[process], ...entries["CM_REV_SP"] }
      default:
        return entries[process]
    }
  }

  const getEntriesForProcess = useCallback((process: string): Record<string, EdaHistory[]> => {
    if (entries) {
      const processEntries = getEntriesForProcessId(process)
      if (processEntries) {
        return Object.entries(processEntries).reduce((g: Record<string, EdaHistory[]>, [k, v]) => {
          extractMessage(process, v).forEach(h => {
            (h.meteringPoints && h.meteringPoints.length > 0) ? h.meteringPoints.forEach(m => {
              g[m] = [...(g[m] || []), h]
              g[m].sort((a, b) => a.date < b.date ? 1 : a.date > b.date ? -1 : 0)
            }) : (g['-'] = [...(g['-'] || []), h])
            g['-'].sort((a, b) => a.date < b.date ? 1 : a.date > b.date ? -1 : 0)
          })
          return g
        }, {})
      }
    }
    return {}
  }, [entries])

  const sortHistories = (h: EdaHistory[]) => {
    return h.sort((a, b) => a.date < b.date ? 1 : a.date > b.date ? -1 : 0)
  }

  const historyItems = ["EC_REQ_ONL", "CM_REV_IMP", "CR_REQ_PT", "EC_PRTFACT_CHANGE", "CR_MSG"]

  const renderTableWithConversationId = (headers: string[], e: EdaHistory[]) => {
    return (
      <div className="ion-padding"
        style={{ display: "grid", gridTemplateColumns: "0.5fr 1fr 1fr", rowGap: "10px" }}>
        <span style={{
          gridColumnStart: "1",
          borderBottom: "1px solid #dfdfdf"
        }}><strong>{headers[0]}</strong></span>
        <span
          style={{ gridColumnStart: "2", borderBottom: "1px solid #dfdfdf" }}><strong>{headers[1]}</strong></span>
        <span style={{
          gridColumnStart: "3",
          borderBottom: "1px solid #dfdfdf"
        }}><strong>{headers[2]}</strong></span>
        {Object.entries(GroupBy(e, i => i.conversationId)).map(([id, hl], i) => (
          <React.Fragment key={"line" + id + i}>
            <span
              style={{ gridColumnStart: "1", gridColumnEnd: "4", fontSize: "12px" }}>Conversation-Id: {id}</span>
            {hl.map((h, ii) => (
              <React.Fragment key={"line_item" + ii}>
                <span style={{ gridColumnStart: "1" }}>{h.date.toDateString()}</span>
                <span style={{ gridColumnStart: "2" }}>{h.processType}</span>
                <span style={{ gridColumnStart: "3" }}>{h.responseCode}</span>
              </React.Fragment>
            ))}
            <span
              style={{
                gridColumnStart: "1",
                gridColumnEnd: "4",
                fontSize: "12px",
                borderTop: "1px solid #9c9c9c"
              }}></span>
          </React.Fragment>
        ))}
      </div>
    )
  }

  const renderAccordionBody = (p: string, v: EdaHistory[]) => {
    switch (p) {
      case "CM_REV_IMP":
        return (
          <div style={{ boxShadow: "2px 1px 1px lightgray", margin: "10px", border: "1px solid #d3d3d34f" }}
            className="ion-padding" slot="content">
            {renderTableWithConversationId(["Abgewickelt am:", "Protokoll", "Zustimmung endet am:"], v)}
          </div>
        )
      case "EC_REQ_ONL":
        return (
          <div style={{ boxShadow: "2px 1px 1px lightgray", margin: "10px", border: "1px solid #d3d3d34f" }}
            className="ion-padding" slot="content">
            {renderTableWithConversationId(["Abgewickelt am:", "Protokoll", "Status"], v)}
          </div>
        )
      case "CR_REQ_PT":
        return (
          <div style={{ boxShadow: "2px 1px 1px lightgray", margin: "10px", border: "1px solid #d3d3d34f" }}
            className="ion-padding" slot="content">
            {renderTableWithConversationId(["Abgewickelt am:", "Protokoll", "Info"], v)}
          </div>
        )
      case "EC_PRTFACT_CHANGE":
        return (
          <div style={{ boxShadow: "2px 1px 1px lightgray", margin: "10px", border: "1px solid #d3d3d34f" }}
            className="ion-padding" slot="content">
            {renderTableWithConversationId(["Abgewickelt am:", "Protokoll", "Info"], v)}
          </div>
        )
      case "CR_MSG":
        return (
          <div style={{ boxShadow: "2px 1px 1px lightgray", margin: "10px", border: "1px solid #d3d3d34f" }}
            className="ion-padding" slot="content">
            <div className="ion-padding"
              style={{ display: "grid", gridTemplateColumns: "0.5fr auto 0.1fr auto auto", rowGap: "10px" }}>
              <span style={{
                gridColumnStart: "1",
                borderBottom: "1px solid #dfdfdf"
              }}><strong>{"Abgewickelt am:"}</strong></span>
              <span style={{
                gridColumnStart: "2",
                gridColumnEnd: "span 2",
                borderBottom: "1px solid #dfdfdf"
              }}><strong>{"Energiedaten von:"}</strong></span>
              <span
                style={{ gridColumnStart: "4", borderBottom: "1px solid #dfdfdf" }}><strong>{"Energiedaten bis:"}</strong></span>
              {v.map((h, i) => (
                <React.Fragment key={"line" + p + i}>
                  <span style={{ gridColumnStart: "1" }}>{h.date.toDateString()}</span>
                  <span style={{ gridColumnStart: "2" }}>{(h.meteringFrom ? h.meteringFrom.toDateString() : "-")}</span>
                  <span style={{ gridColumnStart: "3" }}><IonIcon icon={chevronForwardOutline} size="small" /> </span>
                  <span style={{ gridColumnStart: "4" }}>{(h.meteringTo ? h.meteringTo.toDateString() : "-")}</span>
                </React.Fragment>
              ))}
            </div>
          </div>
        )
    }
    return (<></>)
  }

  const extractMessage = (process: string, msg: EdaHistory[]): EdaHistory[] => {
    switch (process) {
      case "CM_REV_IMP": {
        const history_cm = msg.map((e) => {
          e.date = new Date(e.date)
          e.responseCode = e.message.consentEnd ? new Date(e["message"].consentEnd).toDateString() : "-"

          switch (e.processType) {
            case "ANTWORT_CCMS":
              e.meteringPoint = e["message"]["responseData"].reduce((z: string, r: Record<string, any>) => r.meteringPoint ? r.meteringPoint : z, "-")
              e.meteringPoints = e["message"]["responseData"].map((m: Record<string, any>) => m.meteringPoint)
              break;
            case "ABLEHNUNG_CCMS":
              e.meteringPoint = e["message"]["responseData"].reduce((z: string, r: Record<string, any>) => r.meteringPoint ? r.meteringPoint : z, "-")
              e.meteringPoints = e["message"]["responseData"].map((m: Record<string, any>) => m.meteringPoint)
              e.responseCode = e["message"].responseData ? e["message"].responseData[0].responseCode.map((c: number) => EdaResponseCode.getMessage(c)).join(", ") : "-"
              break;
            case "AUFHEBUNG_CCMS":
              e.meteringPoint = e["message"]["meter"].meteringPoint ? e["message"]["meter"].meteringPoint : "-"
              e.meteringPoints = e["message"]["meter"].meteringPoint ? [e["message"]["meter"].meteringPoint] : []
              break;
            case "AUFHEBUNG_CCMI":
              e.meteringPoint = e["message"]["responseData"].reduce((z: string, r: Record<string, any>) => r.meteringPoint ? r.meteringPoint : z, "-")
              e.meteringPoints = e["message"]["responseData"].map((m: Record<string, any>) => m.meteringPoint)
              e.responseCode = e["message"]["responseData"].reduce((z: string, r: Record<string, any>) => r.consentEnd ? new Date(r.consentEnd).toDateString() : z, "-")
              break
            default:
              e.responseCode = "-"
          }
          return e
        })
        return sortHistories(history_cm)
      }
      case "CR_MSG": {
        const filter = processFilter[process] || ''
        const history = sortHistories(msg.map((e) => {
          e.date = new Date(e.date)
          e.meteringPoint = e.message.meter ? e.message.meter : "-"
          e.meteringPoints = e.message.meter ? [e.message.meter] : []
          e.meteringFrom = new Date(e.message.from)
          e.meteringTo = new Date(e.message.to)
          return e
        }))
        // const _history = filter.length > 0 ? history.filter(h => h.meteringPoint?.toLowerCase().indexOf(filter) !== -1) : history
        return history
      }
      case "CR_REQ_PT": {
        const history_cr_req_pt = msg.map((e) => {
          e.date = new Date(e.date)
          e.meteringPoint = e.message.meter?.meteringPoint ? e.message.meter.meteringPoint : "-"
          e.meteringPoints = e.message.meter?.meteringPoint ? [e.message.meter.meteringPoint] : []
          switch (e.processType) {
            case "ABLEHNUNG_PT":
            case "ANTWORT_PT":
              e.responseCode = e["message"]["responseData"].reduce((z: string, r: Record<string, any>) => r.responseCode ? EdaResponseCode.getMessage(r.responseCode[0]) : z, "-")
              break
            case "ANFORDERUNG_PT":
              e.responseCode = e.message.timeline ? new Date(e.message.timeline.from).toDateString() + " - " + new Date(e.message.timeline.to).toDateString() : ""
          }
          return e
        })
        return sortHistories(history_cr_req_pt)
      }
      case "EC_REQ_ONL": {
        const history_cr_req_pt = msg.map((e) => {
          e.date = new Date(e.date)
          switch (e.processType) {
            case "ABSCHLUSS_ECON":
              e.meteringPoint = e.message.meterList ? e.message.meterList.length > 0 ?
                e.message.meterList[0].meteringPoint ? "-" : "-" : "-" : "-"
              e.meteringPoints = e.message.meterList ? e.message.meterList.map((m: any) => m.meteringPoint) : []
              return e
            case "ANFORDERUNG_ECON":
              e.meteringPoint = e.message.meter?.meteringPoint ? e.message.meter.meteringPoint : "-"
              e.meteringPoints = e.message.meter?.meteringPoint ? [e.message.meter.meteringPoint] : []
              return e
            default:
              e.meteringPoint = e.message.responseData.reduce((z: string, r: Record<string, any>) => r.meteringPoint ? r.meteringPoint : z, "-")
              e.meteringPoints = e.message.responseData.map((r: Record<string, any>) => r.meteringPoint)
              e.responseCode = e.message.responseData.reduce((z: string, r: Record<string, any>) => r.responseCode ? EdaResponseCode.getMessage(r.responseCode[0]) : z, "-")
              return e
          }
        })
        return sortHistories(history_cr_req_pt)
      }
      case "EC_PRTFACT_CHANGE": {
        const history_ec_prt_fact_change = msg.map((e) => {
          e.date = new Date(e.date)
          e.meteringPoint = e.message.meterList ? e.message.meterList.length > 0 ? e.message.meterList[0].meteringPoint : "-" : "-"
          e.meteringPoints = e.message.meterList ? e.message.meterList.map((m: any) => m.meteringPoint) : []
          switch (e.processType) {
            case "ANFORDERUNG_CPF":
              e.responseCode = e.message.meterList ? e.message.meterList.length > 0 ?
                (e.message.meterList[0].partFact + ' %') : "" : ""
              return e
            default:
              e.responseCode = e.message.responseData.reduce((z: string, r: Record<string, any>) => r.responseCode ? EdaResponseCode.getMessage(r.responseCode[0]) : z, "-")
              return e
          }
        })
        return sortHistories(history_ec_prt_fact_change)
      }
    }
    return [] as EdaHistory[]
  }

  const handleInput = (ev: Event) => {
    let query = '';
    const target = ev.target as HTMLIonSearchbarElement;
    if (target) query = target.value!.toLowerCase();

    if (selectedItem > 0) {
      setProcessFilter((p) => {
        return { ...p, [historyItems[selectedItem - 1]]: query }
      })
    }
  };

  return (
    <>
      <ProcessHeaderComponent name={edaProcess.name}>
        <DateComponent range={setHistoryDate} initialDate={historyDate} />
      </ProcessHeaderComponent>
      <ProcessContentComponent>
        <CorePageTemplate>
          {/*style={{position: "absolute", top: "0", bottom: "0", left: "0", right: "0"}}*/}
          <div style={{ margin: "16px" }}>

            {historyItems.map((p, i) => (
              <div key={p + i}>
                <IonItem button onClick={() => selectedItem !== i + 1 ? setSelectedItem(i + 1) : setSelectedItem(0)}>
                  <IonLabel>{t(`process.${p}`)}</IonLabel>
                </IonItem>
                {selectedItem === (i + 1) &&
                  <div style={{ margin: "10px 24px" }}>
                    <div>
                      <IonSearchbar debounce={500} onIonInput={(ev) => handleInput(ev)}></IonSearchbar>
                    </div>
                    <IonAccordionGroup>
                      {Object.entries(getEntriesForProcess(p))
                        .filter(([k, v]) => (processFilter[p] || '').length > 0 ? k.toLowerCase().indexOf(processFilter[p]!) !== -1 : true)
                        .map(([k, v], i) => (
                          <IonAccordion key={i} value={"cm_rev_imp_" + i}>
                            <IonItem slot="header" color="light">
                              <IonLabel>{k}</IonLabel>
                            </IonItem>
                            {renderAccordionBody(p, v)}
                          </IonAccordion>
                        ))}
                    </IonAccordionGroup>
                  </div>
                }
              </div>
            ))}
          </div>
        </CorePageTemplate>
      </ProcessContentComponent>
    </>
  )
}
export default ProcessHistoryComponent