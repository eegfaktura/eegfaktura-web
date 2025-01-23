import React, {FC, useContext, useEffect, useState} from "react";
import {
  IonCard,
  IonCol,
  IonContent,
  IonGrid,
  IonIcon, IonItem,
  IonLabel,
  IonList,
  IonPage,
  IonRow
} from "@ionic/react";
import cn from "classnames";
import {syncCircle} from "ionicons/icons";
import {EegContext} from "../store/hook/Eeg.provider";
import CorePageTemplate from "../components/core/CorePage.template";
import {useTenants, useUser} from "../store/hook/AuthProvider";


interface ProfileEntry {
  name: string
  type: string
}

const ProfilesPage: FC = () => {

  const processes: ProfileEntry[] = [
    {
      name: "Zählpunktdaten nachfordern",
      type: "CR_REQ_PT"
    },
    {
      name: "Zählpunkt aktivieren",
      type: "EC_REQ_ONL"
    },
    {
      name: "Prozess History",
      type: "HISTORY"
    },
  ]

  const [selectedProcess, setSelectedProcess] = useState<ProfileEntry | undefined>()
  const [profileState, setProfileState] = useState()

  const {eeg} = useContext(EegContext);
  // const {tenants, roles, claims} = useContext(OidcAuthContext)
  const tenants = useTenants()
  const user = useUser()

  useEffect(() => {
    setSelectedProcess(processes[0])
  }, [])

  const onSelect = (processId: number) => {
    setSelectedProcess(processes[processId])
  }

  const profileDetails = () => {
    if (tenants.length > 0) {
      return (
        <div className={"details-body"} style={{height: "100%", display: "flex", flexDirection: "column"}}>
          <div className={"details-header"}>
            <div><h4>{user && user.claims?.name}</h4></div>
          </div>
          <div style={{display: "flex", flexDirection: "column", flexGrow: "1"}}>
            <CorePageTemplate>
              <IonItem>
                <div>{tenants.join(", ")}</div>
              </IonItem>
            </CorePageTemplate>
          </div>
        </div>
      )
    } else {
      return <></>
    }
  }

  return (
    <IonPage>
      <IonContent fullscreen color="eeg">
        <div style={{display: "flex", flexDirection: "row", height: "100vh"}}>
          <div className={"ratePane"}>
            <div className={"pane-content"}>
              <IonList color="eeg">
                {processes.map((p, i) =>
                  <div key={p.type} className={cn("eeg-cards", {"selected": processes[i].type === selectedProcess?.type})}>
                    <IonCard color="eeg" onClick={() => onSelect(i)}>
                      <IonGrid>
                        <IonRow>
                          <IonCol size="auto">
                            <div style={{paddingTop: "5px", display: "flex", fontSize: "20px"}}>
                              <IonIcon icon={syncCircle} size="large"></IonIcon>
                            </div>
                          </IonCol>
                          <IonCol>
                            <IonLabel>
                              <h2><b>{p.name}</b></h2>
                            </IonLabel>
                          </IonCol>
                        </IonRow>
                      </IonGrid>
                    </IonCard>
                  </div>
                )}
              </IonList>
            </div>
          </div>
          <div style={{flexGrow: "1", background: "#EAE7D9"}}>
            {profileDetails()}
          </div>
        </div>
      </IonContent>
    </IonPage>

  )
}

export default ProfilesPage