import {User, UserManager, WebStorageStateStore} from "oidc-client-ts";

import { AuthProviderProps } from "react-oidc-context";
// import {authService} from "../../../services/auth.service";

const isBrowser = typeof window !== "undefined";

export const rootUrl = isBrowser
  ? `${window.location.protocol}//${window.location.host}${window.location.host === 'localhost' ? ':' + window.location.port : ''}`
  : "";

export const oidcConfig: AuthProviderProps = {
  post_logout_redirect_uri: rootUrl,
  /**
   * removes code and state from url after signin
   * see https://github.com/authts/react-oidc-context/blob/f175dcba6ab09871b027d6a2f2224a17712b67c5/src/AuthProvider.tsx#L20-L30
   */
  onSigninCallback: (_user: User | void): void => {
    // Remove OIDC params from URL, but don't remove other params that might be present
    const searchParams = new URLSearchParams(window.location.search);
    searchParams.delete("state");
    searchParams.delete("code");
    searchParams.delete("session_state");
    const newUrl = searchParams.toString().length
      ? `${window.location.pathname}?${searchParams.toString()}`
      : window.location.pathname;
    window.history.replaceState({}, document.title, newUrl);
  },
  /**
   * we need to store the user in local storage, to access the token. The alternative would
   * be to read it from the user object returned from useAuth, but as only the enterprise
   * edition uses oidc, we would have to conditionally call the hook, which is not possible.
   */
  userStore: new WebStorageStateStore({
    store: sessionStorage
  }),
};
