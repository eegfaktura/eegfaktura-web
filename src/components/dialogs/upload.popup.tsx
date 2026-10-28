import React, {ChangeEvent, DragEvent, FC, forwardRef, useState} from "react";
import {IonButton, IonCol, IonContent, IonGrid, IonIcon, IonInput, IonItem, IonLabel, IonRow} from "@ionic/react";
import {people, star} from "ionicons/icons";
import ToggleButtonComponent from "../ToggleButton.component";
import {eegBusiness} from "../../eegIcons";
import "./upload.popover.scss"


const UploadPopup: FC<{
  tenant: string
  online: boolean
  onDismiss: (data: [files: FileList | null | undefined, sheet: string, type: number], role: string) => void
}> = ({tenant, online, onDismiss}) => {

  const [sheetName, setSheetName] = useState<[string, string]>(["EEG Stammdaten", "Energiedaten"])
  const [file, setFile] = useState<FileList | null>();
  const [selectedImportType, setSelectedImportType] = useState<number>(online ? 0 : 1)
  const [dragOver, setDragOver] = useState(false)
  const [dropHint, setDropHint] = useState<string>()

  // drag & drop (pilot group): a file dropped on the dialog is taken like one chosen with the star; one file per import
  const onDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(true);
  }
  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragOver(false);
    const dropped = e.dataTransfer?.files;
    if (!dropped || dropped.length === 0) return;
    if (dropped.length > 1) {
      setDropHint("Bitte nur eine Datei pro Import ablegen.");
      return;
    }
    setDropHint(undefined);
    setFile(dropped);
  }

  const onChange = (evt: ChangeEvent<HTMLInputElement>) => {
    setDropHint(undefined);
    setFile(evt.target.files);
    // onUpdate(evt.target.files)
  }

  // the sheet name of the selected import type: slot 0 master data, slot 1 energy data (261028-mm2)
  const onChangeSheetname = (value: string) =>
    setSheetName(prev => selectedImportType === 1 ? [prev[0], value] : [value, prev[1]])

  return (
    <IonContent className="ion-padding" color="eeglight">
      <div className={dragOver ? "upload-drop-zone drag-over" : "upload-drop-zone"} data-testid="upload-drop-zone"
           onDragOver={onDragOver} onDragLeave={() => setDragOver(false)} onDrop={onDrop}>
      <IonGrid>
        <IonRow>
          <IonCol size="auto">
            <div>Upload Daten für <strong>{tenant}</strong></div>
          </IonCol>
        </IonRow>
        <IonRow>
          <IonCol size="auto">
            <ToggleButtonComponent
              buttons={online ? [{label: 'Stammdaten', icon: eegBusiness}] : [{label: 'Stammdaten', icon: eegBusiness}, {label: 'Energiedaten', icon: people}]}
              onChange={setSelectedImportType}
              value={selectedImportType}
              changeable={!online}
            />
          </IonCol>
        </IonRow>
      </IonGrid>

        <IonItem color="eeglight" lines="full">
          <IonInput label="Sheet-Name" labelPlacement="floating" name="sheetName" value={sheetName[selectedImportType]}
                    onIonChange={(e) => { if (typeof e.detail.value === 'string') onChangeSheetname(e.detail.value) }}></IonInput>
        </IonItem>
      <div style={{display: "flex", flexDirection: "row", justifyContent: "space-between", alignItems: "center"}}>
        <IonItem color="eeglight" lines="full">
          <IonLabel position={"stacked"}>Filename</IonLabel>
          <div style={{fontSize: "12px"}}>
            {
              (file && file.length > 0) ? file[0].name : "Datei hierher ziehen oder mit dem Stern auswählen"
            }
          </div>
          {dropHint && <div className="upload-drop-hint">{dropHint}</div>}
        </IonItem>
        <label htmlFor="btn-upload">
          <input
            id="btn-upload"
            name="btn-upload"
            style={{display: 'none'}}
            type="file"
            onChange={onChange}/>
          <span>
          <IonIcon slot="icon-only" icon={star}></IonIcon>
        </span>
        </label>
      </div>
      <IonButton expand="block" onClick={() => onDismiss([file, sheetName[selectedImportType], selectedImportType], "confirm")}>Import</IonButton>
      </div>

    </IonContent>
  )
}

export default UploadPopup;