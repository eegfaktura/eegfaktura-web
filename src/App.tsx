import {IonApp, IonRouterOutlet, IonSpinner, IonSplitPane, setupIonicReact} from '@ionic/react';
import {IonReactRouter} from '@ionic/react-router';
import {Redirect, Route, Switch} from 'react-router-dom';

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
import NotFoundPage from "./pages/NotFound.page";
import {hasAuthParams, useAuth} from "react-oidc-context";

/* Theme variables */
import './theme/variables.css';
import './theme/main.scss'
import {ErrorBoundary} from "react-error-boundary";

setupIonicReact();

const DashboardPage = React.lazy(() => import("./pages/Dashboard.page"))

// const PublicSection: React.FC = () => {
//   return (
//     <IonRouterOutlet id="public">
//       <Route path="/login" component={Login} exact={true}/>
//       <Route path="/" render={() => <Redirect to="/login"/>} exact={true}/>
//     </IonRouterOutlet>
//   )
// }

// Members and tariffs share one outlet view (MemberViewProvider, RateProvider). The view has its own paths: the
// outlet keeps a left view mounted (hidden), so a not-found route in here would render for every other page.
export const MEMBER_PATHS = ["/page/participants", "/page/rates"]
export const MemberRoutes: React.FC = () => (
  <MemberViewProvider>
    <RateProvider>
      <Switch>
        <Route path="/page/participants" exact={true} component={Participants} />
        <Route path="/page/rates" component={RatesPage} exact={true}/>
      </Switch>
    </RateProvider>
  </MemberViewProvider>
)

// Outside IonApp and the router: plain elements and a full page load (261024-ca12)
export const AppErrorFallback: React.FC = () => (
  <div className="full-screen-center" style={{flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "16px"}}>
    <div>Etwas ist schiefgelaufen.</div>
    <div style={{display: "flex", gap: "16px"}}>
      <button type="button" onClick={() => window.location.reload()}>Neu laden</button>
      <button type="button" onClick={() => window.location.assign("/")}>Zur Startseite</button>
    </div>
  </div>
)

export const PageRoutes: React.FC = () => (
    <IonRouterOutlet id="main">
      <Route path="/" exact={true} render={() => <Redirect to="/page/participants"/>}/>
      <Route path="/page/dashboard" exact={true}>
        <Suspense fallback = { <div style={{height: "100%", display: "flex"}}><IonSpinner
          style={{margin: "auto", height: "48px", width: "48px"}}/></div> }> <DashboardPage/></Suspense>
      </Route>
      <Route path="/page/eeg" component={EegPage} exact={true}/>
      <Route path={MEMBER_PATHS} exact={true} render={() => <MemberRoutes/>}/>
      <Route path="/page/addParticipant" exact={true} component={ParticipantRegisterPage} />
      <Route path="/page/profiles" exact={true} component={ProfilesPage} />
      <Route path="/page/processes" exact={true} component={ProcessesPage} />
      <Route path="/page/notifications" exact={true} component={NotificationPage} />
      {/* the outlet's only child without a path: every URL no route takes (261024-ca12) */}
      <Route component={NotFoundPage}/>
    </IonRouterOutlet>
)

const SecureSection: React.FC = () => {
  return (
    <IonReactRouter>
      <EegProvider>
        <ParticipantProvider>
          <IonSplitPane contentId="main">
            <Menu/>
            <PageRoutes/>
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
    <ErrorBoundary fallback={<AppErrorFallback/>}>
      <IonApp>
       <SecureSection></SecureSection>
      </IonApp>
    </ErrorBoundary>
  );
};

export default App;
