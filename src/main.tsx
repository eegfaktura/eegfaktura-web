import React from 'react';
import {createRoot} from 'react-dom/client';
import App from './App';
import {Provider} from "react-redux";
import {store} from "./store";
import {AppConfig, globalConfigUrl} from "./config";
import {UserManagerSettings, WebStorageStateStore} from "oidc-client-ts";
import {AuthService} from "./service/auth.service";
import {EegService} from "./service/eeg.service";
import {Api} from "./service";
import {EnergyService} from "./service/energy.service";
import {OidcAuthProvider} from "./store/hook/AuthProvider";
import {FileService} from "./service/file.service";
import {ParticipantService} from "./service/participant.service";
import {TariffService} from "./service/tariff.service";
import {I18nextProvider} from "react-i18next";
import i18n from "./util/I18n";

// import './util/I18n';

const initApiServices = async (config: AppConfig): Promise<AuthService> => {

  const userManagerConfig = {
    authority: `${config.authServerUrl.replace(/\/+$/, "")}/realms/${config.realm}/`,
    client_id: config.resource,
    redirect_uri: window.location.origin,
    automaticSilentRenew: false,
    // userStore: new WebStorageStateStore({
    //   store: sessionStorage
    // }),
    // revokeTokensOnSignout: true,
    post_logout_redirect_uri: window.location.origin,
    // includeIdTokenInSilentSignout: true,
  } as UserManagerSettings;

  const authService = new AuthService(userManagerConfig)

  Api.eegService = new EegService(authService)
  Api.energyService = new EnergyService(authService)
  Api.fileService = new FileService(authService)
  Api.participantService = new ParticipantService(authService)
  Api.tariffService = new TariffService(authService)

  return authService
}
const container = document.getElementById('root');
const root = createRoot(container!);

fetch(globalConfigUrl)
  .then(c => c.json())
  .then(c => {
    const appC = c["app"]
    return {
      authServerUrl: appC["auth-server-url"],
      realm: appC.realm,
      resource: appC.resource,
    } as AppConfig
  })
  .then(keycloakConfig => initApiServices(keycloakConfig))
  .then(userManager => {
    root.render(
      <React.StrictMode>
        <Provider store={store}>
          <I18nextProvider i18n={i18n}>
            <OidcAuthProvider authService={userManager}>
              <App/>
            </OidcAuthProvider>
          </I18nextProvider>
        </Provider>
      </React.StrictMode>
    )
  })
  .catch(e => {
    console.error("################ Err[Index]: ", e)
    root.render(
      <React.StrictMode>
        <div className="full-screen-center">
          <div style={{margin: "auto"}}>
            <p style={{fontSize: "24px"}}>Oops... Something went wrong. Press F5 or refresh your browser!</p>
            <p style={{fontSize: "14px"}}>{e.message}</p>
          </div>
        </div>
      </React.StrictMode>
    )
  })