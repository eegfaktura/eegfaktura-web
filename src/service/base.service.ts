import {AuthService} from "./auth.service";
import {determineErrTxt, ErrorResponse, IErrorResponse} from "./error.text";
import {Mutex} from "async-mutex";

export const API_API_SERVER = import.meta.env.VITE_API_SERVER_URL;
export const FILESTORE_API_SERVER = import.meta.env.VITE_FILESTORE_SERVER_URL;
export const ENERGY_API_SERVER = import.meta.env.VITE_ENERGY_SERVER_URL;

export interface ErrorMessage {
  code: number
  message: string
}

export class HttpError extends Error {
  public constructor(public reasonObject: ErrorMessage, public statusText: string) {
    super(statusText);
  }
}

function createLoc<T>() {
  const queue: any[] = [];
  let active = false;
  return (fn: any) => {
    let deferredResolve: (value: (T | PromiseLike<T>)) => void;
    let deferredReject: (value: (T | PromiseLike<T>)) => void;
    const deferred = new Promise<T>((resolve, reject) => {
      deferredResolve = resolve;
      deferredReject = reject;
    });
    const exec = async () => {
      await fn().then(deferredResolve, deferredReject);
      if (queue.length > 0) {
        queue.shift()();
      } else {
        active = false;
      }
    };
    if (active) {
      queue.push(exec);
    } else {
      active = true;
      exec();
    }
    return deferred;
  };
};
const Lock = createLoc<string>()
const mutex = new Mutex();

class EegBaseService {

  public constructor(private authService: AuthService) {
  }

  protected async getUser() {
    return await this.authService.getToken().catch(e => {
      return this.authService.refresh().then(_ => this.authService.getToken())
    })
  }

  // lock = this.createLoc<string>()
  protected async lookupToken() {
    // return Lock(async () => {
    //   try {
    //     const token = await this.getUser()
    //     if (token) {
    //       return token
    //     }
    //   } catch {
    //     console.log("Not Authenticated")
    //   }
    //   throw new Error()
    // })

    return mutex.runExclusive(async () => {
      try {
        const token = await this.getUser()
        if (token) {
          return token
        }
      } catch {
        console.log("Not Authenticated")
      }
      return Promise.reject("new Error()")
    })
  }
  protected getSecureHeaders(token: string, tenant: string) {
    return {'Authorization': `Bearer ${token}`, "tenant": tenant}
  }
  protected getSecureHeadersX(token: string, tenant: string) {
    return {'Authorization': `Bearer ${token}`, "X-Tenant": tenant}
  }

  protected async handleErrors(response: Response):Promise<Response> {

    const isErrorResponse = (err: any): err is IErrorResponse => {
      return err.error !== undefined
    }

    if (!response.ok) {
      switch (response.status) {
        case 401:
          // await this.authService.logout()
          break
        default:
          const errorBody = await response.json().catch(e => response.text())
          if (isErrorResponse(errorBody)) {
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

  protected async handleFilestoreResponse(response: Response) {
    const data = await response.json()
    if (data && data.data && data.data.deleteFile && data.data.deleteFile.message) {
      throw new Error(data.data.deleteFile.message)
    }
    return data
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