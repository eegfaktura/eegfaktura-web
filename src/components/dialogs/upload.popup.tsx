import React, {ChangeEvent, FC, forwardRef, useEffect, useRef, useState} from "react";
import {IonButton, IonCol, IonContent, IonGrid, IonIcon, IonInput, IonItem, IonLabel, IonRow} from "@ionic/react";
import {people, star} from "ionicons/icons";
import ToggleButtonComponent from "../ToggleButton.component";
import {eegBusiness} from "../../eegIcons";
import "./upload.popover.scss"


// default sheet names: slot 0 master data, slot 1 energy data; an emptied field falls back to them
const DEFAULT_SHEETS: [string, string] = ["EEG Stammdaten", "Energiedaten"]

const UploadPopup: FC<{
  tenant: string
  online: boolean
  onDismiss: (data: [files: FileList | null | undefined, sheet: string, type: number], role: string) => void
}> = ({tenant, online, onDismiss}) => {

  const [sheetName, setSheetName] = useState<[string, string]>(DEFAULT_SHEETS)
  const [file, setFile] = useState<FileList | null>();
  const [selectedImportType, setSelectedImportType] = useState<number>(online ? 0 : 1)
  const [dragOver, setDragOver] = useState(false)
  const [dropHint, setDropHint] = useState<string>()

  const fileInput = useRef<HTMLInputElement>(null)

  // drag & drop (pilot group): a file dropped while the dialog is open is taken like one chosen with the star, one file
  // per import. Handled on the window, so a drop beside the dialog never makes the browser open the file; only file drags
  // are taken, so dragging text into the sheet-name field still works.
  useEffect(() => {
    const isFileDrag = (e: DragEvent) => Array.from(e.dataTransfer?.types ?? []).includes("Files")
    const onDragOver = (e: DragEvent) => {
      if (!isFileDrag(e)) return
      e.preventDefault()
      setDragOver(true)
    }
    // leaving the window only: moving between child elements must not switch the highlight off
    const onDragLeave = (e: DragEvent) => {
      if (!e.relatedTarget) setDragOver(false)
    }
    const onDrop = (e: DragEvent) => {
      if (!isFileDrag(e)) return
      e.preventDefault()
      setDragOver(false)
      const dropped = e.dataTransfer?.files
      if (!dropped || dropped.length === 0) return
      // a file chosen before with the star no longer applies
      if (fileInput.current) fileInput.current.value = ""
      if (dropped.length > 1) {
        setDropHint("Bitte nur eine Datei pro Import ablegen.")
        setFile(undefined)
        return
      }
      setDropHint(undefined)
      setFile(dropped)
    }
    window.addEventListener("dragover", onDragOver)
    window.addEventListener("dragleave", onDragLeave)
    window.addEventListener("drop", onDrop)
    return () => {
      window.removeEventListener("dragover", onDragOver)
      window.removeEventListener("dragleave", onDragLeave)
      window.removeEventListener("drop", onDrop)
    }
  }, [])

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
      <div className={dragOver ? "upload-drop-zone drag-over" : "upload-drop-zone"} data-testid="upload-drop-zone">
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
            ref={fileInput}
            name="btn-upload"
            style={{display: 'none'}}
            type="file"
            onChange={onChange}/>
          <span>
          <IonIcon slot="icon-only" icon={star}></IonIcon>
        </span>
        </label>
      </div>
      <IonButton expand="block" onClick={() => onDismiss([file, sheetName[selectedImportType].trim() || DEFAULT_SHEETS[selectedImportType], selectedImportType], "confirm")}>Import</IonButton>
      </div>

    </IonContent>
  )
}

export default UploadPopup;