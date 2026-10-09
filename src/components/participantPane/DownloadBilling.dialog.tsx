import React, {FC, useEffect, useRef, useState} from "react";
import {
  IonButton,
  IonButtons, IonCard, IonCardContent, IonCheckbox,
  IonContent,
  IonFooter,
  IonHeader, IonIcon,
  IonInput,
  IonItem, IonLabel, IonList, IonListHeader,
  IonPage, IonSelect,
  IonTitle,
  IonToolbar
} from "@ionic/react";

import DatePickerCoreElement from "../core/elements/DatePickerCore.element";
import moment from "moment";
import {ConvertExcelToXML} from "../../service/sepa.converter";
import {SelectedPeriod} from "../../models/energy.model";
import {Eeg} from "../../models/eeg.model";
import {downloadOutline, settingsSharp} from "ionicons/icons";
import {useLocale} from "../../store/hook/useLocale";

export const DownloadBillingDialog:FC<{billingRunId: string, tenant: string, eeg: Eeg, period: SelectedPeriod, onDismiss: (data?: string | null | undefined | number, role?: string) => void}> = ({billingRunId, tenant, eeg, period, onDismiss})=>  {
  const inputRef = useRef<HTMLIonInputElement>(null);

  const [files, setFiles] = useState<{ blob: Blob, name: string }[] | null>(null)
  const [collectionDate, setCollectionDate] = useState<Date | null>(moment().toDate())
  const [error, setError] = useState<string | null>(null)
  const [skippedDebit, setSkippedDebit] = useState<string[]>([])
  const [withoutIban, setWithoutIban] = useState<string[]>([])
  const [batch, setBatch] = useState<boolean>(true)
  const [summarize, setSummarize] = useState<boolean>(true)

  const {t: t_err} = useLocale("error")

  useEffect(() => {
    console.log("Batch", batch)
  }, []);

  const prepareSepaFilesForDownload = async (): Promise<{ blob: Blob, name: string }[]> => {
    const files = await ConvertExcelToXML(tenant, billingRunId, eeg, collectionDate!, period, batch, summarize)
    if (files) {
      setSkippedDebit(files.skippedDebit)
      setWithoutIban(files.withoutIban)
      return [
        { blob: new Blob([files.debit.content], { type: 'application/xml' }), name: files.debit.name },
        { blob: new Blob([files.transfer.content], { type: 'application/xml' }), name: files.transfer.name },
      ];
    }
    return Promise.reject(new Error(`No file found`));
  }

  const onCreate = async () => {
    setError(null)
    try {
      const blob = await prepareSepaFilesForDownload()
      setFiles(blob)
    } catch (err) {
      if (err instanceof Error) {
        switch (err.message) {
          case "E_BIC_MISSING":
          case "E_IBAN_MISSING":
          case "E_NO_CREDITOR_ID":
            setError(t_err(err.message))
        }
      }
      console.error("Unknown error:", err);
    }
  }

  const onDownload = (blob: Blob, filename: string) => {
    try {

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename; // Suggested filename for the downloaded file

      // Append to body and click it programmatically
      document.body.appendChild(a);
      a.click();

      // Clean up the temporary URL and element
      document.body.removeChild(a);
      URL.revokeObjectURL(url); // Release the object URL

    } catch (err: any) {
      setError("Failed to download XML file. " + err.message);
    }
  }
  return (
    <IonPage>
      <IonHeader>
        <IonToolbar color="primary">
          <IonTitle>SEPA Dateien</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent className="ion-padding">
        <DatePickerCoreElement label={"Fälligkeitsdatum"} name={"collectionDate"} initialValue={collectionDate} placeholder={"fällig am ..."} onChange={(name, value) => setCollectionDate(value)} />

        <IonList>
          <IonItem>
            <IonCheckbox checked={batch} onIonChange={() => setBatch(!batch)}>SEPA Sammelbuchung</IonCheckbox>
          </IonItem>
          <IonItem slot="start">
            <IonCheckbox checked={summarize} onIonChange={() => setSummarize(!summarize)}>Mitglieder zusammenfassen</IonCheckbox>
          </IonItem>
        </IonList>
        <IonButton className="ion-back" onClick={onCreate} disabled={!collectionDate}>
          Generieren
        </IonButton>
        {!!error && (
          <IonLabel>{error}</IonLabel>
        )}
        {skippedDebit.length > 0 && (
          <IonLabel>
            <p>Nicht in der Lastschrift (Einzugsart „Kein SEPA“): {skippedDebit.join(", ")}</p>
          </IonLabel>
        )}
        {withoutIban.length > 0 && (
          <IonLabel>
            <p>Ohne IBAN, bitte manuell abwickeln: {withoutIban.join(", ")}</p>
          </IonLabel>
        )}

        {files && files.map((file, i) =>
            <div key={i}>
              <IonCard>
                <IonCardContent>{file.name}</IonCardContent>
                <IonButton fill="clear" onClick={() => onDownload(file.blob, `${file.name}.xml`)}>Herunterladen</IonButton>
              </IonCard>
            </div>
          // <IonItem key={i}>
          //   <IonLabel>{file.name}</IonLabel>
          //   <IonButton fill="clear" size="small" onClick={() => onDownload(file.blob, `${file.name}.xml`)}>
          //     <IonIcon slot="icon-only" md={downloadOutline}></IonIcon>
          //   </IonButton>
          // </IonItem>
        )}
      </IonContent>
      <IonFooter>
        <IonToolbar>
        <IonButtons slot="end">
          <IonButton slot="end" color="primary" onClick={() => onDismiss(null, 'cancel')}>
            Schließen
          </IonButton>
        </IonButtons>
        </IonToolbar>
      </IonFooter>
    </IonPage>
  )
}

