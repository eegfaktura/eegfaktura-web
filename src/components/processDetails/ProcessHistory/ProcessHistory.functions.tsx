import {EdaHistory} from "../../../models/process.model";
import React from "react";
import {IonIcon} from "@ionic/react";
import {chevronForwardOutline} from "ionicons/icons";
import {GroupBy} from "../../../util/Helper.util";

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
                    <div style={{fontSize: "0.9em"}}>{h.date.toDateString()}</div>
{/*
                    <div style={{fontSize: "0.8em"}}>{h.date.toLocaleTimeString()}</div>
*/}
                    <div style={{fontSize: "0.8em"}}>{h.date.toTimeString()}</div>
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
                <span style={{gridColumnStart: "1"}}>{h.date.toDateString()}</span>
                <span style={{gridColumnStart: "2"}}>{(h.meteringFrom ? h.meteringFrom.toDateString() : "-")}</span>
                <span style={{gridColumnStart: "3"}}><IonIcon icon={chevronForwardOutline} size="small"/> </span>
                <span style={{gridColumnStart: "4"}}>{(h.meteringTo ? h.meteringTo.toDateString() : "-")}</span>
              </React.Fragment>
            ))}
          </div>
        </div>
      )
  }
  return (<></>)
}