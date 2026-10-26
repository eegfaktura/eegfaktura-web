import React, {FC, useEffect, useMemo, useRef, useState} from "react";
import {
  IonButton,
  IonCard,
  IonInput,
  IonText,
  useIonAlert,
  useIonToast
} from "@ionic/react";
import {EditorContent, useEditor, useEditorState} from "@tiptap/react";
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
  replaceContent,
  MAILFILE_PREFIX,
  mailEditorExtensions,
  mailFileId,
  removeMailImages,
  setContentWithoutHistory,
  toMailHtml
} from "./mailEditor.extensions";
import {downscaleImage, ImageProcessError} from "../../util/ImageScale.util";
import {useLocale} from "../../store/hook/useLocale";
import {
  createBlobUrlCache, errorMessage, formatBytes, insertAtCursor, linkLimitReached, MAX_SUBJECT_CHARS
} from "./mailTemplate.util";
import MailEditorToolbar from "./MailEditorToolbar.component";
import MailFileList from "./MailFileList.component";
import MailPreviewCard from "./MailPreviewCard.component";
import MailTemplateHeader from "./MailTemplateHeader.component";
import MailPlaceholderPicker from "./MailPlaceholderPicker.component";
import UnsavedChangesGuard from "../core/UnsavedChangesGuard.component";
import {useOwnTextSwitch} from "./useOwnTextSwitch";
import {InsertImage, insertUploadedImage, mailImageEditorProps} from "./mailImagePaste";

