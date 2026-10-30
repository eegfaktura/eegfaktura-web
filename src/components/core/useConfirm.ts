import {useIonAlert} from "@ionic/react";

// Asks before an action that cannot be undone; the action runs only on the confirm button. onCancel runs otherwise,
// e.g. to show a toggle or select the old choice again.
export const useConfirm = () => {
  const [alert] = useIonAlert()
  return (subHeader: string, message: string, confirmText: string, action: () => void, onCancel?: () => void) =>
    alert({
      subHeader, message,
      buttons: [{text: "Abbrechen", role: "cancel"}, {text: confirmText, role: "confirm"}],
      onDidDismiss: (e: CustomEvent) => {
        if (e.detail.role === "confirm") action()
        else onCancel?.()
      },
    })
}
