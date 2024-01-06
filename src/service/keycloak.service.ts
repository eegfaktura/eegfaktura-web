export interface KeycloakConfig {
  authServerUrl: string
  realm: string
  clientId: string
  clientSecret: string
}

type jwtToken = {
  access_token: string;
  token_type: string;
  id_token: string;
  refresh_token: string;
}

type rolesType = {
  roles: string[]
}

type accountType = {
  account: rolesType;
}

export class KeycloakService {

  config: KeycloakConfig;
  token?: string;
  idToken?: string;
  refreshToken?: string;

  tokenParsed?: any;
  timeSkew?: number;
  realmAccess?: rolesType;
  resourceAccess?: accountType;
  tenants: string[]
  accessGroups: string[];
  claims: Record<string, any>

  onAuthSuccess?: () => void;

  public constructor(config: KeycloakConfig) {
    this.config = config;
    this.tenants = [];
    this.accessGroups = [];
    this.claims = {}
  }

  private getLocalStorage(key: string): string | undefined {
    const value = localStorage.getItem(key);
    return (value === "undefined" || value === null) ? undefined : value;
  }

  async init(config: KeycloakConfig): Promise<boolean> {
    return new Promise<boolean>((resolve) => {
      this.token = this.getLocalStorage("token")!;
      this.refreshToken = this.getLocalStorage("refresh_token")!;
      this.idToken = this.getLocalStorage("id_token")!;

      this.setToken(this.token);
      // console.log("INIT Keycloak Service (RefreshToken): ", this.refreshToken);

      if (this.token) {
        this.tokenParsed = this.decodeToken(this.token);
      }

      if (this.refreshToken) {
        return this.updateToken(-1).then(() => {
          return true;
        })
      }
      resolve(true);
    });
  }

  private getRealmUrl() {
    return this.config.authServerUrl + 'realms/' + encodeURIComponent(this.config.realm)
  }

  private createLoginUrl(): string {
    var baseUrl = this.getRealmUrl() + '/protocol/openid-connect/token';
    return baseUrl;
  }

  private decodeToken(str: string) {
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

  private isTokenExpired(minValidity: number) {
    if (!this.tokenParsed || !this.refreshToken) {
      throw 'Not authenticated';
    }

    if (this.timeSkew == null) {
      // console.log('[KEYCLOAK] Unable to determine if token is expired as timeskew is not set');
      return true;
    }

    var expiresIn = this.tokenParsed['exp'] - Math.ceil(new Date().getTime() / 1000) + this.timeSkew;
    if (minValidity) {
      if (isNaN(minValidity)) {
        throw 'Invalid minValidity';
      }
      expiresIn -= minValidity;
    }
    return expiresIn < 0;
  }

  private clear() {
    localStorage.removeItem("token");
    localStorage.removeItem("refresh_token");
    localStorage.removeItem("id_token");

    this.token = undefined;
    this.refreshToken = undefined;
    this.idToken = undefined;
    this.tokenParsed = undefined;

    this.timeSkew = undefined;
    this.tenants = [];
    this.claims = {};

    this.onAuthSuccess && this.onAuthSuccess();
  }

  private setToken(token: string) {
    this.token = (token === "undefined" ? undefined : token);
    if (this.token) {
      this.tokenParsed = this.decodeToken(this.token);

      this.realmAccess = this.tokenParsed.realm_access;
      this.resourceAccess = this.tokenParsed.resource_access;
      this.tenants = this.tokenParsed.tenant;
      this.accessGroups = this.tokenParsed.access_groups;
      this.claims = {"name": this.tokenParsed.name, "nick": this.tokenParsed.preferred_username, "email": this.tokenParsed.email}

      this.onAuthSuccess && this.onAuthSuccess();
    }
  }

  async login(username: string, password: string): Promise<boolean> {

    const url = this.createLoginUrl();
    let data = {
      client_id: this.config.clientId,
      client_secret: this.config.clientSecret,
      scope: "openid",
      grant_type: "password",
      username: username,
      password: password
    };

    const timeLocal = new Date().getTime();
    return new Promise<boolean>(async (resolve, reject) => {
      try {
        const response = await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/x-www-form-urlencoded" },
          body: new URLSearchParams(data),
        });
        if (response.status === 200) {
          const jwt = await response.json();
          this.saveToken(jwt, timeLocal);
          // Optionally, perform additional actions here if needed.
          // localStorage.setItem("user", username);
          // localStorage.setItem("passwd", password);
          resolve(true); // Resolve the promise as true for a successful login.
        } else {
          resolve(false); // Reject the promise for a failed login.
        }
      } catch (err) {
        resolve(false); // Handle unexpected errors and reject the promise.
      }
    })

  }

  saveToken(jwt: jwtToken, timeLocal: number) {
    localStorage.setItem("token", jwt.access_token);
    localStorage.setItem("refresh_token", jwt.refresh_token);
    localStorage.setItem("id_token", jwt.id_token);

    this.refreshToken = jwt.refresh_token;
    this.idToken = jwt.id_token;
    this.setToken(jwt.access_token);

    this.timeSkew = Math.floor(timeLocal / 1000) - this.tokenParsed.iat;

    const currentTenant = this.getLocalStorage("tenant")
    if (!currentTenant) {
      if (this.tenants && this.tenants.length > 0) {
        localStorage.setItem("tenant", this.tenants[0].toUpperCase())
      }
    }
  }

  async getToken(): Promise<string> {
    return this.updateToken(5);
  }

  async updateToken(minValidity: number): Promise<string> {

    if (!this.refreshToken) {
      this.clear();
      return new Promise<string>((reject) => reject("Missing refresh token"));
    }

    if (minValidity >= 0) {
      if (!this.isTokenExpired(minValidity)) {
        return new Promise<string>((resolve) => resolve(this.token!));
      }
    }

    const url = this.createLoginUrl();
    let data = {
      client_id: this.config.clientId,
      client_secret: this.config.clientSecret,
      scope: "openid",
      grant_type: "refresh_token",
      refresh_token: this.refreshToken!,
    };

    // const loginStoredUser = async (): Promise<void> => {
    //   const username: string | undefined = this.getLocalStorage("user");
    //   const password: string | undefined = this.getLocalStorage("passwd");
    //
    //   if (username && password) {
    //     await this.login(username, password)
    //   }
    // }

    const timeLocal = new Date().getTime();
    return new Promise<string>((resolve, reject) => {
      fetch(url, {
        method: 'POST',
        headers: {'Content-Type': "application/x-www-form-urlencoded"},
        body: new URLSearchParams(data),
      }).then((response: Response) => {
          if (response.status === 200) {
            return response.json()
          }
          throw new Error(response.statusText)
        })
        .then((jwt: jwtToken) => {
          this.saveToken(jwt, timeLocal)
        })
        .catch(() => {
          this.logout()
        })
        .then(() => resolve(this.token!))
    })
  }

  logout() {
    this.clear()
  }

  hasRealmRole(role: string): boolean {
    const access = this.realmAccess!;
    return !!access && access.roles.indexOf(role) >= 0;
  }

  hasResourceRole(role: string): boolean {
    if (!this.resourceAccess) {
      return false;
    }

    const access = this.resourceAccess.account;
    return !!access && access.roles.indexOf(role) >= 0;
  }
}