import "./MailTemplateEditor.component.scss"

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
  // subject, text and toolbar are locked while a save runs: the server copy replaces them afterwards
  const [saving, setSaving] = useState(false)
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
  // pasted or dropped images: the editor props are fixed, the upload sees the current state
  const insertImage = useRef<InsertImage>(() => undefined)
  // set at once (not with the next render), so a second paste or drop right after the first sees them
  const busyNow = useRef(false)
  const imageCount = useRef(0)

  // blob URLs of the images shown in the editor, fetched with the bearer token
  const blobUrls = useMemo(() => createBlobUrlCache(id => service.fetchFile(source, tenant, templateKey, id)), [])
  useEffect(() => () => blobUrls.clear(), [])

  const extensions = useMemo(() => mailEditorExtensions(blobUrls.resolve), [])
  const editor = useEditor({
    extensions,
    content: "",
    onUpdate: () => setDirty(true),
    editorProps: mailImageEditorProps(() => insertImage.current),
  })

  const {ownText, setOwnText, switchKey, onSwitch} = useOwnTextSwitch({
    template, editor, dirty, saving, files, keepFiles: failed => setFiles(fs => [...fs, ...failed]),
    run: action => run(action), show: tpl => show(tpl),
    deleteDraft: id => service.deleteFile(source, tenant, templateKey, id),
    onDelete: () => run(async () => {
      await service.resetTemplate(source, tenant, templateKey)
      onChanged()
      if (await load()) toast(t("mailtemplates.reset_done"), "success")
      // deleted, but the reload failed: the standard text is sent now, so show it (the load error stays visible)
      else if (template) apply({...template, customized: false, version: 0, files: [], attachmentFileId: null,
        updatedAt: null, updatedBy: null})
    }),
  })

  const toast = (message: string, color: "success" | "danger") =>
    toaster({message, duration: 3500, position: "bottom", color})

  // shows the saved own version, or the standard text (switch off) when there is none
  const show = (tpl: MailTemplate) => {
    setOwnText(tpl.customized)
    setSubject(tpl.customized ? tpl.subject : tpl.defaultSubject)
    setFiles(tpl.files || [])
    setAttachmentId(tpl.attachmentFileId ?? null)
    setRemovedIds([])
    if (editor) setContentWithoutHistory(editor, (tpl.customized ? tpl.bodyHtml : tpl.defaultBodyHtml) || "")
    setDirty(false)
  }

  const apply = (tpl: MailTemplate) => {
    setTemplate(tpl)
    show(tpl)
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

  // a PDF stored before the mail lost its attachment (maxAttachments 0) is hidden and not sent again,
  // otherwise the save would be refused without a way to remove it in the editor
  const draft = (): MailTemplateDraft =>
    ({subject, bodyHtml: toMailHtml(editor ? editor.getHTML() : ""),
      attachmentFileId: limits?.maxAttachments === 0 ? null : attachmentId})

  // preview/test with the switch off: the standard text exactly as stored, not as the editor re-serialises it
  const previewDraft = (): MailTemplateDraft => !ownText && template
    ? {subject: template.defaultSubject, bodyHtml: template.defaultBodyHtml, attachmentFileId: null}
    : draft()

  const run = async (action: () => Promise<void>) => {
    setBusy(true)
    busyNow.current = true
    try {
      await action()
    } catch (e) {
      toast(t("mailtemplates.error", {message: errorMessage(e)}), "danger")
    } finally {
      busyNow.current = false
      setBusy(false)
    }
  }

  const onSave = () => run(async () => {
    if (!template) return
    setSaveErrors([])
    setSaving(true)
    try {
      apply(await service.saveTemplate(source, tenant, templateKey, draft(), template.version))
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
    } finally {
      setSaving(false)
    }
  })

  // runs the action directly, or after confirming that unsaved edits are discarded
  const confirmDiscard = (messageKey: string, action: () => void) => {
    if (!dirty) {
      action()
      return
    }
    presentAlert({
      header: t("mailtemplates.unsaved_header"),
      message: t(messageKey),
      buttons: [
        {text: t("mailtemplates.cancel"), role: "cancel"},
        {text: t("mailtemplates.unsaved_leave"), role: "destructive", handler: () => action()},
      ],
    })
  }

  const onClickClose = () => confirmDiscard("mailtemplates.unsaved_message", onClose)

  const onReloadAfterError = () => confirmDiscard("mailtemplates.unsaved_reload_message", () => run(async () => {
    await load()
  }))

  const onPreview = (d: MailTemplateDraft) => run(async () => {
    setPreview(await service.preview(source, tenant, templateKey, d))
  })

  const onApplyDefault = () => {
    if (!template) return
    setSubject(template.defaultSubject)
    if (editor) replaceContent(editor, template.defaultBodyHtml || "")
    setDirty(true)
  }

  const onTest = (recipient: MailTestRecipient) => run(async () => {
    const address = await service.sendTest(source, tenant, templateKey, recipient, previewDraft())
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
            if (href && !current && linkLimitReached(editor.getHTML(), limits?.maxLinks)) {
              toast(t("mailtemplates.link_limit", {max: limits?.maxLinks}), "danger")
              return false
            }
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

  // toolbar „Bild einfügen“, paste and drop; pos undefined = at the cursor
  const uploadImage: InsertImage = (file, pos) => {
    if (!limits) return
    // another upload, save, … still runs (e.g. a second paste right after the first)
    if (busyNow.current) {
      toast(t("mailtemplates.image_busy"), "danger")
      return
    }
    const doc = editor?.state.doc
    run(async () => {
      if (imageCount.current >= limits.maxImages) {
        throw new Error(t("mailtemplates.image_limit", {max: limits.maxImages}))
      }
      const scaled = await downscaleImage(file).catch(e => {
        throw e instanceof ImageProcessError ? new Error(t("mailtemplates.image_unreadable")) : e
      })
      if (scaled.size > limits.maxImageBytes) {
        throw new Error(t("mailtemplates.image_too_large", {max: formatBytes(limits.maxImageBytes)}))
      }
      checkTotal(scaled.size)
      const uploaded = await service.uploadFile(source, tenant, templateKey, scaled, file.name, "image")
      blobUrls.put(uploaded.id, scaled)
      imageCount.current++
      setFiles(fs => [...fs, uploaded])
      if (editor) insertUploadedImage(editor, {src: `${MAILFILE_PREFIX}${uploaded.id}`, alt: file.name}, pos, doc)
    })
  }
  useEffect(() => {
    insertImage.current = uploadImage
  })
  useEffect(() => {
    imageCount.current = images.length
  }, [images.length])

  const onImageSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = ""
    if (file) uploadImage(file)
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
      {/* the side menu, browser back, reload and closing the tab; the back button above asks itself */}
      <UnsavedChangesGuard dirty={dirty}/>
      <IonButton fill="clear" onClick={onClickClose}>{t("mailtemplates.back")}</IonButton>
      {!template && <p>{t("mailtemplates.loading")}</p>}
      {template && <MailTemplateHeader template={template} source={source} busy={busy || saving} loadError={loadError}
                                       conflict={conflict} ownText={ownText} switchKey={switchKey} onSwitch={onSwitch}
                                       onApplyDefault={onApplyDefault}
                                       onViewDefault={() => onPreview({subject: template.defaultSubject, bodyHtml: template.defaultBodyHtml})}
                                       onReloadAfterError={onReloadAfterError} onReloadAfterConflict={() => load()}/>}

      <IonCard color="eeglight" className={template ? "" : "ion-hide"}>
        <div className="mail-editor-row">
          <IonInput ref={subjectInput} label={t("mailtemplates.subject")} labelPlacement="floating" fill="outline"
                    maxlength={MAX_SUBJECT_CHARS} className="mail-subject" disabled={saving || !ownText}
                    value={subject} onIonInput={e => {
            setSubject(String(e.detail.value ?? ""));
            setDirty(true)
          }}/>
          {template && template.placeholders.some(p => !p.block) &&
            <MailPlaceholderPicker key={`subject-${pickerRound}`} target="subject" placeholders={template.placeholders} disabled={saving || !ownText}
                                   onPick={ph => onInsertSubjectPlaceholder(ph.key)}/>}
        </div>
        <div className="mail-editor-row">
          {editor && <MailEditorToolbar editor={editor} onLink={onLink} disabled={saving || !ownText}
                                        onImage={() => imageInput.current?.click()}
                                        imageDisabled={busy || !limits || images.length >= limits.maxImages}/>}
          {template && template.placeholders.length > 0 &&
            <MailPlaceholderPicker key={`body-${pickerRound}`} target="body" placeholders={template.placeholders} disabled={saving || !ownText}
                                   onPick={onInsertPlaceholder}/>}
        </div>
        <EditorContent editor={editor} className="mail-editor"/>
        {template?.fixedFooter &&
          <p className="mail-fixed-footer">{t("mailtemplates.fixed_footer")} {template.fixedFooter}</p>}
        <input ref={imageInput} type="file" accept="image/png,image/jpeg" hidden onChange={onImageSelected}/>
        <input ref={pdfInput} type="file" accept="application/pdf" hidden onChange={onPdfSelected}/>

        {ownText && <MailFileList images={images} attachments={attachments} totalBytes={totalBytes} limits={limits}
                      usedImageIds={usedImageIds} attachmentId={attachmentId} busy={busy || saving} saving={saving}
                      onAttach={f => {
                        setAttachmentId(f.id)
                        setDirty(true)
                      }}
                      onRemove={onRemoveFile} onAddPdf={() => pdfInput.current?.click()}/>}

        <div className="mail-template-actions">
          <IonButton disabled={busy || conflict || !ownText} onClick={onSave}>{t("mailtemplates.save")}</IonButton>
          <IonButton fill="outline" disabled={busy} onClick={() => onPreview(previewDraft())}>{t("mailtemplates.preview")}</IonButton>
          <IonButton fill="outline" disabled={busy} onClick={() => onTest("me")}>{t("mailtemplates.test_me")}</IonButton>
          <IonButton fill="outline" disabled={busy || !eegEmail} title={eegEmail ? undefined : t("mailtemplates.test_eeg_missing")}
                     onClick={() => onTest("eeg")}>{t("mailtemplates.test_eeg")}</IonButton>
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

      {preview && <MailPreviewCard preview={preview} onClose={() => setPreview(undefined)}/>}
    </div>
  )
}

export default MailTemplateEditor
