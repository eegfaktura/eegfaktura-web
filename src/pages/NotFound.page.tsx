import React, {FC} from "react";
import {IonButton, IonContent, IonPage} from "@ionic/react";

// An unknown URL (e.g. an old bookmark) used to render an empty page (261024-ca12).
const NotFoundPage: FC = () => (
  <IonPage>
    <IonContent fullscreen color="eeg">
      <div className="full-screen-center" style={{flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "16px"}}>
        <div>Diese Seite gibt es nicht.</div>
        <IonButton routerLink="/page/participants">Zur Startseite</IonButton>
      </div>
    </IonContent>
  </IonPage>
)

export default NotFoundPage
