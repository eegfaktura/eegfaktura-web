import {useIonAlert} from "@ionic/react";

// Asks before an action that cannot be undone; the action runs only on the confirm button.
export const useConfirm = () => {
  const [alert] = useIonAlert()
  return (subHeader: string, message: string, confirmText: string, action: () => void) =>
    alert({
      subHeader, message,
      buttons: [{text: "Abbrechen", role: "cancel"}, {text: confirmText, role: "confirm"}],
      onDidDismiss: (e: CustomEvent) => {
        if (e.detail.role === "confirm") action()
      },
    })
}
