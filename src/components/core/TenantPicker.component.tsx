import React, {FC, useMemo, useState} from "react";
import {
  IonButton, IonButtons, IonContent, IonHeader, IonIcon, IonItem, IonLabel, IonList, IonModal, IonSearchbar, IonTitle,
  IonToolbar,
} from "@ionic/react";
import {checkmark} from "ionicons/icons";
import {useTenant, useTenantDescription, useTenantSwitch} from "../../store/hook/Eeg.provider";
import {useLeaveUnsaved} from "../../store/hook/ParticipantProvider";
import {useLocale} from "../../store/hook/useLocale";
import {foldForSearch} from "../../util/Search.util";

type TenantOption = {tenant: string, name: string}

// The list of the community picker (platform#241): with more than one community a search field filters by number and
// name, like the tariff list. Choosing another community asks first when a form holds unsaved input (platform#228).
export const TenantPickerList: FC<{onDone: () => void}> = ({onDone}) => {
  const {t} = useLocale("common")
  const tenants = useTenantDescription()
  const {tenant} = useTenant()
  const switchTenant = useTenantSwitch()
  const leaveUnsaved = useLeaveUnsaved(["addMeter", "details", "tariff"])
  const [query, setQuery] = useState("")

  const sorted = useMemo<TenantOption[]>(() => [...(tenants ?? [])].sort((a, b) => a.tenant.localeCompare(b.tenant)),
    [tenants])
  const needle = foldForSearch(query.trim())
  const shown = needle ? sorted.filter(o => foldForSearch(`${o.tenant}-${o.name}`).includes(needle)) : sorted

  const choose = (next: string) => {
    if (next === tenant) return onDone()
    leaveUnsaved(() => { switchTenant(next); onDone() })
  }

  return (
    <>
      {sorted.length > 1 && (
        <IonSearchbar placeholder={t("tenantSearchPlaceholder")} debounce={500}
                      onIonInput={(e) => setQuery(e.detail.value ?? "")}/>
      )}
      <IonList>
        {shown.map(o => (
          <IonItem key={o.tenant} button detail={false} onClick={() => choose(o.tenant)}>
            <IonLabel>{o.tenant}-{o.name}</IonLabel>
            {o.tenant === tenant && <IonIcon slot="end" icon={checkmark} aria-label={t("tenantPickerCurrent")}/>}
          </IonItem>
        ))}
      </IonList>
      {/* as the tariff list: only while searching, same look as .rate-search-empty */}
      {needle && shown.length === 0 &&
        <p style={{margin: "12px 15px", fontSize: "13px", color: "var(--ion-color-medium-shade)"}}>{t("tenantSearchEmpty")}</p>}
    </>
  )
}

// A dialog of its own: the user popover closes on every click inside it, so it cannot hold a search field.
const TenantPicker: FC<{isOpen: boolean, onClose: () => void}> = ({isOpen, onClose}) => {
  const {t} = useLocale("common")
  // a new list on each opening starts with an empty search; it stays mounted while the dialog slides out
  const [opening, setOpening] = useState(0)
  return (
    <IonModal isOpen={isOpen} onWillPresent={() => setOpening(n => n + 1)} onDidDismiss={onClose}>
      <IonHeader>
        <IonToolbar>
          <IonTitle>{t("tenantPickerTitle")}</IonTitle>
          <IonButtons slot="end">
            <IonButton onClick={onClose}>{t("tenantPickerClose")}</IonButton>
          </IonButtons>
        </IonToolbar>
      </IonHeader>
      <IonContent>
        <TenantPickerList key={opening} onDone={onClose}/>
      </IonContent>
    </IonModal>
  )
}

export default TenantPicker
