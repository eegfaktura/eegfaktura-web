import React, {FC} from "react";
import {EegTariff} from "../models/eeg.model";
import {IonCard, IonCardContent, IonCol, IonGrid, IonIcon, IonLabel, IonRow} from "@ionic/react";
import {bug, person} from "ionicons/icons";
import {eegPlug, eegSolar} from "../eegIcons";
import {useLocale} from "../store/hook/useLocale";

interface RateCardComponentProps {
  rate: EegTariff;
  editable?: boolean;
  onSelect?: (rate: EegTariff) => void;
}

const RateCardComponent: FC<RateCardComponentProps> = ({rate, editable, onSelect}) => {
  const {t} = useLocale("common")
  const defineIcon = (type: string) => {
    switch (type) {
      case "EEG":
        return person;
      case "EZP":
        return eegSolar;
      case "VZP":
        return eegPlug;
      default:
        return bug;
    }
  }

  const onShowDetails = (e: React.MouseEvent<HTMLIonCardElement, MouseEvent>) => {
    e.preventDefault();
    // history.push(`/rates/edit/${rate.id}`)

    onSelect && onSelect(rate)
  }

  const isAvailable = (value?: number): boolean => {
    return !(!!value && value > 0);
  }

  const priceLabel = (v?: number): string => v !== undefined && v !== null
    ? (v.toString().replace(".", ",") + " Cent") : ""

  // ZVT: Basispreis + aktive Zeitfenster (Name/Von-Bis/Preis) statt des
  // einen Arbeitspreises. Kompakte Read-Darstellung in der Tarif-Karte.
  const renderTimeTariffLines = (rate: EegTariff) => {
    const windowLine = (n: 1 | 2) => {
      const active = n === 1 ? rate.timeTariff1Active : rate.timeTariff2Active
      if (!active) return null
      const name = n === 1 ? rate.timeTariff1Name : rate.timeTariff2Name
      const from = n === 1 ? rate.timeTariff1From : rate.timeTariff2From
      const to = n === 1 ? rate.timeTariff1To : rate.timeTariff2To
      const price = n === 1 ? rate.timeTariff1CentPerKWh : rate.timeTariff2CentPerKWh
      const label = (name && name.trim().length > 0 ? name.trim() + " " : "") + `(${from} - ${to})`
      return (
        <div key={n} style={{display: "flex", flexDirection: "row", justifyContent: "space-between"}}>
          <p>{label}</p>
          <p>{priceLabel(price)}</p>
        </div>
      )
    }
    return (
      <>
        <div style={{display: "flex", flexDirection: "row", justifyContent: "space-between"}}>
          <p>{t("zvt.basePrice_card")}</p>
          <p>{priceLabel(rate.centPerKWh)}</p>
        </div>
        {windowLine(1)}
        {windowLine(2)}
      </>
    )
  }

  const RateCardType = (rate: EegTariff) => {
    switch (rate.type) {
      case "EEG":
        return (
          <div>
            <div style={{display: "flex", flexDirection: "row", justifyContent: "space-between"}}>
              <p>{t("participantFee_card")}</p>
              <p>{(Number(rate.participantFee)) + " €"}</p>
            </div>
            {rate.useVat && (<div style={{display: "flex", flexDirection: "row", justifyContent: "space-between"}}>
                <p>{t('vatInPercent_card')}</p>
                <p>{(rate.vatInPercent != null && String(rate.vatInPercent).length > 0 ? rate.vatInPercent : "0") + " %"}</p>
            </div>)}
            {!!rate.discount && <div style={{display: "flex", flexDirection: "row", justifyContent: "space-between"}}>
              <p>{t('discount_card')}</p>
              <p>{rate.discount + " %"}</p>
            </div>}
          </div>
        )
      case "VZP":
        return (
          <div>
            {rate.useTimeTariff
              ? renderTimeTariffLines(rate)
              : <div style={{display: "flex", flexDirection: "row", justifyContent: "space-between"}}>
                  <p>{t("centPerKWh_card")}</p>
                  <p>{rate.centPerKWh ? (rate.centPerKWh.toString().replace(".", ",") + " Cent") : ''}</p>
                </div>}
            {rate.useVat && <div style={{display: "flex", flexDirection: "row", justifyContent: "space-between"}}>
                <p>{t('vatInPercent_card')}</p>
                <p>{(rate.vatInPercent != null && String(rate.vatInPercent).length > 0 ? rate.vatInPercent : "0") + " %"}</p>
            </div>}
            {rate.useMeteringPointFee && <div style={{display: "flex", flexDirection: "row", justifyContent: "space-between"}}>
                <p>{t('meteringPointFee_card')}</p>
                <p>{rate.meteringPointFee + " €"}</p>
            </div>}
            {!rate.useTimeTariff && !!rate.freeKWh && <div style={{display: "flex", flexDirection: "row", justifyContent: "space-between"}}>
              <p>{t('freeKWh_card')}</p>
              <p>{rate.freeKWh + " kWh"}</p>
            </div>}
            {!!rate.discount && <div style={{display: "flex", flexDirection: "row", justifyContent: "space-between"}}>
              <p>{t('discount_card')}</p>
              <p>{rate.discount + " %"}</p>
            </div>}
          </div>
        )
      case "EZP":
        return (
          <div>
            {rate.useTimeTariff
              ? renderTimeTariffLines(rate)
              : <div style={{display: "flex", flexDirection: "row", justifyContent: "space-between"}}>
                  <p>{t("centPerKWh_card")}</p>
                  <p>{rate.centPerKWh ? (rate.centPerKWh.toString().replace(".", ",") + " Cent") : ''}</p>
                </div>}
            {rate.useVat && <div style={{display: "flex", flexDirection: "row", justifyContent: "space-between"}}>
                <p>{t('vatInPercent_card')}</p>
                <p>{(rate.vatInPercent != null && String(rate.vatInPercent).length > 0 ? rate.vatInPercent : "0") + " %"}</p>
            </div>}
            {rate.useMeteringPointFee && <div style={{display: "flex", flexDirection: "row", justifyContent: "space-between"}}>
                <p>{t('meteringPointFee_card')}</p>
                <p>{rate.meteringPointFee + " €"}</p>
            </div>}
          </div>
        )
    }
  }

  return (
    <IonCard color="eeglight" onClick={editable ? onShowDetails : undefined}>
      <IonCardContent>
        <IonGrid>
          <IonRow>
            <IonCol size="auto">
              <div style={{paddingTop: "5px", display: "flex", fontSize: "20px"}}>
                <IonIcon icon={defineIcon(rate.type)}></IonIcon>
              </div>
            </IonCol>
            <IonCol>
              <IonLabel>
                <h2><b>{rate.name}</b></h2>
                {RateCardType(rate)}
              </IonLabel>
            </IonCol>
          </IonRow>
        </IonGrid>
      </IonCardContent>
    </IonCard>
  )
}

export default RateCardComponent;