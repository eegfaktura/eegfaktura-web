import React, {FC, useEffect, useState} from "react";
import BarComponent from "../core/Bar.component";
import {activeMeterEnergyArray, useAppSelector} from "../../store";
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
  const [traded, setTraded] = useState<{taken: number, spent: number}>({taken: 0, spent: 0})

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

    meterGroup.forEach((m,i) => {
      if (rates[m.meter.tariff_id]) {
        if (m.utilization === undefined || isNaN(m.utilization)) {
          console.error("Meter has invalid energy values!", i, m)
        } else {
          if (m.meter.direction === "CONSUMPTION") {
            consumerSum += m.utilization
          } else {
            producerSum += m.utilization
          }
        }
      }
    })
    setTraded({taken: consumerSum, spent: producerSum})
  }

  const renderKWH = (kwh:number): string => {
    return `${kwh.toFixed(3)} kWh`
  }

  const getWidth = (basis: number, value: number): number => {
    if (basis === 0) {
      return 0
    }
    return Math.min(100, Math.round((value / basis) * 100))
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
                  <IonContent class="ion-padding">Produktion in der selektierten Periode. Der Balken visualisiert das Verhältnis von "Verteilung in der EEG / Gesamtproduktion"</IonContent>
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
                <div style={{flexBasis: "40%", fontSize: "10px"}}>{renderKWH(preConsumedEnergy)} *)</div>
              </div>
              <div style={{display: "flex", flex: "1", padding: "0px 16px", gap: "10px", alignItems: "center"}}>
                <BarComponent color="#0AF2D3" percentage={getWidth(consumedEnergy, distributedEnergy)}/>
                <div style={{flexBasis: "40%", fontSize: "14px"}}>{renderKWH(consumedEnergy)}</div>
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
            <div style={{borderBottom: "1.5px solid #368060"}}>Energiemengen:</div>
            <div style={{
              display: "flex",
              flexFlow: "column",
              height: "100%",
              padding: "8px",
            }}>
              <div style={{display: "flex", flex: "1", padding: "5px 16px", gap: "10px", alignItems: "center"}}>
                <div style={{flexBasis: "15%"}}>Eingekauft</div>
                <div style={{display: "flex", flexFlow: "column", flex: "1", fontSize: "12px"}}>
                  <div style={{display: "flex", flex: "1", padding: "0px 16px", gap: "10px", alignItems: "center"}}>
                    <BarComponent color="#2B6860" percentage={getWidth(producedEnergy, distributedEnergy)}/>
                    <div style={{flexBasis: "30%"}}>{renderKWH(traded.spent)}</div>
                  </div>
                </div>
              </div>
              <div style={{display: "flex", flex: "1", padding: "5px 16px", gap: "10px", alignItems: "center"}}>
                <div style={{flexBasis: "15%"}}>Verkauft</div>
                <div style={{display: "flex", flexFlow: "column", flex: "1", fontSize: "12px"}}>
                  <div style={{display: "flex", flex: "1", padding: "0px 16px", gap: "10px", alignItems: "center"}}>
                    <BarComponent color="#0AF2D3" percentage={getWidth(consumedEnergy, distributedEnergy)}/>
                    <div style={{flexBasis: "30%"}}>{renderKWH(traded.taken)}</div>
                  </div>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  )
}

export default EnergyOverviewComponent