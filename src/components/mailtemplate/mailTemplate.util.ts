import moment from "moment";

export const formatBytes = (bytes: number) =>
  bytes >= 1024 * 1024
    ? `${(bytes / (1024 * 1024)).toLocaleString("de-AT", {maximumFractionDigits: 1})} MB`
    : `${Math.round(bytes / 1024).toLocaleString("de-AT")} KB`

// "Standard" or "Angepasst (am … von …)", for the list and the editor
export const statusText = (t: (key: string, options?: Record<string, unknown>) => string,
                           s: { customized: boolean, updatedAt?: string | null, updatedBy?: string | null }) =>
  s.customized
    ? t(s.updatedBy ? "mailtemplates.status_customized" : "mailtemplates.status_customized_nouser",
      {date: s.updatedAt ? moment(s.updatedAt).format("DD.MM.YYYY HH:mm") : "", user: s.updatedBy})
    : t("mailtemplates.status_default")

export const MAX_SUBJECT_CHARS = 200

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
