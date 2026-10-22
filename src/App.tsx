import {IonApp, IonRouterOutlet, IonSplitPane, setupIonicReact} from '@ionic/react';
import {IonReactRouter} from '@ionic/react-router';
import {Redirect, Route} from 'react-router-dom';

import Menu from './components/Menu';

/* Core CSS required for Ionic components to work properly */
import '@ionic/react/css/core.css';

/* Basic CSS for apps built with Ionic */
import '@ionic/react/css/normalize.css';
import '@ionic/react/css/structure.css';
import '@ionic/react/css/typography.css';

/* Optional CSS utils that can be commented out */
import '@ionic/react/css/padding.css';
import '@ionic/react/css/float-elements.css';
import '@ionic/react/css/text-alignment.css';
import '@ionic/react/css/text-transformation.css';
import '@ionic/react/css/flex-utils.css';
import '@ionic/react/css/display.css';


import React, {Suspense} from "react";
import Participants from "./pages/Participants";
import {EegProvider} from "./store/hook/Eeg.provider";
import ParticipantProvider from "./store/hook/ParticipantProvider";
import MemberViewProvider from "./store/hook/MemberViewProvider";
import RatesPage from "./pages/Rates.page";
import EegPage from "./pages/Eeg.page";
import ParticipantRegisterPage from "./pages/ParticipantRegister.page";
import RateProvider from "./store/hook/Rate.provider";
import ProfilesPage from "./pages/Profiles.page";
import ProcessesPage from "./pages/Processes.page";
import NotificationPage from "./pages/Notification.page";
import {hasAuthParams, useAuth} from "react-oidc-context";

/* Theme variables */
import './theme/variables.css';
import './theme/main.scss'
import {ErrorBoundary} from "react-error-boundary";

setupIonicReact();

const DashbaordPage = React.lazy(() => import("./pages/Dashbaord.page"))
const MailTemplatesPage = React.lazy(() => import("./pages/MailTemplates.page"))

// const PublicSection: React.FC = () => {
//   return (
//     <IonRouterOutlet id="public">
//       <Route path="/login" component={Login} exact={true}/>
//       <Route path="/" render={() => <Redirect to="/login"/>} exact={true}/>
//     </IonRouterOutlet>
//   )
// }

const SecureSection: React.FC = () => {
  return (
    <IonReactRouter>
      <EegProvider>
        <ParticipantProvider>
          <IonSplitPane contentId="main">
            <Menu/>
            <IonRouterOutlet id="main">
              <Route path="/" exact={true} render={() => <Redirect to="/page/participants"/>}/>
              <Route path="/page/dashboard" exact={true}>
                <Suspense fallback = { <div> Dashboard loading ... </div> }> <DashbaordPage/></Suspense>
              </Route>
              <Route path="/page/eeg" component={EegPage} exact={true}/>
              <Route path="/page/mailtemplates" exact={true}>
                <Suspense fallback={<div>Loading ...</div>}><MailTemplatesPage/></Suspense>
              </Route>
              <MemberViewProvider>
                <Route path="/page/participants" exact={true} component={Participants} />
                <RateProvider>
                  <Route path="/page/rates" component={RatesPage} exact={true}/>
                </RateProvider>
              </MemberViewProvider>
              <Route path="/page/addParticipant" exact={true} component={ParticipantRegisterPage} />
              <Route path="/page/profiles" exact={true} component={ProfilesPage} />
              <Route path="/page/processes" exact={true} component={ProcessesPage} />
              <Route path="/page/notifications" exact={true} component={NotificationPage} />
            </IonRouterOutlet>
          </IonSplitPane>
        </ParticipantProvider>
      </EegProvider>
    </IonReactRouter>
  )
}

const App: React.FC = () => {
  const auth = useAuth()
  React.useEffect(() => {
    const authP = hasAuthParams()

    if (!hasAuthParams() && !auth.isAuthenticated && !auth.activeNavigator && !auth.isLoading) {
      auth.signinRedirect();
    }
  }, [auth.isAuthenticated, auth.activeNavigator, auth.isLoading, auth.signinRedirect]);

  return (
    <ErrorBoundary fallback={<div>Something went wrong</div>}>
      <IonApp>
       <SecureSection></SecureSection>
      </IonApp>
    </ErrorBoundary>
  );
};

export default App;
