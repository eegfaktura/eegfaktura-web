import {useIonAlert} from "@ionic/react";

// Asks before an action that cannot be undone; the action runs only on the confirm button.
// Resolves with true on confirm, false on cancel or backdrop: a caller can await it (e.g. inside a form submit, which
// keeps the submit button disabled until the dialog is closed) instead of passing an action.
export const useConfirm = () => {
  const [alert] = useIonAlert()
  return (subHeader: string, message: string, confirmText: string, action?: () => void) =>
    new Promise<boolean>(resolve => alert({
      subHeader, message,
      buttons: [{text: "Abbrechen", role: "cancel"}, {text: confirmText, role: "confirm"}],
      onDidDismiss: (e: CustomEvent) => {
        const confirmed = e.detail.role === "confirm"
        if (confirmed && action) action()
        resolve(confirmed)
      },
    }))
}
