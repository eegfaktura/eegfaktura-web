import React, {FC, useEffect, useRef} from "react";
import {Prompt} from "react-router";
import {useIonViewWillEnter, useIonViewWillLeave} from "@ionic/react";
import {useConfirm} from "./useConfirm";

export const UNSAVED_CHANGES_MESSAGE = "Die Eingaben sind noch nicht gespeichert. Seite trotzdem verlassen?"

interface UnsavedChangesGuardProps {
  dirty: boolean
  // true lets a navigation pass without the question, e.g. right after a successful save
  allowLeave?: () => boolean
}

// Warns before unsaved input is lost: on navigation inside the app (Prompt) and on reload or closing the
// tab (beforeunload) — 261024-ca18.
// The IonRouterOutlet keeps a page left through the menu mounted (hidden): the guard only asks while its page is
// shown, otherwise every later navigation between other pages would ask again.
const UnsavedChangesGuard: FC<UnsavedChangesGuardProps> = ({dirty, allowLeave}) => {
  const shown = useRef(true)
  useIonViewWillEnter(() => { shown.current = true })
  useIonViewWillLeave(() => { shown.current = false })
  const pass = () => !shown.current || !!allowLeave?.()

  useEffect(() => {
    if (!dirty) return
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      if (pass()) return
      e.preventDefault()
      e.returnValue = ""
    }
    window.addEventListener("beforeunload", onBeforeUnload)
    return () => window.removeEventListener("beforeunload", onBeforeUnload)
  }, [dirty, allowLeave])

  return <Prompt when={dirty} message={() => pass() ? true : UNSAVED_CHANGES_MESSAGE}/>
}

// Leaving inside a page (closing a pane, selecting another entry) is no navigation the guard sees: such an action
// asks first with this hook while the form holds unsaved input (platform#228 step 4).
export const UNSAVED_DISCARD_HEADER = "Ungespeicherte Änderungen"
export const UNSAVED_DISCARD_MESSAGE = "Die Eingaben sind noch nicht gespeichert. Verwerfen und fortfahren?"
export const UNSAVED_DISCARD_BUTTON = "Verwerfen"

export const useConfirmDiscard = () => {
  const confirm = useConfirm()
  return (dirty: boolean, action: () => void) =>
    dirty ? confirm(UNSAVED_DISCARD_HEADER, UNSAVED_DISCARD_MESSAGE, UNSAVED_DISCARD_BUTTON, action) : action()
}

export default UnsavedChangesGuard
