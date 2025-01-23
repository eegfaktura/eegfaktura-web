import React, {createContext, PureComponent, useCallback, useContext, useMemo} from "react";
import {OidcProvider} from "./OidcProvider";
import {UserManager, UserProfile} from "oidc-client-ts";
import {AuthService} from "../../service/auth.service";
import {IonSpinner} from "@ionic/react";

interface OidcAuthState {
  decodeToken(str: string): any
  parseToken(token: string): string
  getToken(): Promise<string>
  refresh(): Promise<string | void>
  login(): Promise<void>
  logout(): Promise<void>
  redirectToUserAccount(): Promise<void>
  _logoutActive: boolean
  onTokenReceived?: (props: Record<string, any>) => void
  tenant?: string
  token?: string
  tenants: string[]
  accessGroups: string[]
  roles: string[]
  claims: Record<string, any>
  logoutActive: boolean
}

export type OidcAuthContextInterface<T extends Omit<OidcAuthState, "logoutActive" | "_logoutActive"> & UserManager> = {
  authService?: T;
  // tenant?: string
  // token?: string
  // tenants: string[];
  // roles: string[];
  // claims: Record<string, any>
}

export function createOidcAuthContext<T extends Omit<OidcAuthState, "logoutActive" | "_logoutActive"> & UserManager>(
  initialContext?: Partial<OidcAuthContextInterface<T>>
): React.Context<OidcAuthContextInterface<T>> {
  return createContext({
    // tenants: [],
    // roles: [],
    // claims: {},
    // _logoutActive: false,
    // _loggedIn: false,
    // loggedIn: false,
    // loginTried: false,
    ...initialContext,
  })
}

// type OidcAuthProviderType = Pick<OidcAuthState, "tenant" | "token" | "tenants" | "claims">
type OidcAuthProviderType = Omit<OidcAuthState, "_logoutActive">

export type OidcAuthProviderProps<T extends OidcAuthProviderType & UserManager> = {
  authService?: T
  children: React.ReactNode
}

type OidcAuthProviderState<T extends OidcAuthProviderType & UserManager> = {
  // tenants: string[]
  // roles: string[]
  // claims: Record<string, any>
  authService: T | undefined
}

export function createOidcAuthProvider<T extends OidcAuthProviderType & UserManager>(OidcAuthContext: React.Context<OidcAuthContextInterface<T>>) {

  const initialState: OidcAuthProviderState<T> = {
    // tenants: [],
    // roles: [],
    // claims: {},
    authService: undefined
  }

  return class OidcAuthProvider extends PureComponent<OidcAuthProviderProps<T>, OidcAuthProviderState<T>> {

    state = {
      ...initialState,
      authService: this.props.authService,
    }

    // componentDidMount() {
    //   const { authService } = this.props
    //   // if (authService) {
    //   //   authService.onTokenReceived = (props) => {this.updateState(props)}
    //   // }
    // }
    //
    // renewState(props: Record<string, any>) {
    //   const changeState = useCallback((p: Record<string, any>) => {
    //     console.log("############### AUTH-SERVICE updateState: ", props)
    //     this.setState({
    //       ...this.state,
    //       tenants: props.tenants,
    //       roles: props.accessGroups,
    //       claims: props.claims,
    //     });
    //   }, [props])
    //   changeState(props)
    // }

    async componentDidMount() {
      const { authService } = this.props
      if (authService) {
        await authService.getToken()
      }
      return Promise.resolve()
    }

    render() {
      const { children } = this.props
      // const { tenants, roles, claims, authService } = this.state
      const { authService } = this.state

      if (!authService) {
        return (
          <div className="full-screen-center">
            <IonSpinner style={{margin: "auto", height: "48px", width: "48px", color:"red"}}/>
          </div>)
      }

      return (
        <OidcAuthContext.Provider value={{/*tenants, roles, claims,*/ authService}}>
          <OidcProvider _userManager={authService}>
            {children}
          </OidcProvider>
        </OidcAuthContext.Provider>
      )
    }
  }
}

export const OidcAuthContext = createOidcAuthContext<AuthService>();

export const OidcAuthProvider = createOidcAuthProvider(OidcAuthContext);

// export const useTenants = () => {
//   const {tenants} = useContext(OidcAuthContext);
//   return tenants;
// }

export const useTenants = () => {
  const {authService} = useContext(OidcAuthContext);
  return authService?.tenants || [];
}

// export const useRoles = () => {
//   const {roles} = useContext(OidcAuthContext);
//   return roles;
// }

export const useGroups = () : string[] | undefined => {
  const {authService} = useContext(OidcAuthContext);
  return authService?.accessGroups;
}

export const useRoles1 = () => {
  const {authService} = useContext(OidcAuthContext);
  return authService?.roles;
}

export const useUser = () => {
  const {authService} = useContext(OidcAuthContext)
  return authService
}
