import React, {FC, useId} from "react";
import {IonContent, IonIcon, IonPopover} from "@ionic/react";
import {helpCircleOutline} from "ionicons/icons";
import {BALANCE_HELP, balanceText, isBalanced} from "./Balance.functions";

// "Bilanzdifferenz …" (red and bold when not balanced) with a help icon; the help opens on click/tap, so it also
// works on touch devices.
const BalanceValue: FC<{ difference: number, days: number }> = ({difference, days}) => {
  const trigger = `balance-help-${useId().replace(/:/g, "")}`
  return (
    <span style={{display: "inline-flex", alignItems: "center", gap: "4px"}}>
      <span style={isBalanced(difference, days) ? undefined : {color: "#F20A5E", fontWeight: "bold"}}>
        {balanceText(difference, days)}
      </span>
      <IonIcon id={trigger} icon={helpCircleOutline} aria-label="Erklärung Bilanzdifferenz" style={{cursor: "pointer"}}/>
      <IonPopover trigger={trigger} triggerAction="click">
        <IonContent class="ion-padding">{BALANCE_HELP}</IonContent>
      </IonPopover>
    </span>
  )
}

export default BalanceValue
