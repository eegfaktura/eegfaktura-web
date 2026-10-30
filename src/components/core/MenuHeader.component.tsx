import React, {FC} from "react";
import {IonButtons, IonHeader, IonMenuButton, IonTitle, IonToolbar} from "@ionic/react";

// Below 992 px the split pane hides the side menu; this header gives pages without a toolbar of their own a way to
// open it (261024-ca9). It is hidden from 992 px on (ion-hide-lg-up, the split pane's "lg" breakpoint), where the
// menu is shown beside the page anyway. Same look as the header of the register page.
const MenuHeaderComponent: FC = () => (
  <IonHeader className="ion-hide-lg-up">
    <IonToolbar color="primary">
      <IonButtons slot="start">
        <IonMenuButton></IonMenuButton>
      </IonButtons>
      <IonTitle>EEG <span style={{color: "#79DFB4"}}>Faktura</span></IonTitle>
    </IonToolbar>
  </IonHeader>
)

export default MenuHeaderComponent
