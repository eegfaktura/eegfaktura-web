import EegBaseService, {API_API_SERVER} from "./base.service";
import {AuthService} from "./auth.service";
import {
  MailFile,
  MailFileKind,
  MailPreview,
  MailTemplate,
  MailTemplateDraft,
  MailTemplateListItem,
  MailTemplateSource,
  MailTemplateSummary,
  MailTestRecipient
} from "../models/mailtemplate.model";

const BILLING_API_SERVER = import.meta.env.VITE_BILLING_SERVER_URL;

// Error of the mail template API (section H): 400 {errors:[{field, message}]}, 409 {message, currentVersion}.
export class MailTemplateError extends Error {
  public constructor(message: string,
                     public status: number,
                     public fieldErrors: { field?: string, message: string }[] = [],
                     public currentVersion?: number) {
    super(message);
  }

  get isConflict() {
    return this.status === 409
  }
}

const genericMessage = (status: number) => {
  switch (status) {
    case 401:
    case 403:
      return "Keine Berechtigung"
    case 404:
      return "Nicht gefunden"
    case 409:
      return "Die Fassung wurde inzwischen geändert"
    case 413:
      return "Die Datei ist zu groß"
    default:
      return "Fehler beim Laden der Daten"
  }
}

export const toMailTemplateError = async (response: Response): Promise<MailTemplateError> => {
  const body: any = await response.json().catch(() => undefined)
  const fieldErrors: { field?: string, message: string }[] =
    body && Array.isArray(body.errors) ? body.errors.filter((e: any) => e && typeof e.message === "string") : []
  let message = fieldErrors.map(e => e.message).join("\n")
  if (!message && body && typeof body.message === "string" && response.status !== 409) {
    message = body.message
  }
  if (!message) {
    message = genericMessage(response.status)
  }
  const currentVersion = body && typeof body.currentVersion === "number" ? body.currentVersion : undefined
  return new MailTemplateError(message, response.status, fieldErrors, currentVersion)
}

const ok = async (response: Response): Promise<Response> => {
  if (!response.ok) {
    throw await toMailTemplateError(response)
  }
  return response
}

export const mailTemplateBase = (source: MailTemplateSource) =>
  source === "billing" ? `${BILLING_API_SERVER}/api/mailtemplates` : `${API_API_SERVER}/eeg/mailtemplates`

export interface MailTemplateList {
  items: MailTemplateListItem[]
  failed: MailTemplateSource[]
}

export class MailTemplateService extends EegBaseService {

  public constructor(authService: AuthService) {
    super(authService);
  }

  private async request(source: MailTemplateSource, tenant: string, path: string, init: RequestInit = {}) {
    const token = await this.lookupToken()
    return fetch(`${mailTemplateBase(source)}${path}`, {
      ...init,
      headers: {...this.getSecureHeaders(token, tenant), ...(init.headers || {})}
    }).then(ok)
  }

  private json(body: any): RequestInit {
    return {headers: {"Content-Type": "application/json", "Accept": "application/json"}, body: JSON.stringify(body)}
  }

  private keyPath(key: string) {
    return `/${encodeURIComponent(key)}`
  }

  // Lists the mails of both services as one list. A service that fails does not hide the
  // mails of the other one; its name is returned in `failed`.
  async fetchList(tenant: string): Promise<MailTemplateList> {
    const sources: MailTemplateSource[] = ["backend", "billing"]
    const results = await Promise.allSettled(sources.map(source =>
      this.request(source, tenant, "", {headers: {"Accept": "application/json"}})
        .then(r => r.json() as Promise<MailTemplateSummary[]>)
        .then(list => (list || []).map(t => ({...t, source}) as MailTemplateListItem))))
    const items: MailTemplateListItem[] = []
    const failed: MailTemplateSource[] = []
    results.forEach((r, i) => r.status === "fulfilled" ? items.push(...r.value) : failed.push(sources[i]))
    return {items, failed}
  }

  async fetchTemplate(source: MailTemplateSource, tenant: string, key: string): Promise<MailTemplate> {
    return this.request(source, tenant, this.keyPath(key), {headers: {"Accept": "application/json"}})
      .then(r => r.json())
  }

  async saveTemplate(source: MailTemplateSource, tenant: string, key: string, draft: MailTemplateDraft, version: number,
                     attachmentFileId: string | null): Promise<MailTemplate> {
    return this.request(source, tenant, this.keyPath(key), {
      method: "PUT", ...this.json({subject: draft.subject, bodyHtml: draft.bodyHtml, version, attachmentFileId})
    }).then(r => r.json())
  }

  async resetTemplate(source: MailTemplateSource, tenant: string, key: string): Promise<void> {
    await this.request(source, tenant, this.keyPath(key), {method: "DELETE"})
  }

  async uploadFile(source: MailTemplateSource, tenant: string, key: string, file: Blob, filename: string, kind: MailFileKind): Promise<MailFile> {
    const data = new FormData()
    data.append("file", file, filename)
    data.append("kind", kind)
    return this.request(source, tenant, `${this.keyPath(key)}/files`, {method: "POST", body: data})
      .then(r => r.json())
  }

  async fetchFile(source: MailTemplateSource, tenant: string, key: string, id: string): Promise<Blob> {
    return this.request(source, tenant, `${this.keyPath(key)}/files/${encodeURIComponent(id)}`)
      .then(r => r.blob())
  }

  async deleteFile(source: MailTemplateSource, tenant: string, key: string, id: string): Promise<void> {
    await this.request(source, tenant, `${this.keyPath(key)}/files/${encodeURIComponent(id)}`, {method: "DELETE"})
  }

  async preview(source: MailTemplateSource, tenant: string, key: string, draft: MailTemplateDraft): Promise<MailPreview> {
    return this.request(source, tenant, `${this.keyPath(key)}/preview`, {
      method: "POST", ...this.json({subject: draft.subject, bodyHtml: draft.bodyHtml, attachmentFileId: draft.attachmentFileId ?? null})
    }).then(r => r.json())
  }

  async sendTest(source: MailTemplateSource, tenant: string, key: string, recipient: MailTestRecipient, draft: MailTemplateDraft): Promise<string> {
    return this.request(source, tenant, `${this.keyPath(key)}/test`, {
      method: "POST", ...this.json({recipient, subject: draft.subject, bodyHtml: draft.bodyHtml, attachmentFileId: draft.attachmentFileId ?? null})
    }).then(r => r.json()).then(r => r.sentTo)
  }
}
