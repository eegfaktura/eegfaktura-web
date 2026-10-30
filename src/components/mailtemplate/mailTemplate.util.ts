import {formatNumber} from "../../util/Number.util";
import {formatDateTime} from "../../util/DateFormat.util";

export const formatBytes = (bytes: number) =>
  bytes >= 1024 * 1024
    ? `${formatNumber(bytes / (1024 * 1024), 0, 1)} MB`
    : `${formatNumber(Math.round(bytes / 1024))} KB`

// "… (am {date} von {user})" of a saved own version, for the list ("status_customized") and the status box ("status_own")
export const savedText = (t: (key: string, options?: Record<string, unknown>) => string,
                          s: { updatedAt?: string | null, updatedBy?: string | null },
                          key: "status_customized" | "status_own") =>
  t(`mailtemplates.${key}${s.updatedBy ? "" : "_nouser"}`,
    {date: s.updatedAt ? formatDateTime(s.updatedAt) : "", user: s.updatedBy})

export const MAX_SUBJECT_CHARS = 200

// A new link would exceed the service's link limit (the service checks again on save).
export const linkLimitReached = (html: string, maxLinks?: number) =>
  maxLinks != null && new DOMParser().parseFromString(html, "text/html").querySelectorAll("a[href]").length >= maxLinks

export const insertAtCursor = (text: string, insert: string, start?: number | null, end?: number | null) => {
  const from = start ?? text.length
  const to = end ?? from
  return {value: text.substring(0, from) + insert + text.substring(to), cursor: from + insert.length}
}

// Blob URLs for the images in the editor. A failed fetch is not cached, so the next display tries again.
export const createBlobUrlCache = (fetchBlob: (id: string) => Promise<Blob>) => {
  const urls = new Map<string, Promise<string>>()
  return {
    resolve: (id: string): Promise<string> => {
      let url = urls.get(id)
      if (!url) {
        url = fetchBlob(id).then(b => URL.createObjectURL(b))
        urls.set(id, url)
        const pending = url
        url.catch(() => {
          if (urls.get(id) === pending) urls.delete(id)
        })
      }
      return url
    },
    put: (id: string, blob: Blob) => {
      urls.get(id)?.then(u => URL.revokeObjectURL(u)).catch(() => undefined)
      urls.set(id, Promise.resolve(URL.createObjectURL(blob)))
    },
    clear: () => {
      urls.forEach(p => p.then(u => URL.revokeObjectURL(u)).catch(() => undefined))
      urls.clear()
    },
  }
}

export const errorMessage = (e: unknown) => e instanceof Error ? e.message : String(e)
