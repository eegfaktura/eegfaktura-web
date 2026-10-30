import React, {FC, useContext, useRef, useState} from "react";
import {useAppDispatch, useAppSelector} from "../store";
import {ratesSelector, saveNewRate, selectedRateSelector, selectRate, TARIFF_TYPE_ORDER, updateRate} from "../store/rate";
import {useLocale} from "../store/hook/useLocale";
import RateCardComponent from "../components/RateCard.component";
import {
  IonButtons,
  IonContent,
  IonIcon,
  IonMenuButton,
  IonPage,
  IonSearchbar,
  IonToolbar,
  useIonToast
} from "@ionic/react";
import {EegTariff} from "../models/eeg.model";
import cn from "classnames";

import "./Rates.scss"
import {add, chevronDown, chevronForward, search} from "ionicons/icons";
import HeaderFavButtonComponent from "../components/core/HeaderFavButton.component";
import RateDetailPaneComponent from "../components/RateDetailPane.component";
import {selectedTenant} from "../store/eeg";
import {useRateType} from "../store/hook/Rate.provider";
import { get } from "react-hook-form";
import {useTenant} from "../store/hook/Eeg.provider";
import UnsavedChangesGuard, {useConfirmDiscard} from "../components/core/UnsavedChangesGuard.component";
import {ParticipantContext} from "../store/hook/ParticipantProvider";

// group headings: the kinds of the tariff form
const RATE_GROUP_TITLE_KEY: Record<EegTariff["type"] | "OTHER", string> = {
  EEG: "rateGroupMember", EZP: "rateGroupProducer", VZP: "rateGroupConsumer", AKONTO: "rateGroupOther", OTHER: "rateGroupOther"}
// search ignores case and accents, as the sort does („über“ finds „Uberschuss“)
const fold = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase()

