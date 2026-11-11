import {useIonToast} from "@ionic/react";
import {useLocale} from "../../store/hook/useLocale";

// Feedback after an EDA process request: a short info on success, an error that stays until closed on failure.
export const useProcessFeedback = () => {
  const [toaster] = useIonToast()
  const {t: errorT} = useLocale("error")

  // detail: a note after the confirmation, shown longer
  const sent = (detail?: string) => detail
    ? toaster({message: `${errorT("process.request_ok")} ${detail}`, duration: 8000, position: "bottom"})
    : toaster({message: errorT("process.request_ok"), duration: 3500, position: "bottom"})

  // an info instead of the confirmation, e.g. when nothing was sent
  const info = (message: string) => toaster({message, duration: 8000, position: "bottom"})

  const failed = (e: unknown) => {
    const detail = e instanceof Error && e.message ? ` (${e.message})` : ""
    toaster({message: errorT("process.request_error") + detail, position: "bottom", color: "danger",
      buttons: [{text: "OK"}]})
  }

  return {sent, failed, info}
}
