import React, {FC, useState} from "react";
import {useLocale} from "../../store/hook/useLocale";

// A field of an auto-saving form saves on its own: the answer of save is false or a rejection when it failed.
export type FieldSave = (name: string, value: any) => void | Promise<unknown>

export interface SaveStatusState {
  saving: boolean
  // the failed changes, by field; they are sent again on retry
  failed: Record<string, any>
  save: (name: string, value: any) => Promise<unknown>
  retry: () => void
}

// Tracks the saves of an auto-saving form for the save status (platform#228 step 4). The form keeps the user's input
// on a failure; retry sends every failed change again. save returns the answer of the wrapped save unchanged.
export const useSaveStatus = (fieldSave: FieldSave): SaveStatusState => {
  const [running, setRunning] = useState(0)
  const [failed, setFailed] = useState<Record<string, any>>({})

  const save = async (name: string, value: any) => {
    setRunning(n => n + 1)
    let result: unknown
    let ok: boolean
    try {
      result = await fieldSave(name, value)
      ok = result !== false
    } catch (e) {
      result = false
      ok = false
    }
    setFailed(prev => {
      const next = {...prev}
      if (ok) delete next[name]
      else next[name] = value
      return next
    })
    setRunning(n => n - 1)
    return result
  }

  const retry = () => Object.entries(failed).forEach(([name, value]) => save(name, value))

  return {saving: running > 0, failed, save, retry}
}

const SaveStatus: FC<{ status: SaveStatusState }> = ({status}) => {
  const {t} = useLocale("common")
  const style = {padding: "4px 16px", fontSize: "12px"}
  if (status.saving) {
    return <div role="status" style={{...style, color: "var(--ion-color-medium)"}}>{t("saveStatus.saving")}</div>
  }
  if (Object.keys(status.failed).length > 0) {
    return (
      <div role="status" style={{...style, color: "var(--ion-color-danger)"}}>
        {t("saveStatus.failed")} – <button type="button" onClick={status.retry}
                                         style={{background: "none", border: "none", padding: 0, color: "inherit",
                                           textDecoration: "underline", cursor: "pointer", font: "inherit"}}>
          {t("saveStatus.retry")}
        </button>
      </div>
    )
  }
  return <div role="status" style={{...style, color: "var(--ion-color-medium)"}}>{t("saveStatus.saved")}</div>
}

export default SaveStatus
