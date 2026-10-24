import {useIonToast} from "@ionic/react";
import {useLocale} from "../../store/hook/useLocale";

// Feedback after an EDA process request: a short info on success, an error that stays until closed on failure.
export const useProcessFeedback = () => {
  const [toaster] = useIonToast()
  const {t: errorT} = useLocale("error")

  const sent = () => toaster({message: errorT("process.request_ok"), duration: 3500, position: "bottom"})

  const failed = (e: unknown) => {
    const detail = e instanceof Error && e.message ? ` (${e.message})` : ""
    toaster({message: errorT("process.request_error") + detail, position: "bottom", color: "danger",
      buttons: [{text: "OK"}]})
  }

  return {sent, failed}
}
