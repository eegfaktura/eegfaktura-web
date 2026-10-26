// Editable member mail texts (konzept-mail-texte-editierbar.md, section H).
// backend serves consent-request, zp-active, zp-inactive; billing serves billing-document.

export type MailTemplateSource = "backend" | "billing"

export interface MailTemplateSummary {
  key: string
  name: string
  description: string
  customized: boolean
  updatedAt?: string | null
  updatedBy?: string | null
  defaultChanged: boolean
}

export interface MailTemplateListItem extends MailTemplateSummary {
  source: MailTemplateSource
}

export interface MailPlaceholder {
  key: string
  label: string
  block: boolean
}

export type MailFileKind = "image" | "attachment"

export interface MailFile {
  id: string
  kind: MailFileKind
  filename: string
  mimeType: string
  size: number
  // false: draft upload, not sent until a PUT makes it part of the version
  committed?: boolean
}

export interface MailTemplateLimits {
  maxImages: number
  maxImageBytes: number
  maxAttachments: number
  maxAttachmentBytes: number
  maxTotalBytes: number
}

export interface MailTemplate {
  key: string
  name: string
  description: string
  subject: string
  bodyHtml: string
  customized: boolean
  version: number
  defaultVersion: number
  defaultChanged: boolean
  defaultSubject: string
  defaultBodyHtml: string
  updatedAt?: string | null
  updatedBy?: string | null
  placeholders: MailPlaceholder[]
  files: MailFile[]
  attachmentFileId?: string | null
  limits: MailTemplateLimits
}

export interface MailTemplateDraft {
  subject: string
  bodyHtml: string
  // PDF chosen in the editor; preview and test mail use it (null/absent = no PDF)
  attachmentFileId?: string | null
}

export interface MailPreview {
  subject: string
  html: string
}

export type MailTestRecipient = "me" | "eeg"
