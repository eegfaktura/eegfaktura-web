import React, {FC, useEffect, useState} from "react";
import {IonIcon, IonItem, IonLabel, IonList, IonListHeader} from "@ionic/react";
import {InvoiceDocumentResponse} from "../../models/meteringpoint.model";
import {EegParticipant} from "../../models/members.model";
import {eegPdfDoc} from "../../eegIcons";
import {Api} from "../../service";
import cn from "classnames";

import "./InvoiceDocument.component.scss"

const InvoiceDocumentItem: FC<{tenant: string, item: InvoiceDocumentResponse}> = ({tenant, item}) => {
  async function downloadBillingDocument(fileDataId: string) {
    try {
      Api.eegService.downloadBillingDocument(tenant, fileDataId).then(b => {
        const fileURL = URL.createObjectURL(b);
        // //Open the URL on new Window
        window.open(fileURL, '_blank');
      })
    } catch (e) {
      console.log(e as string)
    }
  }

  return (
    <IonItem button key={item.billingDocumentId} lines="none" onClick={() => downloadBillingDocument(item.fileDataId)}>
      <IonLabel> {item.name} </IonLabel>
      <IonIcon icon={eegPdfDoc} slot="start"></IonIcon>
    </IonItem>
  )
}

const InvoiceDocumentComponent: FC<{tenant: string, participant: EegParticipant}> = ({tenant, participant}) => {

  const [invoiceDocs, setInvoiceDocs] = useState<InvoiceDocumentResponse[]>([])
  const [selectedMenuItem, setSelectedMenuItem] = useState<number>(0)

  useEffect(() => {
    if (tenant && participant) {
      Api.eegService.fetchBillingDocumentFiles(tenant)
        .then(docs => docs.filter(d => d.participantId === participant.id))
        .then(docs => setInvoiceDocs(docs))
        .then(_ => setSelectedMenuItem(0))
    }
  }, [tenant, participant])

  const renderInvoiceDocuments = () => {
    const search = (name: string): boolean => {
      if (selectedMenuItem === 1) {
        return name.search(/rechnung/gi) > 0
      } else if (selectedMenuItem === 2) {
        return name.search(/gutschrift/gi) > 0
      } else if (selectedMenuItem === 3) {
        return name.search(/information/gi) > 0
      } else {
        return true
      }
    }
    switch (selectedMenuItem) {
      case 0:
        return (
          invoiceDocs.map((d, i) =>
            <InvoiceDocumentItem tenant={tenant} item={d} />
          )
        )
      default:
        return (
          invoiceDocs.filter(d => search(d.name)).map((d, i) => (
            <InvoiceDocumentItem tenant={tenant} item={d} />
          ))
        )
    }
  }

  return (
    <div>
      <IonList>
        <IonListHeader><h2>Rechnungen</h2></IonListHeader>
        <div className="invoiceDocument-menu">
          <div className={cn("item", {selected: selectedMenuItem === 0 })} onClick={() => setSelectedMenuItem(0)}>Alle</div>
          <div className={cn("item", {selected: selectedMenuItem === 1 })} onClick={() => setSelectedMenuItem(1)}>Rechnungen</div>
          <div className={cn("item", {selected: selectedMenuItem === 2 })} onClick={() => setSelectedMenuItem(2)}>Gutschriften</div>
          <div className={cn("item", {selected: selectedMenuItem === 3 })} onClick={() => setSelectedMenuItem(3)}>Information</div>
        </div>
        {renderInvoiceDocuments()}
      </IonList>
    </div>
  )
}

export default InvoiceDocumentComponent;