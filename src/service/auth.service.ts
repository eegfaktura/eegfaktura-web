import {User, UserManager, UserManagerSettings, UserProfile, WebStorageStateStore, Log} from "oidc-client-ts";
import {Mutex} from "async-mutex";

// import {keycloakConfig} from "../keycloak";

// const keycloakConfig = {
//   url: "https://login.ourproject.at/auth/realms/VFEEG/",
//   client_id: "at.ourproject.vfeeg.admin",
//   // redirect_uri: "https://admin.eegfaktura.at"
//   redirect_uri: "http://localhost:3000",
// }

// const oidcConfig = {
//   authority: keycloakConfig.url,
//   client_id: keycloakConfig.client_id,
//   redirect_uri: keycloakConfig.redirect_uri,
//   // client_secret: keycloakConfig.client_secret,
//   automaticSilentRenew: false,
//   revokeAccessTokenOnSignout: true,
//   userStore: new WebStorageStateStore({
//     store: sessionStorage
//   }),
// } as UserManagerSettings;


export class AuthService extends UserManager {

  onTokenReceived?: (props: Record<string, any>) => void
  tenant?: string
  token?: string
  tenants: string[]
  accessGroups: string[]
  roles: string[]
  claims: Record<string, any>
  private _logoutActive: boolean
  mutex = new Mutex();

  constructor(settings: UserManagerSettings) {
    super(settings);
    this.tenants = []
    this.accessGroups = []
    this.roles = []
    this.claims = {}

    Log.setLogger(console);
    // Log.setLevel(Log.DEBUG);
    Log.setLevel(Log.ERROR);

    this._logoutActive = false;
  }

  decodeToken(str: string) {
    str = str.split('.')[1];

    str = str.replace(/-/g, '+');
    str = str.replace(/_/g, '/');
    switch (str.length % 4) {
      case 0:
        break;
      case 2:
        str += '==';
        break;
      case 3:
        str += '=';
        break;
      default:
        throw 'Invalid token';
    }

    str = decodeURIComponent(escape(atob(str)));

    return JSON.parse(str);
  }

  public parseToken(token: string) {
    if (token) {
      const tokenParsed = this.decodeToken(token);

      // this.realmAccess = this.tokenParsed.realm_access;
      // this.resourceAccess = this.tokenParsed.resource_access;
      this.tenants = tokenParsed.tenant;
      this.accessGroups = tokenParsed.access_groups;
      this.roles = tokenParsed.realm_access ? tokenParsed.realm_access.roles : [];
      this.claims = {"name": tokenParsed.name, "nick": tokenParsed.preferred_username, "email": tokenParsed.email}

      // this.onTokenReceived && this.onTokenReceived({tenants: this.tenants, claims: this.claims, accessGroups: this.accessGroups})
    }
    return token
  }

  public async lookupToken(){
    return this.mutex.runExclusive(async () => {
      try {
        const token = await this.getToken().catch(e => {
          this.refresh()
        })
        if (token) {
          return token
        }
      } catch {
        console.log("Not Authenticated")
      }
      throw new Error()
    })
  }

  public async getToken() {
    const user = await this.getUser()
    if (user && user.expires_in) {
      const expiresIn = user.expires_in
      if (expiresIn < 5) {
        console.log("ExpiresIn", expiresIn, "refresh")
        return this.signinSilent().then(u => {
          if (u == null) {
            return Promise.reject(new Error("Not Authenticated"))
          }
          return this.parseToken(u?.access_token)})
      }
      return this.parseToken(user.access_token)
    }
    return ""
    // throw new Error("Not authorized")
  }

  public async login() {
    return this.signinRedirect()
  }

  public async refresh(): Promise<string | void> {
    try {
      return await this.signinSilent().then(user => {
        if (user) {
          return this.parseToken(user.access_token)
        }
        throw new Error("Trouble while authenticating you! Try again in few minutes")
      }).catch(() => {
        this.signinRedirect().then(() => this.getUser()).then(u => {
          if(u) {
            return this.parseToken(u?.access_token)
          }
          return Promise.reject(Error("Trouble while authenticating you! Try again in few minutes"))
        })
      })
    } catch {
      await this.logout()
    }
  }

  public async logout() {
    this._logoutActive = true
    await this.signoutRedirect().catch((e) => this._logoutActive = false)
    // await this.removeUser().then(() => this.signoutRedirect()).then(() => console.log("Signout success"))
    // const endSessionEndpoint = await this.metadataService.getEndSessionEndpoint()
    // console.log("Logout URL:", await this.metadataService.getEndSessionEndpoint())
    // const token = await this.getToken()
    // const args = {id_token_hint: token}
    // const signoutRequest = await this._client.createSignoutRequest(args)
    // // await fetch(signoutRequest.url, {method: 'POST'}).then(() => this.removeUser())
    // // await this.removeUser()
    // window.location.href = `${endSessionEndpoint}?post_logout_redirect_uri=${window.location.origin}&client_id=at.ourproject.vfeeg.app`
  }

  public async redirectToUserAccount () {
    const url = await this.metadataService.getAuthorizationEndpoint()
    window.location.href = `${url}?response_type=code&client_id=${this.settings.client_id}&redirect_uri=${window.location.origin}&kc_action=UPDATE_PASSWORD`
  }

  get logoutActive () {
    return this._logoutActive
  }
}

// export const authService = new AuthService(oidcConfig)