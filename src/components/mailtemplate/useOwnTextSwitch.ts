import {useEffect, useState} from "react";
import {useIonAlert} from "@ionic/react";
import {Editor} from "@tiptap/react";
import {MailFile, MailTemplate} from "../../models/mailtemplate.model";
import {useLocale} from "../../store/hook/useLocale";

interface OwnTextSwitchArgs {
  template?: MailTemplate
  editor: Editor | null
  dirty: boolean
  saving: boolean
  // the files shown in the editor, with the drafts uploaded since the template was loaded
  files: MailFile[]
  // shows the drafts whose deletion failed again in the file list
  keepFiles: (failed: MailFile[]) => void
  // runs an action with the editor's busy state and error toast
  run: (action: () => Promise<void>) => Promise<void>
  // shows the template as loaded (without saved version: the standard text, switch off)
  show: (tpl: MailTemplate) => void
  deleteDraft: (id: string) => Promise<void>
  // deletes the saved own version (DELETE) and reloads; the reload switches back to the standard
  onDelete: () => Promise<void>
}

// The switch „Eigenen Text verwenden“: off = the standard text is sent, the editor is locked.
export const useOwnTextSwitch = (
  {template, editor, dirty, saving, files, keepFiles, run, show, deleteDraft, onDelete}: OwnTextSwitchArgs) => {
  const {t} = useLocale("common")
  const [presentAlert] = useIonAlert()
  const [ownText, setOwnText] = useState(false)
  // remounts the switch after a cancelled question or a failed delete, so it shows the state again
  const [switchKey, setSwitchKey] = useState(0)
  const resync = () => setSwitchKey(k => k + 1)

  // without update event: locking and unlocking do not make the text dirty
  useEffect(() => {
    editor?.setEditable(ownText && !saving, false)
  }, [editor, ownText, saving])

  const ask = (messageKey: string, action: () => void) => presentAlert({
    message: t(messageKey),
    buttons: [{text: t("mailtemplates.cancel"), role: "cancel"}, {text: t("mailtemplates.yes"), role: "confirm"}],
    onDidDismiss: (e: CustomEvent) => e.detail.role === "confirm" ? action() : resync(),
  })

  // back to the standard text without saved version: the edits go, and so do the drafts uploaded since loading
  const discard = () => {
    if (!template) return
    const drafts = files.filter(f => !f.committed && !(template.files || []).some(x => x.id === f.id))
    show(template)
    if (drafts.length > 0) {
      run(async () => {
        const results = await Promise.allSettled(drafts.map(f => deleteDraft(f.id)))
        const failed = drafts.filter((_, i) => results[i].status === "rejected")
        if (failed.length > 0) {
          // still on the service: keep them visible, so they can be removed later
          keepFiles(failed)
          throw (results.find(r => r.status === "rejected") as PromiseRejectedResult).reason
        }
      })
    }
  }

  const onSwitch = (on: boolean) => {
    if (on === ownText) return
    if (on) {
      setOwnText(true)
    } else if (template?.customized) {
      ask("mailtemplates.own_text_delete_confirm", () => onDelete().finally(resync))
    } else if (dirty) {
      ask("mailtemplates.own_text_discard_confirm", discard)
    } else {
      discard()
    }
  }

  return {ownText, setOwnText, switchKey, onSwitch}
}
