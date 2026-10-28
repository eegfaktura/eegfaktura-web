import React, {FC} from "react";
import {useAppDispatch, useAppSelector} from "../store";
import {ratesSelector, saveNewRate, selectedRateSelector, selectRate, updateRate} from "../store/rate";
import {TARIFF_TYPE_ORDER} from "../store/rate/selectors/rate.selector";
import RateCardComponent from "../components/RateCard.component";
import {
  IonButton, IonButtons,
  IonContent,
  IonIcon,
  IonPage,
  IonToolbar,
  useIonToast
} from "@ionic/react";
import {EegTariff} from "../models/eeg.model";
import cn from "classnames";

import "./Rates.scss"
import {add} from "ionicons/icons";
import RateDetailPaneComponent from "../components/RateDetailPane.component";
import {selectedTenant} from "../store/eeg";
import {useRateType} from "../store/hook/Rate.provider";
import { get } from "react-hook-form";
import {useTenant} from "../store/hook/Eeg.provider";

const RATE_GROUP_TITLE: Record<string, string> = {EEG: "Mitglied", EZP: "Erzeuger", VZP: "Verbraucher", OTHER: "Sonstige"}

const RatesPage: FC = () => {

  const dispatcher = useAppDispatch();
  const selectedTariff = useAppSelector(selectedRateSelector)
  const rates = useAppSelector(ratesSelector)
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
            {/* grouped by kind, headings as in the tariff form; rates come sorted from ratesSelector */}
            {[...TARIFF_TYPE_ORDER, "OTHER"].map(type => {
              // a kind outside the three (none known today) still shows, at the end
              const group = rates.filter(r => type === "OTHER" ? !TARIFF_TYPE_ORDER.includes(r.type) : r.type === type)
              if (group.length === 0) return null
              return (
                <section key={type} className="rate-group">
                  <h3 className="rate-group-title">{RATE_GROUP_TITLE[type]}</h3>
                  {group.map((r) => (
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