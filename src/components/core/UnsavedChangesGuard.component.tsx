import React, {FC, useEffect} from "react";
import {Prompt} from "react-router";

export const UNSAVED_CHANGES_MESSAGE = "Die Eingaben sind noch nicht gespeichert. Seite trotzdem verlassen?"

interface UnsavedChangesGuardProps {
  dirty: boolean
  // true lets a navigation pass without the question, e.g. right after a successful save
  allowLeave?: () => boolean
}

// Warns before unsaved input is lost: on navigation inside the app (Prompt) and on reload or closing the
// tab (beforeunload) — 261024-ca18.
const UnsavedChangesGuard: FC<UnsavedChangesGuardProps> = ({dirty, allowLeave}) => {
  useEffect(() => {
    if (!dirty) return
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (allowLeave?.()) return
      e.preventDefault()
      e.returnValue = ""
    }
    window.addEventListener("beforeunload", onBeforeUnload)
    return () => window.removeEventListener("beforeunload", onBeforeUnload)
  }, [dirty, allowLeave])

  return <Prompt when={dirty} message={() => allowLeave?.() ? true : UNSAVED_CHANGES_MESSAGE}/>
}

export default UnsavedChangesGuard
