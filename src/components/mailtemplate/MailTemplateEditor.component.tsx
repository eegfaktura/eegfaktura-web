import React, {FC, useEffect, useMemo, useRef, useState} from "react";
import {
  IonButton,
  IonCard,
  IonChip,
  IonIcon,
  IonInput,
  IonLabel,
  IonSelect,
  IonSelectOption,
  IonText,
  useIonAlert,
  useIonToast
} from "@ionic/react";
import {closeCircleOutline, documentOutline, imageOutline, linkOutline, listOutline} from "ionicons/icons";
import {Editor, EditorContent, useEditor, useEditorState} from "@tiptap/react";
import moment from "moment";
import {Api} from "../../service";
import {MailTemplateError} from "../../service/mailtemplate.service";
import {
  MailFile,
  MailPlaceholder,
  MailPreview,
  MailTemplate,
  MailTemplateDraft,
  MailTemplateSource,
  MailTestRecipient
} from "../../models/mailtemplate.model";
import {
  applyLink,
  insertPlaceholder,
  MAILFILE_PREFIX,
  mailEditorExtensions,
  mailFileId,
  removeMailImages,
  setContentWithoutHistory,
  toMailHtml
} from "./mailEditor.extensions";
import {downscaleImage} from "../../util/ImageScale.util";
import {useLocale} from "../../store/hook/useLocale";

import "./MailTemplateEditor.component.scss"

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

const MAX_SUBJECT_CHARS = 200

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
      urls.set(id, Promise.resolve(URL.createObjectURL(blob)))
    },
    clear: () => {
      urls.forEach(p => p.then(u => URL.revokeObjectURL(u)).catch(() => undefined))
      urls.clear()
    },
  }
}

const errorMessage = (e: unknown) => e instanceof Error ? e.message : String(e)

interface ToolbarProps {
  editor: Editor
  onLink: () => void
  onImage: () => void
  imageDisabled: boolean
}

const MailEditorToolbar: FC<ToolbarProps> = ({editor, onLink, onImage, imageDisabled}) => {
  const {t} = useLocale("common")
  const state = useEditorState({
    editor,
    selector: ({editor: e}) => ({
      bold: e.isActive("bold"),
      italic: e.isActive("italic"),
      underline: e.isActive("underline"),
      h1: e.isActive("heading", {level: 1}),
      h2: e.isActive("heading", {level: 2}),
      h3: e.isActive("heading", {level: 3}),
      bulletList: e.isActive("bulletList"),
      orderedList: e.isActive("orderedList"),
      link: e.isActive("link"),
      left: e.isActive({textAlign: "left"}),
      center: e.isActive({textAlign: "center"}),
      right: e.isActive({textAlign: "right"}),
    })
  })
  const chain = () => editor.chain().focus()
  const button = (key: string, label: React.ReactNode, active: boolean, run: () => void, disabled = false) => (
    <IonButton key={key} size="small" fill={active ? "solid" : "outline"} title={t(`mailtemplates.toolbar.${key}`)}
               aria-label={t(`mailtemplates.toolbar.${key}`)} disabled={disabled} onClick={run}>{label}</IonButton>
  )
  return (
    <div className="mail-editor-toolbar">
      {button("bold", <strong>B</strong>, state.bold, () => chain().toggleBold().run())}
      {button("italic", <em>I</em>, state.italic, () => chain().toggleItalic().run())}
      {button("underline", <u>U</u>, state.underline, () => chain().toggleUnderline().run())}
      {button("h1", "H1", state.h1, () => chain().toggleHeading({level: 1}).run())}
      {button("h2", "H2", state.h2, () => chain().toggleHeading({level: 2}).run())}
      {button("h3", "H3", state.h3, () => chain().toggleHeading({level: 3}).run())}
      {button("bullet_list", <IonIcon icon={listOutline}/>, state.bulletList, () => chain().toggleBulletList().run())}
      {button("ordered_list", "1.", state.orderedList, () => chain().toggleOrderedList().run())}
      {button("link", <IonIcon icon={linkOutline}/>, state.link, onLink)}
      {button("align_left", "⇤", state.left, () => chain().setTextAlign("left").run())}
      {button("align_center", "↔", state.center, () => chain().setTextAlign("center").run())}
      {button("align_right", "⇥", state.right, () => chain().setTextAlign("right").run())}
      {button("image", <IonIcon icon={imageOutline}/>, false, onImage, imageDisabled)}
    </div>
  )
}

