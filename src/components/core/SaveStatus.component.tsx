import React, {FC, useRef, useState} from "react";
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
// Only the answer to the latest save of a field counts: a late failure of an older save does not mark a newer, saved
// value as failed, and a late success does not clear the failure of a newer one.
export const useSaveStatus = (fieldSave: FieldSave): SaveStatusState => {
  const [running, setRunning] = useState(0)
  const [failed, setFailed] = useState<Record<string, any>>({})
  const sequence = useRef(0)
  const latest = useRef<Record<string, number>>({})

  const save = async (name: string, value: any) => {
    const seq = ++sequence.current
    latest.current[name] = seq
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
    if (latest.current[name] === seq) {
      setFailed(prev => {
        const next = {...prev}
        if (ok) delete next[name]
        else next[name] = value
        return next
      })
    }
    setRunning(n => n - 1)
    return result
  }

  const retry = () => Object.entries(failed).forEach(([name, value]) => save(name, value))

  return {saving: running > 0, failed, save, retry}
}

// The form's errors on fields the user changed: a stored incomplete value (e.g. an empty street) that only got
// validated on blur is no unsaved input. errors and dirtyFields are react-hook-form's nested objects.
export const hasErrorOnChangedField = (errors: object, dirtyFields: object): boolean => {
  const walk = (err: any, dirty: any): boolean => {
    if (!err || typeof err !== "object") return false
    // a field's error carries its type; dirty is then true for the field
    if ("type" in err && typeof err.type === "string") return dirty === true || (typeof dirty === "object" && dirty !== null)
    return Object.keys(err).some(k => walk(err[k], dirty?.[k]))
  }
  return walk(errors, dirtyFields)
}

// unsaved: changes failed to save, or fields are invalid (an invalid value is not sent at all)
export const hasUnsaved = (status: SaveStatusState, invalid: boolean) => invalid || Object.keys(status.failed).length > 0

// invalid: the form has invalid fields; their input is not saved
const SaveStatus: FC<{ status: SaveStatusState, invalid?: boolean }> = ({status, invalid}) => {
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
  if (invalid) {
    return <div role="status" style={{...style, color: "var(--ion-color-danger)"}}>{t("saveStatus.invalid")}</div>
  }
  return <div role="status" style={{...style, color: "var(--ion-color-medium)"}}>{t("saveStatus.saved")}</div>
}

export default SaveStatus
