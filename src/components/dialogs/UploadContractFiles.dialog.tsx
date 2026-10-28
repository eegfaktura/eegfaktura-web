import {EegParticipant} from "../../models/members.model";
import React, {ChangeEvent, FC, ReactNode, useEffect, useRef, useState} from "react";
import {IonButton, IonButtons, IonIcon, IonModal} from "@ionic/react";
import {eegPdfDoc} from "../../eegIcons";
import {trash} from "ionicons/icons";

import "./UploadContractFiles.dialog.scss"

interface UploadContractFilesDialogProps {
  participant: EegParticipant;
  onDismiss: (data?: FormData, role?: string) => void;
  children?: ReactNode;
  uploadButtonText?: string;
}

// the types the filestore accepts (allowed_media_types); a dropped file skips the picker's accept filter
const CONTRACT_TYPES = ["application/pdf", "image/jpeg", "image/png"]
const CONTRACT_EXTENSIONS = /\.(pdf|jpe?g|png)$/i
export const isContractFile = (f: File) => f.type ? CONTRACT_TYPES.includes(f.type) : CONTRACT_EXTENSIONS.test(f.name)

const UploadContractFilesDialog: FC<UploadContractFilesDialogProps> = ({participant, onDismiss, children, uploadButtonText}) => {
  const inputFile = useRef<HTMLInputElement | null>(null)
  const [files, setFiles] = useState<File[]>([])
  const [dragOver, setDragOver] = useState(false)
  const [dropHint, setDropHint] = useState<string>()

  // drag & drop: files dropped while the dialog is open join the list, as if chosen one by one. Handled on the window,
  // so a drop beside the dialog never makes the browser open the file; only file drags are taken (text still drags).
  useEffect(() => {
    const isFileDrag = (e: DragEvent) => Array.from(e.dataTransfer?.types ?? []).includes("Files")
    const onDragOver = (e: DragEvent) => {
      if (!isFileDrag(e)) return
      e.preventDefault()
      setDragOver(true)
    }
    // leaving the window only: moving between elements of the dialog keeps the highlight
    const onDragLeave = (e: DragEvent) => {
      if (!e.relatedTarget) setDragOver(false)
    }
    const onDrop = (e: DragEvent) => {
      if (!isFileDrag(e)) return
      e.preventDefault()
      setDragOver(false)
      const dropped = Array.from(e.dataTransfer?.files ?? [])
      const accepted = dropped.filter(isContractFile)
      const refused = dropped.filter(f => !isContractFile(f))
      setDropHint(refused.length > 0
        ? `Nur PDF, JPEG oder PNG: ${refused.map(f => f.name).join(", ")} nicht übernommen.` : undefined)
      if (accepted.length > 0) setFiles(prev => [...prev, ...accepted])
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

  // const formData = new FormData();
  function confirm() {
    const formData = new FormData();
    files.forEach(f => {
      if (f) {
        formData.append('docfiles', f, f.name);
      }
    })
    onDismiss(formData, 'confirm');
  }

  const appendFileToFormData = () => {
    inputFile.current?.click()
  }

  const onFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const newfiles = e.target.files
    if (newfiles && newfiles.length > 0) {
      setFiles([...files, newfiles[0]])
    }
  }

  return (
    <div className="doc-upload-modal">
      <div className={dragOver ? "wrapper drag-over" : "wrapper"} data-testid="contract-drop-zone">
        {children}
        <input type="file" id="file" accept=".jpeg,.png,.pdf" ref={inputFile} style={{display: "none"}} onChange={onFileChange}/>
        <IonButton expand="block" onClick={() => appendFileToFormData()}> DATEI AUSWÄHLEN
          {/* eslint-disable-next-line react/jsx-no-undef */}
          <IonIcon slot="start" icon={eegPdfDoc} />
        </IonButton>
        <div className="drop-hint">oder Dateien hierher ziehen (PDF, JPEG, PNG)</div>
        {dropHint && <div className="drop-refused">{dropHint}</div>}
        <div className={"file-list"}>
          {files.map((v, i) => (
            <div className={"entry"} key={i}>
              <div>{v.name}</div>
              <IonButton size={"small"} fill={"clear"} onClick={() => setFiles((prevState) => prevState.filter((f, ii) => i !== ii))}>
                <IonIcon slot="icon-only" icon={trash} />
              </IonButton>
            </div>
          ))}
        </div>
      </div>
      <div style={{display: "flex", flexDirection:"row-reverse"}}>
        <IonButtons color="eeg" slot={"end"} style={{color: "black"}}>
          <IonButton fill="clear" onClick={() => onDismiss()}>Abbrechen</IonButton>
          <IonButton fill="clear" slot={"end"} onClick={() => confirm()}>{uploadButtonText ? uploadButtonText : "Zulassen"}</IonButton>
        </IonButtons>
      </div>
    </div>
  )
}

export default UploadContractFilesDialog;