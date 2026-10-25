import React, {FC, useEffect, useRef, useState} from "react";
import {IonCard, IonContent, IonItem, IonLabel, IonList, IonPage, IonText} from "@ionic/react";
import {useAccessGroups, useTenant} from "../store/hook/Eeg.provider";
import {useAppSelector} from "../store";
import {eegSelector} from "../store/eeg";
import {useLocale} from "../store/hook/useLocale";
import {Api} from "../service";
import {MailTemplateListItem, MailTemplateSource} from "../models/mailtemplate.model";
import MailTemplateEditor from "../components/mailtemplate/MailTemplateEditor.component";
import {statusText} from "../components/mailtemplate/mailTemplate.util";

import "./Eeg.page.scss"

// „E-Mail-Texte“: the member mails of backend (3) and billing (1) in one list
// (konzept-mail-texte-editierbar.md). Only EEG admins; the services check the role as well.
const MailTemplatesPage: FC = () => {
  const {t} = useLocale("common")
  const {isAdmin} = useAccessGroups()
  const admin = isAdmin()
  const {tenant} = useTenant()
  const eeg = useAppSelector(eegSelector)

  const [items, setItems] = useState<MailTemplateListItem[]>()
  const [failed, setFailed] = useState<MailTemplateSource[]>([])
  const [selected, setSelected] = useState<MailTemplateListItem>()

  // only the latest request may set the list: a slow answer for the previous community is dropped
  const request = useRef(0)
  const loadList = () => {
    if (!tenant || !admin) return
    const current = ++request.current
    Api.mailTemplateService.fetchList(tenant).then(r => {
      if (current !== request.current) return
      setItems(r.items)
      setFailed(r.failed)
    }).catch(() => {
      if (current !== request.current) return
      setItems([])
      setFailed(["backend", "billing"])
    })
  }

  useEffect(() => {
    setSelected(undefined)
    setItems(undefined)
    setFailed([])
    loadList()
  }, [tenant, admin])

  return (
    <IonPage>
      <IonContent fullscreen>
        <div style={{flexGrow: "1", background: "#EAE7D9", minHeight: "100%"}}>
          {!admin && <div className="eeg-property-card"><p>{t("mailtemplates.admin_only")}</p></div>}
          {admin && selected && (
            <MailTemplateEditor key={`${tenant}-${selected.key}`} tenant={tenant} source={selected.source}
                                templateKey={selected.key} eegEmail={eeg?.contact?.email?.trim() || undefined}
                                onClose={() => setSelected(undefined)} onChanged={loadList}/>
          )}
          {admin && !selected && (
            <div className="eeg-property-card" style={{maxWidth: "900px"}}>
              <div className="header">{t("mailtemplates.header")}</div>
              <IonCard color="eeglight">
                {!items && <p style={{padding: "0 16px"}}>{t("mailtemplates.loading")}</p>}
                {failed.map(s => (
                  <IonText key={s} color="danger"><p style={{padding: "0 16px"}}>{t(`mailtemplates.load_failed_${s}`)}</p></IonText>
                ))}
                {items && <IonList>
                  {items.map(item => (
                    <IonItem key={`${item.source}-${item.key}`} button detail onClick={() => setSelected(item)}>
                      <IonLabel className="ion-text-wrap">
                        <h2>{item.name}</h2>
                        <p>{item.description}</p>
                        <p>{statusText(t, item)}</p>
                        {item.defaultChanged &&
                          <IonText color="warning"><p>{t("mailtemplates.default_changed")}</p></IonText>}
                      </IonLabel>
                    </IonItem>
                  ))}
                </IonList>}
              </IonCard>
            </div>
          )}
        </div>
      </IonContent>
    </IonPage>
  )
}

export default MailTemplatesPage