const RatesPage: FC = () => {

  const dispatcher = useAppDispatch();
  const selectedTariff = useAppSelector(selectedRateSelector)
  const rates = useAppSelector(ratesSelector)
  const {t} = useLocale("common")
  // collapsed tariff groups, for this visit of the page only: all open by default, so no tariff stays hidden later
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())
  // search in the tariff names, as in the member list; while searching, groups with hits are open
  const [query, setQuery] = useState("")
  // the search bar opens below the toolbar with the magnifier, as in the member list; closing it clears the search
  const [searchActive, setSearchActive] = useState(false)
  // the search bar's debounced ionInput can still fire after the bar is gone: only an open bar sets the query
  const searchOpen = useRef(false)
  const toggleSearch = () => {
    if (searchActive) setQuery("")
    searchOpen.current = !searchActive
    setSearchActive(!searchActive)
  }
  const needle = fold(query.trim())
  const searching = needle.length > 0
  const matches = (r: EegTariff) => !searching || fold(r.name ?? "").includes(needle)
  // the selected tariff always stays visible, also in a collapsed group or outside the hits (e.g. right after saving)
  const isSelected = (r: EegTariff) => r.id === selectedTariff?.id
  // while searching the groups with hits are open; a click then would change the state restored after the search
  const toggleGroup = (type: string) => !searching && setCollapsed(prev => {
    const next = new Set(prev)
    next.has(type) ? next.delete(type) : next.add(type)
    return next
  })
  const {tenant} = useTenant()

  const [showToast] = useIonToast();

  const {setRateType} = useRateType()

  // const [selectedRate, setSelectedRate] = useState<EegTariff|undefined>()

  // useEffect(() => {
  //   if (rates && rates.length > 0 && (!selectedTariff || selectedTariff.id.length === 0)) {
  //     dispatcher(selectRate(rates[0]))
  //   }
  //   return () => {
  //     dispatcher(selectRate(undefined))
  //   }
  // }, [rates])

  // unsaved input in the tariff editor: asks before another tariff replaces it, and before leaving the page
  const [editorDirty, setEditorDirty] = useState(false)
  // a community switch (menu) asks as well
  const {setUnsaved} = useContext(ParticipantContext)
  const onEditorDirtyChange = (dirty: boolean) => {
    setEditorDirty(dirty)
    setUnsaved("tariff", dirty)
  }
  const confirmDiscard = useConfirmDiscard()

  const onSelect = (rate: EegTariff) => {
    // the same tariff again keeps the form as it is
    if (rate.id !== "" && rate.id === selectedTariff?.id) return
    confirmDiscard(editorDirty, () => {
      setRateType(rate.type)
      dispatcher(selectRate(rate))
    })
  }

  const onNew = () => {
    const newRate = {id: '', version: 0, name: '', type: 'EEG', useVat: false, useMeteringPointFee: false} as EegTariff
    onSelect(newRate)
  }

  const onSubmitRateChange = (rate: EegTariff) => {
    if (rate.id.length === 0) {
      if(checkValidName(rate)){
        dispatcher(saveNewRate({ rate, tenant }));
      }
    } else {
      const doubleID = getDuplicateRate(rate);

      if(doubleID === rate.id){
        dispatcher(updateRate({ rate, tenant }));
      }
      else if (checkValidName(rate)) {
        dispatcher(updateRate({ rate, tenant }));
      }
    }
  }

  const getDuplicateRate = (rate: EegTariff) => {
    var found = false;
    var foundRate = null;
    rates.forEach((r) => {
      if (r.name === rate.name) {
        found = true;
        foundRate = r;
      }
    });
    if(found){
      return foundRate!.id;
    }
    return null;
  }
  
  const checkValidName = (rate: EegTariff) => {
    var found = false;
    rates.forEach((r) => {
      if (r.name === rate.name) {
        showToast({
          message:
            "Es existiert bereits ein Tarif mit diesem Namen. Bitte wählen Sie einen anderen Namen.",
          duration: 4500,
          color: "warning",
        });
        found = true;
      }
    });

    if(found){
      return false;
    }
    return true;
  }

  return (
    <IonPage>
      <UnsavedChangesGuard dirty={editorDirty}/>
      <IonContent fullscreen color="eeg">
        <div style={{display: "flex", flexDirection: "row", height: "100vh"}}>
          <div className={"ratePane"} style={{overflowY: "auto"}}>
            <IonToolbar color="eeglight">
              {/* opens the side menu below 992 px, hidden while the menu is shown beside the page (261024-ca9) */}
              <IonButtons slot="start">
                <IonMenuButton/>
              </IonButtons>
              <IonButtons slot="end">
                <HeaderFavButtonComponent icon={search} onClick={toggleSearch}/>
                <HeaderFavButtonComponent icon={add} onClick={() => onNew()}/>
              </IonButtons>
            </IonToolbar>
            {searchActive && (
              <IonToolbar color="eeglight">
                <IonSearchbar
                  placeholder={t("rateSearchPlaceholder")}
                  // gaps left and right, so the field does not stick to the edges
                  style={{"--box-shadow": "none", paddingInlineStart: "16px", paddingInlineEnd: "16px"}}
                  debounce={500}
                  onIonInput={(e) => { if (searchOpen.current) setQuery(e.detail.value ?? "") }}
                ></IonSearchbar>
              </IonToolbar>
            )}
            <div className={"content"}>
            {searching && !rates.some(matches) && <p className="rate-search-empty">{t("rateSearchEmpty")}</p>}
            {/* grouped by kind, headings as in the tariff form; rates come sorted from ratesSelector */}
            {[...TARIFF_TYPE_ORDER, "OTHER"].map(type => {
              // a kind outside the three (none known today) still shows, at the end
              const group = rates.filter(r => type === "OTHER" ? !TARIFF_TYPE_ORDER.includes(r.type) : r.type === type)
                .filter(r => matches(r) || isSelected(r))
              if (group.length === 0) return null
              return (
                <section key={type} className="rate-group">
                  <h3 className="rate-group-title">
                    <button type="button" aria-expanded={searching || !collapsed.has(type)} disabled={searching}
                            onClick={() => toggleGroup(type)}>
                      <IonIcon icon={!searching && collapsed.has(type) ? chevronForward : chevronDown} aria-hidden="true"/>
                      <span>{t(RATE_GROUP_TITLE_KEY[type as EegTariff["type"] | "OTHER"])}</span>
                      <span className="rate-group-count">({group.length})</span>
                    </button>
                  </h3>
                  {group.filter(r => searching || !collapsed.has(type) || isSelected(r)).map((r) => (
                    <div key={r.id} className={cn("rates", {"selected": r.id === selectedTariff?.id})}>
                      <RateCardComponent rate={r} editable={true} onSelect={onSelect}/>
                    </div>
                  ))}
                </section>
              )
            })}
            </div>
          </div>
          <div style={{flexGrow:"1", background: "#EAE7D9"}}>
            {selectedTariff && <RateDetailPaneComponent submitId="change-rate-submit-id" onSubmit={onSubmitRateChange}
                                                             onDirtyChange={onEditorDirtyChange}/>}
          </div>
        </div>
      </IonContent>
    </IonPage>
  )
}

export default RatesPage;