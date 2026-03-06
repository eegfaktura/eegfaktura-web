import React, {FC, useCallback, useEffect, useMemo, useState} from "react";
import {IonAccordion, IonAccordionGroup, IonItem, IonLabel, IonSearchbar, IonSpinner} from "@ionic/react";
import {Api} from "../../../service";
import {EdaHistories, Eeg} from "../../../models/eeg.model";
import PaginationComponent from "../../core/Pagination.component";
import {EdaHistory, EdaHistoryGroup, EdaResponseCode} from "../../../models/process.model";
import {EegParticipant} from "../../../models/members.model";
import {renderAccordionBody} from "./ProcessHistory.functions";


export const Process_EC_REQ_ONL_MY_REQ_ONL:FC<{eeg: Eeg, protocols: string[], participants: EegParticipant[], historyDate:[Date | null, Date | null]}> = ({eeg, protocols, participants, historyDate}) => {
  const [processFilter, setProcessFilter] = useState<string | undefined>(undefined)
  const [loading, setLoading] = useState(false)
  const [historyGroup, setHistoryGroup] = useState<Record<string, EdaHistoryGroup> | undefined>(undefined)

  const protocol = protocols[0]

  const fetchHistory = useCallback(() => {
    const [beginDate, endDate] = historyDate
    if (beginDate && endDate) {
      setLoading(true)
      Api.eegService.getHistories1(eeg.id.toUpperCase(), protocols, beginDate.getTime(), endDate.getTime() + (60 * 60 * 24 * 1000))
        .then(h => getEntriesForProcessId(protocol, h))
        .then(e => convertToGroup(e))
        .then(g => setHistoryGroup(g))
        .finally(() => setLoading(false))
    }
  }, [historyDate])

  useEffect(() => {
    fetchHistory()
  }, [fetchHistory])

  const getEntriesForProcessId = (process: string, entries: EdaHistories): Record<string, EdaHistory[]> => {
    switch (process) {
      case "CM_REV_IMP":
        return {...entries[process], ...entries["CM_REV_SP"]}
      default:
        return entries[process]
    }
  }

  const sortHistories = (h: EdaHistory[]) => {
    return h.sort((a, b) => a.date < b.date ? 1 : a.date > b.date ? -1 : 0)
  }

  const meterParticipants = useMemo(() => {
    return participants.reduce((pc, p) => {
      return {...pc, ...p.meters.reduce((c, m) => {
          return {...c, [m.meteringPoint]: p}
        }, {} as Record<string, EegParticipant>)}
    }, {} as Record<string, EegParticipant>)
  }, [participants])

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
              e.responseCode = e["message"].responseData ? e["message"].responseData[0].responseCode.map((c:number) => EdaResponseCode.getMessage(c)).join(", ") : "-"
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
              e.responseCode = e.message.responseData.reduce((z: string, r: Record<string, any>) => r.responseCode
                ? r.responseCode.map((n:number) => EdaResponseCode.getMessage(n)).join(", ")
                : z, "-")
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
                (e.message.meterList[0].partFact+' %') : "" : ""
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

  const convertToGroup = (response: Record<string, EdaHistory[]>) => {
      if (response) {
       return Object.entries(response).reduce((g: Record<string, EdaHistoryGroup>, [k, v]) => {
          extractMessage(protocol, v).forEach(h => {
            (h.meteringPoints && h.meteringPoints.length > 0)
              ? h.meteringPoints.forEach(m => {
                g[m] || (g = {...g, [m]: {} as EdaHistoryGroup})
                g[m].participant = meterParticipants[m]
                g[m].histories = [...(g[m].histories || []), h]
                g[m].histories.sort((a, b) => a.date < b.date ? 1 : a.date > b.date ? -1 : 0)
              })
              : g /*(g['-'].histories = [...(g['-'].histories || []), h] || g['-'].histories.sort((a, b) => a.date < b.date ? 1 : a.date > b.date ? -1 : 0))*/
          })
          return g
        }, {} as Record<string, EdaHistoryGroup>)
      }
  }

  // const getEntriesForProcess = useCallback((process: string): Record<string, EdaHistoryGroup> => {
  //   if (entries) {
  //     const processEntries = getEntriesForProcessId(process)
  //     if (processEntries) {
  //       const r = Object.entries(processEntries).reduce((g: Record<string, EdaHistoryGroup>, [k, v]) => {
  //         extractMessage(process, v).forEach(h => {
  //           (h.meteringPoints && h.meteringPoints.length > 0)
  //             ? h.meteringPoints.forEach(m => {
  //               g[m] || (g = {...g, [m]: {} as EdaHistoryGroup})
  //               g[m].participant = meterParticipants[m]
  //               g[m].histories = [...(g[m].histories || []), h]
  //               g[m].histories.sort((a, b) => a.date < b.date ? 1 : a.date > b.date ? -1 : 0)
  //             })
  //             : g /*(g['-'].histories = [...(g['-'].histories || []), h] || g['-'].histories.sort((a, b) => a.date < b.date ? 1 : a.date > b.date ? -1 : 0))*/
  //         })
  //         return g
  //       }, {} as Record<string, EdaHistoryGroup>)
  //       console.log("entries", r, "process", processEntries)
  //       return r
  //     }
  //   }
  //   return {} as Record<string, EdaHistoryGroup>
  //
  // }, [entries])

  const calcProcessFilter = (filter: string | undefined, m: string, v: EdaHistoryGroup): boolean => {
    if (filter) {
      const f = filter.toLowerCase()
      return m.toLowerCase().indexOf(f) !== -1
          || (v.participant ? (v.participant.firstname.toLowerCase().indexOf(f) !== -1
            || (v.participant.lastname ? v.participant.lastname.toLowerCase().indexOf(f) !== -1 : false)
            || v.participant.participantNumber.toLowerCase().indexOf(f) !== -1) : false)
          || v.histories.findIndex(h => h.conversationId.toLowerCase().indexOf(f) !== -1) !== -1
    }
    return true
  }

  const renderMeterHeader = (meterId: string) => {
    const p = meterParticipants[meterId]
    return <div>{meterId} <div style={{fontSize:"12px"}}>{p
      ? (p.participantNumber.length === 0
      ? ' '
      : '(' + p.participantNumber + ') ') + (p.businessRole === 'EEG_PRIVATE' ? p.lastname : p.firstname)
      : ''}</div>
    </div>
  }

  const handleInput = (ev: Event) => {
    let query;
    const target = ev.target as HTMLIonSearchbarElement;
    if (target) query = target.value!;

    setProcessFilter(query)
  };

  if (loading) {
    return <div style={{height: "100%", display: "flex"}}><IonSpinner name="dots" color="primary" style={{margin: "auto", height: "48px", width: "48px"}}></IonSpinner></div>
  }

  return (
    <div style={{margin: "10px 24px"}}>
      <div>
        <IonSearchbar debounce={500} onIonInput={(ev) => handleInput(ev)}></IonSearchbar>
      </div>
      {(loading || !historyGroup)
        ? (<></>)
        : (
          <IonAccordionGroup>
            <PaginationComponent
              elements={Object
                .entries(historyGroup)
                .filter(([k, v]) => (processFilter || '').length > 0 ? calcProcessFilter(processFilter, k, v) : true)}
              perPage={20}
              renderEntry={(i, e) => {
                const [k, v] = e
                return (<IonAccordion key={i} value={"cm_rev_imp_" + i}>
                  <IonItem slot="header" color="light">
                    <IonLabel>{renderMeterHeader(k)}</IonLabel>
                  </IonItem>
                  {renderAccordionBody(protocol, v.histories)}
                </IonAccordion>)
              }}>
            </PaginationComponent>
          </IonAccordionGroup>
        )}
    </div>
  )
}