import React, {FC} from "react";
import {IonButton, IonContent, IonPage} from "@ionic/react";
import MenuHeaderComponent from "../components/core/MenuHeader.component";

// An unknown URL (e.g. an old bookmark) used to render an empty page (261024-ca12). Also a page the community does
// not have, with its own message (tariffs without billing, platform#229).
const NotFoundPage: FC<{message?: string}> = ({message = "Diese Seite gibt es nicht."}) => (
  <IonPage>
    <MenuHeaderComponent/>
    <IonContent fullscreen color="eeg">
      <div className="full-screen-center" style={{flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "16px"}}>
        <div>{message}</div>
        <IonButton routerLink="/page/participants">Zur Startseite</IonButton>
      </div>
    </IonContent>
  </IonPage>
)

export default NotFoundPage
