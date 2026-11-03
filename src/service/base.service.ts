import {AuthService} from "./auth.service";
import {determineErrTxt, ErrorResponse, IErrorResponse} from "./error.text";

export const API_API_SERVER = import.meta.env.VITE_API_SERVER_URL;
export const FILESTORE_API_SERVER = import.meta.env.VITE_FILESTORE_SERVER_URL;
export const ENERGY_API_SERVER = import.meta.env.VITE_ENERGY_SERVER_URL;

export const SESSION_EXPIRED = "Deine Sitzung ist abgelaufen. Bitte melde Dich neu an."
export const NO_PERMISSION = "Dafür fehlt Dir die Berechtigung."
// Several calls can fail with 401 at once, and a 401 that is not about the session (a misconfigured service)
// would come back right after the login: at most one redirect per minute, also across the reload.
const LOGIN_REDIRECT_KEY = "eegfaktura.loginRedirectAt"
const LOGIN_REDIRECT_PAUSE_MS = 60_000
export const mayRedirectToLogin = (now: number = Date.now()): boolean => {
  try {
    const last = Number(sessionStorage.getItem(LOGIN_REDIRECT_KEY) || 0)
    if (now - last < LOGIN_REDIRECT_PAUSE_MS) return false
    sessionStorage.setItem(LOGIN_REDIRECT_KEY, String(now))
    return true
  } catch {
    return false  // no storage: show the error, do not risk a loop
  }
}
// The session check of a 401 (also used by the RTK Query participant API). The backend also answers 401 for a
// missing access group: only an expired or missing session goes to the login, a valid token gets "no permission"
// (no redirect loop).
export const handleUnauthorized = async (authService: AuthService): Promise<never> => {
  const user = await authService.getUser().catch(() => null)
  if (user && !user.expired) {
    throw new Error(NO_PERMISSION)
  }
  if (mayRedirectToLogin()) {
    authService.login().catch(() => {})
  }
  throw new Error(SESSION_EXPIRED)
}

class EegBaseService {

  public constructor(private authService: AuthService) {
  }

  protected async lookupToken() {
    return this.authService.lookupToken()
  }
  protected getSecureHeaders(token: string, tenant: string) {
    return {'Authorization': `Bearer ${token}`, "tenant": tenant}
  }
  protected getSecureHeadersX(token: string, tenant: string) {
    return {'Authorization': `Bearer ${token}`, "X-Tenant": tenant}
  }

  // arrow property: most callers pass it unbound (`.then(this.handleErrors)`), and the 401 branch needs `this`
  protected handleErrors = async (response: Response): Promise<Response> => {

    const isErrorResponse = (err: any): err is IErrorResponse => {
      return err.error !== undefined
    }

    if (!response.ok) {
      switch (response.status) {
        case 401:
          // used to pass as success
          return handleUnauthorized(this.authService)
        default:
          // read the body once: a second read after a failed json() throws and hides the real error
          const errorText = await response.text()
          let errorBody: unknown = errorText
          try { errorBody = JSON.parse(errorText) } catch { /* not JSON, keep the text */ }
          if (isErrorResponse(errorBody) && typeof errorBody.error === "string") {
            // energystore ({"error": "<text>"}) and Spring ({"error": "<reason phrase>", ...}): the text itself,
            // not the code lookup, which made "E_undefined_undefined" of it
            throw new Error(errorBody.error || response.statusText || "Error while fetching data!");
          } else if (isErrorResponse(errorBody)) {
            throw new Error(determineErrTxt(new ErrorResponse(errorBody.error)));
          } else {
            if (!response || !response.statusText) {
              throw new Error("Error while fetching data!")
            }
            throw new Error(response.statusText)
          }
      }
    }
    return response;
  }

  protected async handleGQLResponse(response: Response) {
    return response.json().then(d => {
      if (d.errors)
        throw Error(d.errors[0].message)
      else
        return d.data
    })
  }

  protected async handleDownload (response : Response, defaultFilename : string, tenant?: string) : Promise<boolean> {
    return response.blob().then(file => {
      //Build a URL from the file
      const fileURL = URL.createObjectURL(file);

      let filename = response.headers.get('Filename')
      if (!filename) {
        const disposition = response.headers.get('Content-Disposition');
        const dispositionParts = disposition ? disposition.split(';') : null;
        filename = dispositionParts ? dispositionParts[1].split('=')[1]: null;
        filename = filename ? filename.replaceAll('"', '') : null;
      }
      if (!filename)
        filename = defaultFilename

      if(tenant) {
        filename = `${tenant}_${filename}`
      }

      const link = document.createElement('a');
      link.href = fileURL
      link.setAttribute('download', filename)

      // 3. Append to html page
      document.body.appendChild(link);
      // 4. Force download
      link.click();
      // 5. Clean up and remove the link
      link.parentNode?.removeChild(link);

      return true;
    });
  }
}

export default EegBaseService