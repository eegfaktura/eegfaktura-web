import React, {FC, useState} from "react";
import {useAppDispatch, useAppSelector} from "../store";
import {ratesSelector, saveNewRate, selectedRateSelector, selectRate, TARIFF_TYPE_ORDER, updateRate} from "../store/rate";
import {useLocale} from "../store/hook/useLocale";
import RateCardComponent from "../components/RateCard.component";
import {
  IonButton, IonButtons,
  IonContent,
  IonIcon,
  IonPage,
  IonSearchbar,
  IonToolbar,
  useIonToast
} from "@ionic/react";
import {EegTariff} from "../models/eeg.model";
import cn from "classnames";

import "./Rates.scss"
import {add, chevronDown, chevronForward} from "ionicons/icons";
import RateDetailPaneComponent from "../components/RateDetailPane.component";
import {selectedTenant} from "../store/eeg";
import {useRateType} from "../store/hook/Rate.provider";
import { get } from "react-hook-form";
import {useTenant} from "../store/hook/Eeg.provider";

// group headings: the kinds of the tariff form
const RATE_GROUP_TITLE_KEY: Record<string, string> = {EEG: "rateGroupMember", EZP: "rateGroupProducer", VZP: "rateGroupConsumer", OTHER: "rateGroupOther"}

const RatesPage: FC = () => {

  const dispatcher = useAppDispatch();
  const selectedTariff = useAppSelector(selectedRateSelector)
  const rates = useAppSelector(ratesSelector)
  const {t} = useLocale("common")
  // collapsed tariff groups, for this visit of the page only: all open by default, so no tariff stays hidden later
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set())
  // search in the tariff names, as in the member list; while searching, groups with hits are open
  const [query, setQuery] = useState("")
  const searching = query.trim().length > 0
  const matches = (r: EegTariff) => !searching || (r.name ?? "").toLowerCase().includes(query.trim().toLowerCase())
  const toggleGroup = (type: string) => setCollapsed(prev => {
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

  const onSelect = (rate: EegTariff) => {
    setRateType(rate.type)
    dispatcher(selectRate(rate))
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
      <IonContent fullscreen color="eeg">
        <div style={{display: "flex", flexDirection: "row", height: "100vh"}}>
          <div className={"ratePane"} style={{overflowY: "auto"}}>
            <IonToolbar color="eeg">
              <IonSearchbar
                placeholder="Tarif suchen"
                // left gap as the plus button's 16px on the right
                style={{"--box-shadow": "undefined", paddingInlineStart: "16px"}}
                debounce={500}
                onIonInput={(e) => setQuery(e.detail.value ?? "")}
              ></IonSearchbar>
              <IonButtons slot="end">
                <IonButton
                  color="primary"
                  shape="round"
                  fill={"solid"}
                  style={{"--border-radius": "50%", width:"36px", height: "36px", marginRight: "16px"}}
                onClick={() => onNew()}>
                  <IonIcon slot="icon-only" icon={add}></IonIcon>
                </IonButton>
              </IonButtons>
            </IonToolbar>
            <div className={"content"}>
            {searching && !rates.some(matches) && <p className="rate-search-empty">Kein Tarif gefunden.</p>}
            {/* grouped by kind, headings as in the tariff form; rates come sorted from ratesSelector */}
            {[...TARIFF_TYPE_ORDER, "OTHER"].map(type => {
              // a kind outside the three (none known today) still shows, at the end
              const group = rates.filter(r => type === "OTHER" ? !TARIFF_TYPE_ORDER.includes(r.type) : r.type === type)
                .filter(matches)
              if (group.length === 0) return null
              return (
                <section key={type} className="rate-group">
                  <h3 className="rate-group-title">
                    <button type="button" aria-expanded={searching || !collapsed.has(type)} onClick={() => toggleGroup(type)}>
                      <IonIcon icon={!searching && collapsed.has(type) ? chevronForward : chevronDown} aria-hidden="true"/>
                      <span>{t(RATE_GROUP_TITLE_KEY[type])}</span>
                      <span className="rate-group-count">({group.length})</span>
                    </button>
                  </h3>
                  {(searching || !collapsed.has(type)) && group.map((r) => (
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
            {selectedTariff && <RateDetailPaneComponent submitId="change-rate-submit-id" onSubmit={onSubmitRateChange} />}
          </div>
        </div>
      </IonContent>
    </IonPage>
  )
}

export default RatesPage;