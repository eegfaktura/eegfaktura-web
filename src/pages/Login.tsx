import React, {FC} from "react";
import {
  IonButton,
  IonCheckbox,
  IonCol,
  IonContent,
  IonGrid,
  IonHeader,
  IonItem,
  IonLabel, IonNote,
  IonPage,
  IonRow, IonText, IonTitle, IonToolbar, useIonToast
} from "@ionic/react";
import {useKeycloak} from "../store/hook/AuthProvider";
import {useForm} from "react-hook-form";
import InputFormComponent from "../components/form/InputForm.component";


import "./Login.css"

const Login: FC = () => {
  interface LoginCredentials {
    email: string;
    password: string;
    stayLoggedIn: boolean;
  }

  const loginData: LoginCredentials = {email: "", password: "", stayLoggedIn: false};
  const {keycloak} = useKeycloak();
  const [showToast] = useIonToast();

  const {handleSubmit, control, register} = useForm({defaultValues: loginData});


  const onSubmit = async (data: any) => {
    const succesfullLogin = await keycloak.login(data.email, data.password)
      // .then(() => history.push("/"))

    if (!succesfullLogin) {
      showToast({
        message:
          "Ihre Login Daten sind nicht korrekt. Bitte versuchen Sie es erneut.",
        duration: 4500,
        color: "warning",
      });
    }
    
  }

  return (
    <IonPage className={"login-page"}>
      <IonHeader>
        <IonToolbar color="primary">
          <IonTitle>EEG Faktura</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent>
        <IonGrid className={"ion-no-padding"}>
          <IonRow>
            <IonCol>
              <div style={{background: "#79DFB4", height: "100%", width: "100%"}}>
                <div style={{padding: "51px 32px", background: "#79DFB4"}}>
                  <IonText style={{fontSize: "20px", color:"#2B6860"}}><p><strong>Login</strong></p></IonText>
                  <IonText style={{fontSize: "24px", color:"#2B6860"}}><p>Logge dich ein, um deine EEG zu verwalten.</p></IonText>
                </div>
              </div>

            </IonCol>
            <IonCol>
              <div style={{background: "#EAE7D9", overflow: "hidden"}}>
                <div style={{margin: "32px", background: "white"}}>
                  <form onSubmit={handleSubmit(onSubmit)}>
                    <InputFormComponent label={"E-Mail"} control={control} name={"email"}
                                        rules={{regex: /[\w\.-_]*@\w*\.\w{3}/}} type={"text"}/>
                    <InputFormComponent label={"Passwort"} control={control} name={"password"}
                                        rules={{regex: /[\w\.-_]*@\w*\.\w{3}/}} type={"password"}/>

                    <div style={{padding: "10px 15px"}}>
                      <IonGrid className="ion-no-padding">
                        <IonRow>
                          <IonCol size="6">
                            <IonItem lines="none" style={{"--padding-start": "0", "--inner-padding-end": "0"}}>
                              <IonCheckbox slot="start" {...register("stayLoggedIn")} labelPlacement="end"
                                           className="ion-no-margin ion-margin-end">{"Eingeloggt bleiben"}</IonCheckbox>
{/*                              <IonLabel
                                style={{fontSize: "14px", letterSpacing: "0.01px"}}>{"Eingeloggt bleiben"}</IonLabel>*/}
                            </IonItem>
                          </IonCol>
                          <IonCol size="6">
                            <IonItem button lines="none" style={{"--padding-start": "0", "--inner-padding-end": "0"}}>
                              <IonLabel slot="end"
                                        style={{fontSize: "14px", letterSpacing: "0.01px", marginInlineStart: "0"}}>Passwort
                                vergessen?</IonLabel>
                            </IonItem>
                          </IonCol>
                        </IonRow>
                        <IonButton fill="solid" expand="full" type="submit">LOGIN</IonButton>
                      </IonGrid>
                    </div>
                  </form>
                  <div style={{marginTop: "90px"}}>
                    <div className={"text-divider"}>Noch kein Mitglied?</div>
                  </div>
                  <IonGrid style={{paddingBottom: "36px"}}>
                    <IonRow>
                      <IonButton style={{width: "100%"}} color="medium" fill="solid" expand="full">REGISTRIEREN</IonButton>
                    </IonRow>
                  </IonGrid>
                </div>
              </div>


            </IonCol>
          </IonRow>
        </IonGrid>

      </IonContent>
    </IonPage>
  )
}

export default Login;