interface MailTemplateEditorProps {
  tenant: string
  source: MailTemplateSource
  templateKey: string
  eegEmail?: string
  onClose: () => void
  onChanged: () => void
}

const MailTemplateEditor: FC<MailTemplateEditorProps> = ({tenant, source, templateKey, eegEmail, onClose, onChanged}) => {
  const {t} = useLocale("common")
  const service = Api.mailTemplateService
  const [presentAlert] = useIonAlert()
  const [toaster] = useIonToast()

  const [template, setTemplate] = useState<MailTemplate>()
  const [subject, setSubject] = useState("")
  const [files, setFiles] = useState<MailFile[]>([])
  // PDF sent with the next save (PUT attachmentFileId)
  const [attachmentId, setAttachmentId] = useState<string | null>(null)
  // saved files the user removed; the next save drops them (DELETE of a file in use → 409)
  const [removedIds, setRemovedIds] = useState<string[]>([])
  const [dirty, setDirty] = useState(false)
  const [busy, setBusy] = useState(false)
  const [loadError, setLoadError] = useState<string>()
  const [conflict, setConflict] = useState(false)
  const [preview, setPreview] = useState<MailPreview>()
  const [sentTo, setSentTo] = useState<string>()
  // 400 answers of the last save, shown until the next save
  const [saveErrors, setSaveErrors] = useState<string[]>([])
  // remounts the placeholder pickers after each insert, so the same placeholder can be chosen again
  const [pickerRound, setPickerRound] = useState(0)
  const imageInput = useRef<HTMLInputElement>(null)
  const pdfInput = useRef<HTMLInputElement>(null)
  const subjectInput = useRef<HTMLIonInputElement>(null)

  // blob URLs of the images shown in the editor, fetched with the bearer token
  const blobUrls = useMemo(() => createBlobUrlCache(id => service.fetchFile(source, tenant, templateKey, id)), [])
  useEffect(() => () => blobUrls.clear(), [])

  const extensions = useMemo(() => mailEditorExtensions(blobUrls.resolve), [])
  const editor = useEditor({
    extensions,
    content: "",
    onUpdate: () => setDirty(true),
  })

  const toast = (message: string, color: "success" | "danger") =>
    toaster({message, duration: 3500, position: "bottom", color})

  const apply = (tpl: MailTemplate) => {
    setTemplate(tpl)
    setSubject(tpl.subject)
    setFiles(tpl.files || [])
    setAttachmentId(tpl.attachmentFileId ?? null)
    setRemovedIds([])
    if (editor) setContentWithoutHistory(editor, tpl.bodyHtml || "")
    setDirty(false)
    setConflict(false)
  }

  // Resolves to false when loading failed; the error stays visible, also above an already loaded version.
  const load = (): Promise<boolean> => {
    setLoadError(undefined)
    return service.fetchTemplate(source, tenant, templateKey)
      .then(tpl => {
        apply(tpl)
        return true
      })
      .catch(e => {
        setLoadError(errorMessage(e))
        return false
      })
  }

  useEffect(() => {
    if (editor) {
      load()
    }
  }, [editor, tenant, source, templateKey])

  const draft = (): MailTemplateDraft => ({subject, bodyHtml: toMailHtml(editor ? editor.getHTML() : "")})

  const run = async (action: () => Promise<void>) => {
    setBusy(true)
    try {
      await action()
    } catch (e) {
      toast(t("mailtemplates.error", {message: errorMessage(e)}), "danger")
    } finally {
      setBusy(false)
    }
  }

  const onSave = () => run(async () => {
    if (!template) return
    setSaveErrors([])
    try {
      apply(await service.saveTemplate(source, tenant, templateKey, draft(), template.version, attachmentId))
      toast(t("mailtemplates.saved"), "success")
      onChanged()
    } catch (e) {
      if (e instanceof MailTemplateError && e.isConflict) {
        setConflict(true)
        return
      }
      if (e instanceof MailTemplateError && e.status === 400) {
        setSaveErrors(e.fieldErrors.length > 0 ? e.fieldErrors.map(f => f.message) : [e.message])
        return
      }
      throw e
    }
  })

  const onReset = () => presentAlert({
    header: t("mailtemplates.reset_confirm_header"),
    message: t("mailtemplates.reset_confirm_message"),
    buttons: [
      {text: t("mailtemplates.cancel"), role: "cancel"},
      {
        text: t("mailtemplates.reset"), role: "destructive", handler: () => {
          run(async () => {
            await service.resetTemplate(source, tenant, templateKey)
            onChanged()
            if (await load()) {
              toast(t("mailtemplates.reset_done"), "success")
            }
          })
        }
      },
    ],
  })

  const onClickClose = () => {
    if (!dirty) {
      onClose()
      return
    }
    presentAlert({
      header: t("mailtemplates.unsaved_header"),
      message: t("mailtemplates.unsaved_message"),
      buttons: [
        {text: t("mailtemplates.cancel"), role: "cancel"},
        {text: t("mailtemplates.unsaved_leave"), role: "destructive", handler: () => onClose()},
      ],
    })
  }

  const onPreview = (d: MailTemplateDraft) => run(async () => {
    setPreview(await service.preview(source, tenant, templateKey, d))
  })

  const onApplyDefault = () => {
    if (!template) return
    setSubject(template.defaultSubject)
    if (editor) setContentWithoutHistory(editor, template.defaultBodyHtml || "")
    setDirty(true)
  }

  const onTest = (recipient: MailTestRecipient) => run(async () => {
    const address = await service.sendTest(source, tenant, templateKey, recipient, draft())
    setSentTo(address)
    toast(t("mailtemplates.test_sent", {address}), "success")
  })

  const onInsertPlaceholder = (ph: MailPlaceholder) => {
    setPickerRound(r => r + 1)
    if (editor) insertPlaceholder(editor, ph)
  }

  // Subject placeholders are plain text "{key}", inline keys only (section H).
  const onInsertSubjectPlaceholder = async (key: string) => {
    setPickerRound(r => r + 1)
    const input = await subjectInput.current?.getInputElement()
    const r = insertAtCursor(subject, `{${key}}`, input?.selectionStart, input?.selectionEnd)
    if (r.value.length > MAX_SUBJECT_CHARS) {
      toast(t("mailtemplates.subject_too_long", {max: MAX_SUBJECT_CHARS}), "danger")
      return
    }
    setSubject(r.value)
    setDirty(true)
    if (input) {
      requestAnimationFrame(() => {
        input.focus()
        input.setSelectionRange(r.cursor, r.cursor)
      })
    }
  }

  const onLink = () => {
    if (!editor) return
    const current = editor.getAttributes("link").href || ""
    presentAlert({
      header: t("mailtemplates.link_header"),
      message: t("mailtemplates.link_message"),
      inputs: [{name: "href", type: "url", value: current, placeholder: "https://"}],
      buttons: [
        {text: t("mailtemplates.cancel"), role: "cancel"},
        {
          text: t("mailtemplates.link_apply"), handler: (values: { href: string }) => {
            const href = (values.href || "").trim()
            if (!href || /^(https:|mailto:)/i.test(href)) {
              applyLink(editor, href)
            } else {
              toast(t("mailtemplates.link_invalid"), "danger")
              return false
            }
          }
        },
      ],
    })
  }

  const usedImageIds = useEditorState({
    editor,
    selector: ({editor: e}) => {
      const ids: string[] = []
      e?.state.doc.descendants(n => {
        const id = n.type.name === "image" ? mailFileId(n.attrs.src) : undefined
        if (id) ids.push(id)
      })
      return ids
    }
  }) || []
  const visibleFiles = files.filter(f => !removedIds.includes(f.id))
  const images = visibleFiles.filter(f => f.kind === "image")
  const attachments = visibleFiles.filter(f => f.kind === "attachment")
  const totalBytes = visibleFiles.reduce((s, f) => s + (f.size || 0), 0)
  const limits = template?.limits

  const checkTotal = (size: number) => {
    if (limits && totalBytes + size > limits.maxTotalBytes) {
      throw new Error(t("mailtemplates.total_too_large", {max: formatBytes(limits.maxTotalBytes)}))
    }
  }

  const onImageSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ""
    if (!file || !limits) return
    run(async () => {
      if (images.length >= limits.maxImages) {
        throw new Error(t("mailtemplates.image_limit", {max: limits.maxImages}))
      }
      const scaled = await downscaleImage(file)
      if (scaled.size > limits.maxImageBytes) {
        throw new Error(t("mailtemplates.image_too_large", {max: formatBytes(limits.maxImageBytes)}))
      }
      checkTotal(scaled.size)
      const uploaded = await service.uploadFile(source, tenant, templateKey, scaled, file.name, "image")
      blobUrls.put(uploaded.id, scaled)
      setFiles(fs => [...fs, uploaded])
      editor?.chain().focus().setImage({src: `${MAILFILE_PREFIX}${uploaded.id}`, alt: file.name}).run()
    })
  }

  const onPdfSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ""
    if (!file || !limits) return
    run(async () => {
      if (file.size > limits.maxAttachmentBytes) {
        throw new Error(t("mailtemplates.attachment_too_large", {max: formatBytes(limits.maxAttachmentBytes)}))
      }
      checkTotal(file.size)
      const uploaded = await service.uploadFile(source, tenant, templateKey, file, file.name, "attachment")
      setFiles(fs => [...fs, uploaded])
      setAttachmentId(uploaded.id)
      setDirty(true)
    })
  }

  // Removes an image or PDF from the text and the attachment at once. A draft is deleted on the
  // service; a saved file (or one the service reports as in use, 409) goes with the next save.
  const onRemoveFile = (f: MailFile) => run(async () => {
    if (editor && removeMailImages(editor, f.id)) setDirty(true)
    if (attachmentId === f.id) {
      setAttachmentId(null)
      setDirty(true)
    }
    const dropOnSave = () => {
      setRemovedIds(ids => [...ids, f.id])
      setDirty(true)
    }
    if (f.committed) {
      dropOnSave()
      return
    }
    try {
      await service.deleteFile(source, tenant, templateKey, f.id)
      setFiles(fs => fs.filter(x => x.id !== f.id))
    } catch (e) {
      if (e instanceof MailTemplateError && e.isConflict) {
        dropOnSave()
        toast(t("mailtemplates.file_in_use"), "danger")
        return
      }
      throw e
    }
  })

  const fileState = (f: MailFile) => [
    t(f.committed ? "mailtemplates.file_saved" : "mailtemplates.file_draft"),
    f.kind === "image" && !usedImageIds.includes(f.id) ? t("mailtemplates.file_not_in_text") : undefined,
    f.kind === "attachment" && attachmentId !== f.id ? t("mailtemplates.file_not_attached") : undefined,
  ].filter(Boolean).join(", ")

  const fileChip = (f: MailFile) => (
    <IonChip key={f.id}>
      <IonIcon icon={f.kind === "image" ? imageOutline : documentOutline}/>
      <IonLabel>{f.filename} ({formatBytes(f.size)}) – {fileState(f)}</IonLabel>
      <IonIcon icon={closeCircleOutline} aria-label={t("mailtemplates.file_remove", {name: f.filename})}
               onClick={() => onRemoveFile(f)}/>
    </IonChip>
  )

  if (loadError && !template) {
    return (
      <div className="mail-template-editor">
        <IonButton fill="clear" onClick={onClose}>{t("mailtemplates.back")}</IonButton>
        <IonText color="danger"><p>{t("mailtemplates.error", {message: loadError})}</p></IonText>
      </div>
    )
  }

  return (
    <div className="mail-template-editor">
      <IonButton fill="clear" onClick={onClickClose}>{t("mailtemplates.back")}</IonButton>
      {!template && <p>{t("mailtemplates.loading")}</p>}
      {template && <>
        <div className="header">{template.name}</div>
        <p className="mail-template-description">{template.description}</p>
        <p className="mail-template-status">{statusText(t, template)}</p>
        {source === "billing" && <IonText color="medium"><p>{t("mailtemplates.billing_pdf_hint")}</p></IonText>}
        {template.legacyTemplateActive &&
          <IonText color="warning"><p className="mail-template-notice">{t("mailtemplates.legacy_active")}</p></IonText>}
        {template.defaultChanged && (
          <div className="mail-template-notice">
            <IonText color="warning"><p>{t("mailtemplates.default_changed")}</p></IonText>
            <IonButton size="small" fill="outline" disabled={busy}
                       onClick={() => onPreview({subject: template.defaultSubject, bodyHtml: template.defaultBodyHtml})}>
              {t("mailtemplates.default_view")}
            </IonButton>
            <IonButton size="small" fill="outline" onClick={onApplyDefault}>{t("mailtemplates.default_apply")}</IonButton>
          </div>
        )}
        {loadError && (
          <div className="mail-template-notice" role="alert">
            <IonText color="danger"><p>{t("mailtemplates.load_failed", {message: loadError})}</p></IonText>
            <IonButton size="small" disabled={busy} onClick={() => load()}>{t("mailtemplates.reload")}</IonButton>
          </div>
        )}
        {conflict && (
          <div className="mail-template-notice" role="alert">
            <IonText color="danger"><p>{t("mailtemplates.conflict")}</p></IonText>
            <IonButton size="small" onClick={() => load()}>{t("mailtemplates.reload")}</IonButton>
          </div>
        )}
      </>}

      <IonCard color="eeglight" className={template ? "" : "ion-hide"}>
        <div className="mail-editor-row">
          <IonInput ref={subjectInput} label={t("mailtemplates.subject")} labelPlacement="floating" fill="outline"
                    maxlength={MAX_SUBJECT_CHARS} className="mail-subject"
                    value={subject} onIonInput={e => {
            setSubject(String(e.detail.value ?? ""));
            setDirty(true)
          }}/>
          {template && template.placeholders.some(p => !p.block) && (
            <IonSelect key={`subject-${pickerRound}`} interface="popover" data-testid="subject-placeholder"
                       placeholder={t("mailtemplates.placeholder_insert_subject")} value={null}
                       aria-label={t("mailtemplates.placeholder_insert_subject")}
                       onIonChange={e => {
                         if (e.detail.value) onInsertSubjectPlaceholder(e.detail.value)
                       }}>
              {template.placeholders.filter(p => !p.block).map(p => (
                <IonSelectOption key={p.key} value={p.key}>{p.label}</IonSelectOption>
              ))}
            </IonSelect>
          )}
        </div>
        <div className="mail-editor-row">
          {editor && <MailEditorToolbar editor={editor} onLink={onLink}
                                        onImage={() => imageInput.current?.click()}
                                        imageDisabled={busy || !limits || images.length >= limits.maxImages}/>}
          {template && template.placeholders.length > 0 && (
            <IonSelect key={`body-${pickerRound}`} interface="popover" data-testid="body-placeholder"
                       placeholder={t("mailtemplates.placeholder_insert")} value={null}
                       aria-label={t("mailtemplates.placeholder_insert")}
                       onIonChange={e => {
                         const ph = template.placeholders.find(p => p.key === e.detail.value)
                         if (ph) onInsertPlaceholder(ph)
                       }}>
              {template.placeholders.map(p => (
                <IonSelectOption key={p.key} value={p.key}>
                  {p.block ? `${p.label} (${t("mailtemplates.placeholder_block")})` : p.label}
                </IonSelectOption>
              ))}
            </IonSelect>
          )}
        </div>
        <EditorContent editor={editor} className="mail-editor"/>
        <input ref={imageInput} type="file" accept="image/png,image/jpeg" hidden onChange={onImageSelected}/>
        <input ref={pdfInput} type="file" accept="application/pdf" hidden onChange={onPdfSelected}/>

        {limits && <div className="mail-template-limits">
          <IonText color="medium">
            <p>{t("mailtemplates.limits_images", {count: images.length, max: limits.maxImages, size: formatBytes(limits.maxImageBytes)})}</p>
            {limits.maxAttachments > 0 &&
              <p>{t("mailtemplates.limits_attachment", {max: limits.maxAttachments, size: formatBytes(limits.maxAttachmentBytes)})}</p>}
            <p>{t("mailtemplates.limits_total", {total: formatBytes(totalBytes), max: formatBytes(limits.maxTotalBytes)})}</p>
          </IonText>
        </div>}

        {images.length > 0 && (
          <div className="mail-template-attachments">
            <IonLabel>{t("mailtemplates.images")}</IonLabel>
            {images.map(fileChip)}
          </div>
        )}

        {limits && limits.maxAttachments > 0 && (
          <div className="mail-template-attachments">
            <IonLabel>{t("mailtemplates.attachment")}</IonLabel>
            {attachments.map(fileChip)}
            <IonButton size="small" fill="outline" disabled={busy || attachments.length >= limits.maxAttachments}
                       onClick={() => pdfInput.current?.click()}>{t("mailtemplates.attachment_add")}</IonButton>
          </div>
        )}

        <div className="mail-template-actions">
          <IonButton disabled={busy || conflict} onClick={onSave}>{t("mailtemplates.save")}</IonButton>
          <IonButton fill="outline" disabled={busy} onClick={() => onPreview(draft())}>{t("mailtemplates.preview")}</IonButton>
          <IonButton fill="outline" disabled={busy} onClick={() => onTest("me")}>{t("mailtemplates.test_me")}</IonButton>
          <IonButton fill="outline" disabled={busy || !eegEmail} title={eegEmail ? undefined : t("mailtemplates.test_eeg_missing")}
                     onClick={() => onTest("eeg")}>{t("mailtemplates.test_eeg")}</IonButton>
          <IonButton fill="clear" color="danger" disabled={busy || !template?.customized} onClick={onReset}>
            {t("mailtemplates.reset")}
          </IonButton>
        </div>
        {!eegEmail && <IonText color="medium"><p>{t("mailtemplates.test_eeg_missing")}</p></IonText>}
        {saveErrors.length > 0 && (
          <div role="alert">
            <IonText color="danger">
              <p>{t("mailtemplates.save_rejected")}</p>
              <ul>{saveErrors.map((m, i) => <li key={i}>{m}</li>)}</ul>
            </IonText>
          </div>
        )}
        {sentTo && <IonText color="success"><p>{t("mailtemplates.test_sent", {address: sentTo})}</p></IonText>}
      </IonCard>

      {preview && (
        <IonCard className="mail-template-preview">
          <div className="mail-template-preview-header">
            <IonLabel>{t("mailtemplates.preview_title")}</IonLabel>
            <IonButton size="small" fill="clear" onClick={() => setPreview(undefined)}>{t("mailtemplates.preview_close")}</IonButton>
          </div>
          <p><strong>{t("mailtemplates.subject")}:</strong> {preview.subject}</p>
          {/* sandbox without allow-scripts / allow-same-origin: the rendered mail cannot run code or reach the app */}
          <iframe title={t("mailtemplates.preview_title")} sandbox="" srcDoc={preview.html}/>
        </IonCard>
      )}
    </div>
  )
}

export default MailTemplateEditor
