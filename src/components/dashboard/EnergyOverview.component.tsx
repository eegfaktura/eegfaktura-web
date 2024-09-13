import React, {FC, useEffect, useState} from "react";
import BarComponent from "../core/Bar.component";
import {activeMeterEnergyArray, useAppSelector} from "../../store";
import {Metering} from "../../models/meteringpoint.model";
import {PieSeriesType} from "../../pages/Dashbaord.page";
import {EegTariff} from "../../models/eeg.model";
import {selectedPeriodSelector} from "../../store/energy";
import {getPreviousPeriod} from "../../util/Helper.util";
import {IonContent, IonIcon, IonPopover} from "@ionic/react";
import {helpCircleOutline} from "ionicons/icons";
import {Api} from "../../service";
import {useTenant} from "../../store/hook/Eeg.provider";

interface OverviewComponentProps {
  consumed: PieSeriesType
  produced: PieSeriesType
  allocated: PieSeriesType
  rates: Record<string, EegTariff>
}

const EnergyOverviewComponent: FC<OverviewComponentProps> = ({consumed, produced, allocated, rates}) => {

  const meterGroup = useAppSelector(activeMeterEnergyArray)
  const activePeriod = useAppSelector(selectedPeriodSelector)
  // const tenant = useAppSelector(activeTenant)
  const tenant = useTenant()

  // const [producedEnergy, setProducedEnergy] = useState<number>(0)
  // const [consumedEnergy, setConsumedEnergy] = useState<number>(0)
  // const [distributedEnergy, setDistributedEnergy] = useState<number>(0)
  const [preProducedEnergy, setPreProducedEnergy] = useState<number>(0)
  const [preConsumedEnergy, setPreConsumedEnergy] = useState<number>(0)
  const [preDistributedEnergy, setPreDistributedEnergy] = useState<number>(0)
  const [cash, setCash] = useState<{taken: { energy: number, money: number }, spent: { energy: number, money: number }}>({taken: {energy: 0 , money: 0}, spent: {energy: 0, money: 0}})

  const [producedEnergy, consumedEnergy, distributedEnergy] = [produced.value, consumed.value, allocated.value]

  // useEffect(() => {
  //   setProducedEnergy(produced.value)
  //   setConsumedEnergy(consumed.value)
  //   setDistributedEnergy(allocated.value)
  // }, [consumed, produced, allocated]);
  //
  useEffect(() => {
    meterGroup && rates && calculateSummary()
  }, [meterGroup, rates]);

  useEffect(() => {
    if (tenant && activePeriod) {
      const prePeriod = getPreviousPeriod(activePeriod)
      Api.energyService.fetchSummary(tenant, prePeriod.year, prePeriod.segment, prePeriod.type).then((r) => {
        setPreConsumedEnergy(r.consumed)
        setPreDistributedEnergy(r.distributed)
        setPreProducedEnergy(r.produced)
      }).catch(() => {
        setPreConsumedEnergy(0)
        setPreDistributedEnergy(0)
        setPreProducedEnergy(0)
      })
    }
  }, [activePeriod]);

  const calculateSummary = () => {
    let consumerSum = 0
    let producerSum = 0
    let producerCash =0
    let consumerCash = 0

    meterGroup.forEach((m,i) => {
      if (rates[m.meter.tariff_id]) {
        if (isNaN(m.utilization)) {
          console.log("Meter has invalid energy values!", i, m)
        } else {
          if (m.meter.direction === "CONSUMPTION") {
            consumerSum += m.utilization
            consumerCash += meterCash(m.meter, m.utilization)
          } else {
            producerSum += m.utilization
            producerCash += meterCash(m.meter, m.utilization)
          }
        }
      }
    })
    setCash({taken: {energy: consumerSum, money: consumerCash}, spent: {energy: producerSum, money: producerCash}})
  }

  const meterCash = (m: Metering, utilization: number) => {
    const getDiscountFactor = (discount:string | undefined) => {
      const d = discount ? Number(discount) : 0
      return d > 0 ? d / 100 : 1
    }
    if (m.tariff_id) {
      const tariff = rates[m.tariff_id]
      if (tariff && tariff.type) {
        if (tariff.type === "EZP") {
          return (Math.max(utilization * (tariff.centPerKWh || 0), 0) / 100) + Number(tariff.baseFee)
        } else if (tariff.type === 'VZP') {
          return Math.max(utilization - Number(tariff.freeKWh), 0) * (tariff.centPerKWh || 0) / 100 * getDiscountFactor(tariff.discount)
        }
      }
    }
    return 0
  }

  const renderKWH = (kwh:number): string => {
    return `${kwh.toFixed(3)} kWh`
  }

  const renderEuro = (euro: number): string => {
    return `${euro.toFixed(2)} €`
  }

  const getWidth = (basis: number, value: number): number => {
    if (basis === 0) {
      return 0
    }
    return Math.min(100, Math.round((value / basis) * 100))
  }

  const getMoneyColor = () => {
    const c = cash.taken.money - cash.spent.money
    if (c > 0) return "#2B6860"
    else if (c < 0) return "#F20A5E"
    else return "black"
  }

  return (
    <div className="peter" style={{display: "flex", flexFlow: "column", height: "100%", maxHeight: "100%"}}>
      <div className="peter"
           style={{display: "flex", flexFlow: "column", height: "100%", maxHeight: "100%", margin: "20px"}}>
        <div style={{paddingBottom: "20px", fontSize: "20px"}}>Übersicht Stromproduktion und Verteilung</div>
        <div
          style={{display: "flex", flexFlow: "column", height: "100%", margin: "0 20px", flex: "1", flexBasis: "50%"}}>
          <div style={{display: "flex", flex: "1", padding: "5px 16px", gap: "10px", alignItems: "center"}}>
            <div style={{flexBasis: "20%"}}>
              <div style={{display: "flex", gap: "10px", alignItems: "center"}}>
                <div>Produziert</div>
                <IonIcon id="hover-help-producer" icon={helpCircleOutline} />
                <IonPopover trigger="hover-help-producer" triggerAction="hover">
                  <IonContent class="ion-padding">Production in der selektierten Periode. Der Balken visualisiert das Verhältnis von "Verteilung in der EEG / Gesamtproduktion"</IonContent>
                </IonPopover>
              </div>
            </div>
            <div style={{display: "flex", flexFlow: "column", flex: "1"}}>
              <div style={{display: "flex", flex: "1", padding: "0px 16px", gap: "10px", alignItems: "center"}}>
                <BarComponent color="rgba(43, 104, 96, 0.4)" percentage={getWidth(preProducedEnergy, preDistributedEnergy)}/>
                <div style={{flexBasis: "40%", fontSize: "10px"}}>{renderKWH(preProducedEnergy)} *)</div>
              </div>
              <div style={{display: "flex", flex: "1", padding: "0px 16px", gap: "10px", alignItems: "center"}}>
                <BarComponent color="#2B6860" percentage={getWidth(producedEnergy, distributedEnergy)}/>
                <div style={{flexBasis: "40%", fontSize: "14px"}}>{renderKWH(producedEnergy)}</div>
              </div>
            </div>
          </div>
          <div style={{display: "flex", flex: "1", padding: "5px 16px", gap: "10px", alignItems: "center"}}>
            <div style={{flexBasis: "20%"}}>
              <div style={{display: "flex", gap: "10px", alignItems: "center"}}>
                <div>Verteilt</div>
                <IonIcon id="hover-help-consumer" icon={helpCircleOutline}/>
                <IonPopover trigger="hover-help-consumer" triggerAction="hover">
                  <IonContent class="ion-padding">Verteilung in der EEG in der selektierten Periode. Der Balken visualisiert
                    das Verhältnis von "Verteilung in der EEG / Gesamtverbrauch"</IonContent>
                </IonPopover>
              </div>
            </div>
            <div style={{display: "flex", flexFlow: "column", flex: "1"}}>
              <div style={{display: "flex", flex: "1", padding: "0px 16px", gap: "10px", alignItems: "center"}}>
                <BarComponent color="rgba(44, 245, 218, 0.3)"
                              percentage={getWidth(preConsumedEnergy, preDistributedEnergy)}/>
                <div style={{flexBasis: "40%", fontSize: "10px"}}>{renderKWH(preDistributedEnergy)} *)</div>
              </div>
              <div style={{display: "flex", flex: "1", padding: "0px 16px", gap: "10px", alignItems: "center"}}>
                <BarComponent color="#0AF2D3" percentage={getWidth(consumedEnergy, distributedEnergy)}/>
                <div style={{flexBasis: "40%", fontSize: "14px"}}>{renderKWH(distributedEnergy)}</div>
              </div>
            </div>
          </div>
          <div style={{display: "flex", flex: "1", padding: "5px 16px", gap: "10px", alignItems: "center"}}>
            <div style={{flexBasis: "20%"}}>
              <div style={{display: "flex", gap: "10px", alignItems: "center"}}>
                <div>EVU</div>
                <IonIcon id="hover-help-evu" icon={helpCircleOutline}/>
                <IonPopover trigger="hover-help-evu" triggerAction="hover">
                  <IonContent class="ion-padding">Nicht verbrauchte Energie, welche an die EVU weitergegeben wird.
                    Der Balken visualisiert
                    das Verhältnis von "Gesamtverbrauch - Verteilung in der EEG / Gesamtverbrauch"</IonContent>
                </IonPopover>
              </div>
            </div>
            <div style={{display: "flex", flexFlow: "column", flex: "1"}}>
              <div style={{display: "flex", flex: "1", padding: "0px 16px", gap: "10px", alignItems: "center"}}>
                <BarComponent color="#F20A5E"
                              percentage={getWidth(producedEnergy, producedEnergy - distributedEnergy)}/>
                <div style={{
                  flexBasis: "40%",
                  fontSize: "14px"
                }}>{renderKWH(Math.max(0, producedEnergy - distributedEnergy))}</div>
              </div>
            </div>
          </div>
          <div style={{fontSize: "10px"}}>*) vorherige Periode</div>
        </div>
        <div style={{display: "flex", flexFlow: "column", height: "100%", margin: "8px", flex: "1", flexBasis: "30%"}}>
          <div style={{display: "flex", flexFlow: "column", height: "100%", background: "#EAE7D9", padding: "8px"}}>
            <div style={{borderBottom: "1.5px solid #368060"}}>Finanzen:</div>
            <div style={{
              display: "flex",
              flexFlow: "column",
              height: "100%",
              padding: "8px",
              borderBottom: "1px solid #368060"
            }}>
              <div style={{display: "flex", flex: "1", padding: "5px 16px", gap: "10px", alignItems: "center"}}>
                <div style={{flexBasis: "15%"}}>Eingekauft</div>
                <div style={{display: "flex", flexFlow: "column", flex: "1", fontSize: "12px"}}>
                  <div style={{display: "flex", flex: "1", padding: "0px 16px", gap: "10px", alignItems: "center"}}>
                    <BarComponent color="#2B6860" percentage={getWidth(producedEnergy, distributedEnergy)}/>
                    <div style={{flexBasis: "30%"}}>{renderKWH(cash.spent.energy)}</div>
                    <div style={{flexBasis: "30%"}}>{renderEuro(cash.spent.money)}</div>
                  </div>
                </div>
              </div>
              <div style={{display: "flex", flex: "1", padding: "5px 16px", gap: "10px", alignItems: "center"}}>
                <div style={{flexBasis: "15%"}}>Verkauft</div>
                <div style={{display: "flex", flexFlow: "column", flex: "1", fontSize: "12px"}}>
                  <div style={{display: "flex", flex: "1", padding: "0px 16px", gap: "10px", alignItems: "center"}}>
                    <BarComponent color="#0AF2D3" percentage={getWidth(consumedEnergy, distributedEnergy)}/>
                    <div style={{flexBasis: "30%"}}>{renderKWH(cash.taken.energy)}</div>
                    <div style={{flexBasis: "30%"}}>{renderEuro(cash.taken.money)}</div>
                  </div>
                </div>
              </div>
            </div>
            <div style={{
              display: "flex",
              flexFlow: "column",
              height: "100%",
              padding: "8px",
            }}>
              <div style={{
                display: "flex",
                flex: "1",
                padding: "5px 16px",
                gap: "10px",
                alignItems: "center",
                justifyContent: "space-between"
              }}>
                <div style={{flexBasis: "15%"}}>Marge EEG</div>
                <div style={{flexBasis: "15%", fontSize: "14px", color: getMoneyColor()}}>{renderEuro(cash.taken.money - cash.spent.money)}</div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  )
}

export default EnergyOverviewComponent