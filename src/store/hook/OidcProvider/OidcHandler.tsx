import React, {FC, PropsWithChildren, useEffect, useState} from "react";
import {hasAuthParams, useAuth} from "react-oidc-context";
import '../../../theme/main.scss'
import {AuthService} from "../../../service/auth.service";
import {useUser} from "../AuthProvider";
import {IonSpinner} from "@ionic/react";

export const OidcHandler: FC<PropsWithChildren & {hasTried: () => boolean}> = ({ children, hasTried}) => {
  const auth = useAuth();
  const user = useUser()
  const [hasTriedSignin, setHasTriedSignin] = useState(false);

  useEffect(() => {
    (async () => {
      if (
        !hasAuthParams() &&
        !auth.isAuthenticated &&
        !auth.activeNavigator &&
        !auth.isLoading &&
        !hasTriedSignin &&
        !hasTried()
      ) {
        await auth.signinRedirect();
        setHasTriedSignin(true);
      }
    })()
  }, [auth, hasTriedSignin]);

  if (auth.isLoading || !auth.isAuthenticated) {
    return (
      <div className="full-screen-center">
        <IonSpinner style={{margin: "auto", height: "48px", width: "48px"}}/>
      </div>
    );
  }

  if (auth.error) {
    // user && user.logout()
    return (
      <div className="full-screen-center">
        <div style={{margin: "auto"}}>
          <div style={{fontSize:"24px"}}>Authentication Error</div>
          <div>{auth.error.name}: {auth.error.message}</div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};