import {EdaHistory} from "../../../models/process.model";
import React from "react";
import {IonIcon} from "@ionic/react";
import {chevronForwardOutline} from "ionicons/icons";
import {GroupBy} from "../../../util/Helper.util";
import moment from "moment";
import {formatDate} from "../../../util/DateFormat.util";

// Dates and times of the process history in German format (platform#224), in local time like the other dates of the app.
export const formatHistoryDate = (d: Date) => formatDate(d)
export const formatHistoryTime = (d: Date) => moment(d).format("HH:mm:ss")

const renderTableWithConversationId = (headers: string[], e: EdaHistory[]) => {
  return (
    <div className="ion-padding"
         style={{display: "grid", gridTemplateColumns: "0.5fr 1fr 1fr", rowGap: "10px"}}>
              <span style={{
                gridColumnStart: "1",
                borderBottom: "1px solid #dfdfdf"
              }}><strong>{headers[0]}</strong></span>
      <span
        style={{gridColumnStart: "2", borderBottom: "1px solid #dfdfdf"}}><strong>{headers[1]}</strong></span>
      <span style={{
        gridColumnStart: "3",
        borderBottom: "1px solid #dfdfdf"
      }}><strong>{headers[2]}</strong></span>
      {Object.entries(GroupBy(e, i => i.conversationId)).map(([id, hl], i) => (
        <React.Fragment key={"line" + id + i}>
          <div
            style={{/*display: "inline-block",*/
              gridColumnStart: "1",
              gridColumnEnd: "4",
              fontSize: "12px"
            }}>Conversation-Id: {id}</div>
          {hl.map((h, ii) => (
            <React.Fragment key={"line_item" + ii}>
                <span style={{gridColumnStart: "1"}}>
                  <div>
                    <div style={{fontSize: "0.9em"}}>{formatHistoryDate(h.date)}</div>
{/*
                    <div style={{fontSize: "0.8em"}}>{h.date.toLocaleTimeString()}</div>
*/}
                    <div style={{fontSize: "0.8em"}}>{formatHistoryTime(h.date)}</div>
                  </div>
                </span>
              <span style={{gridColumnStart: "2", margin: "auto 0"}}>{h.processType}</span>
              <span style={{gridColumnStart: "3", margin: "auto 0"}}>{h.responseCode}</span>
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

// "Aufhebung der Datenfreigabe" comes in three protocols: by the grid operator (CM_REV_IMP), by the
// community itself (CM_REV_SP) and by the member, e.g. in the grid operator's portal (CM_REV_CUS).
export const REVOKE_PROTOCOLS = ["CM_REV_IMP", "CM_REV_SP", "CM_REV_CUS"]

export const mergeProtocolEntries = <T,>(protocols: string[], entries: Record<string, Record<string, T>> | undefined): Record<string, T> =>
  protocols.reduce((result, p) => ({...result, ...((entries && entries[p]) || {})}), {} as Record<string, T>)

export const renderAccordionBody = (p: string, v: EdaHistory[]) => {
  switch (p) {
    case "CM_REV_IMP":
      return (
        <div style={{boxShadow: "2px 1px 1px lightgray", margin: "10px", border: "1px solid #d3d3d34f"}}
             className="ion-padding" slot="content">
          {renderTableWithConversationId(["Abgewickelt am:", "Protokoll", "Zustimmung endet am:"], v)}
        </div>
      )
    case "EC_REQ_ONL":
      return (
        <div style={{boxShadow: "2px 1px 1px lightgray", margin: "10px", border: "1px solid #d3d3d34f"}}
             className="ion-padding" slot="content">
          {renderTableWithConversationId(["Abgewickelt am:", "Protokoll", "Status"], v)}
        </div>
      )
    case "CR_REQ_PT":
      return (
        <div style={{boxShadow: "2px 1px 1px lightgray", margin: "10px", border: "1px solid #d3d3d34f"}}
             className="ion-padding" slot="content">
          {renderTableWithConversationId(["Abgewickelt am:", "Protokoll", "Info"], v)}
        </div>
      )
    case "EC_PRTFACT_CHANGE":
      return (
        <div style={{boxShadow: "2px 1px 1px lightgray", margin: "10px", border: "1px solid #d3d3d34f"}}
             className="ion-padding" slot="content">
          {renderTableWithConversationId(["Abgewickelt am:", "Protokoll", "Info"], v)}
        </div>
      )
    case "CR_MSG":
      return (
        <div style={{boxShadow: "2px 1px 1px lightgray", margin: "10px", border: "1px solid #d3d3d34f"}}
             className="ion-padding" slot="content">
          <div className="ion-padding"
               style={{display: "grid", gridTemplateColumns: "0.5fr auto 0.1fr auto auto", rowGap: "10px"}}>
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
              style={{
                gridColumnStart: "4",
                borderBottom: "1px solid #dfdfdf"
              }}><strong>{"Energiedaten bis:"}</strong></span>
            {v.map((h, i) => (
              <React.Fragment key={"line" + p + i}>
                <span style={{gridColumnStart: "1"}}>
                  <div style={{fontSize: "0.9em"}}>{formatHistoryDate(h.date)}</div>
                  <div style={{fontSize: "0.8em"}}>{formatHistoryTime(h.date)}</div>
                </span>
                <span style={{gridColumnStart: "2"}}>{(h.meteringFrom ? formatHistoryDate(h.meteringFrom) : "-")}</span>
                <span style={{gridColumnStart: "3"}}><IonIcon icon={chevronForwardOutline} size="small"/> </span>
                <span style={{gridColumnStart: "4"}}>{(h.meteringTo ? formatHistoryDate(h.meteringTo) : "-")}</span>
              </React.Fragment>
            ))}
          </div>
        </div>
      )
  }
  return (<></>)
}