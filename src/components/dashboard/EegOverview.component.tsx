import React, {FC,  useMemo} from "react";
import {EegParticipant} from "../../models/members.model";
import {EegTariff} from "../../models/eeg.model";
import {useAppSelector} from "../../store";
import {allParticipantsSelector} from "../../store/participant";
import {selectedPeriodSelector} from "../../store/energy";
import {periodDisplayString} from "../../util/Helper.util";
import {countMemberActivity, countMemberFees} from "../../util/MemberActivity.util";
import {countMeters} from "../../util/MeterCount.util";

interface EegOverviewComponentProps {
  participants: EegParticipant[]
  rateMap: Record<string, EegTariff>
}

const EegOverviewComponent: FC<EegOverviewComponentProps> = ({participants, rateMap}) => {

  // const [participantCount, setParticipantCount] = useState<number>(0)
  // const [consumerCount, setConsumerCount] = useState<number>(0)
  // const [producerCount, setProducerCount] = useState<number>(0)
  // const [tariffUsage, setTariffUssage] = useState<Record<string, number>>({})


  // platform#165: members counted by the current state of their metering points, over all members (not only the
  // ones of the selected period): active = at least one active metering point
  const allParticipants = useAppSelector(allParticipantsSelector)
  const activePeriod = useAppSelector(selectedPeriodSelector)
  const members = useMemo(() => countMemberActivity(allParticipants), [allParticipants])
  // platform#223: membership fees of the active members, same basis as the member count above
  const memberFees = useMemo(() => countMemberFees(allParticipants), [allParticipants])

  // platform#211: each metering point once, with the tariff of its current participation
  const [consumerCount, producerCount, tariffUsage] = useMemo(() => {
    const s = countMeters(participants, Object.keys(rateMap))
    return [s.consumers, s.producers, s.tariffs] as const
  }, [participants, rateMap])


  // useEffect(() => {
  //   const defaultRateCount: Record<string, number> = Object.keys(rateMap).reduce((o, v) => {
  //     return {...o, [v]: 0}
  //   }, {} as Record<string, number>)
  //
  //   const s = participants.reduce((r, p) => {
  //     r.p += 1
  //     p.meters.forEach(m => {
  //       m.direction === 'CONSUMPTION' ? r.c += 1 : r.pp += 1
  //       if (m.tariff_id) {
  //         r.t[m.tariff_id] = r.t[m.tariff_id] + 1
  //       }
  //     })
  //     return r
  //   }, {p: 0, c: 0, pp: 0, t: defaultRateCount})
  //   setConsumerCount(s.c)
  //   setProducerCount(s.pp)
  //   setParticipantCount(s.p)
  //   setTariffUssage(s.t)
  // }, [participants])

  const renderTariffUsage = (tariff: Record<string, number>) => {
    // let consumerCount = 0
    // let producerCount = 0
    // Object.entries(tariff).forEach(t => {
    //   const [tariffId, count] = t
    //   if (rateMap[tariffId]) {
    //     if (rateMap[tariffId].type === "EZP") producerCount += 1
    //     else if (rateMap[tariffId].type === "VZP") consumerCount += 1
    //   }
    // })
    //
    // return (
    //   <div>
    //     Tarife
    //     <div> für Consumer {consumerCount}</div>
    //     <div> für Produzenten {producerCount}</div>
    //   </div>
    // )

    return (
      <div style={{display: "flex", flex: "1", flexFlow: "column", padding: "10px 16px", gap: "10px"}}>
        { Object.entries(tariff).filter(([id, c]) => c > 0).map(([tariffId, count], i) => {
          const tariff = rateMap[tariffId]
          if (!tariff) return (<div key={i}></div>)
          return (
            <div key={i} style={{display: "flex", flexFlow: "row", flex: "1"}}>
              <div style={{flexBasis: "50%"}}>{tariff.name}</div>
              <div style={{flexBasis: "50%"}}>{count}</div>
            </div>
          )
        })

        }
        { Object.entries(memberFees.tariffs).map(([tariffId, count], i) => {
          const tariff = rateMap[tariffId]
          if (!tariff) return (<div key={`fee-${i}`}></div>)
          return (
            <div key={`fee-${i}`} style={{display: "flex", flexFlow: "row", flex: "1"}}>
              <div style={{flexBasis: "50%"}}>{tariff.name}</div>
              <div style={{flexBasis: "50%"}}>{count}</div>
            </div>
          )
        })}
        { memberFees.withoutFee > 0 && (
          <div style={{display: "flex", flexFlow: "row", flex: "1"}}>
            <div style={{flexBasis: "50%"}}>ohne Mitgliedsbeitrag</div>
            <div style={{flexBasis: "50%"}}>{memberFees.withoutFee}</div>
          </div>
        )}
      </div>
    )
  }

  return (
    <div className="peter" style={{display: "flex", flexFlow: "column", height: "100%", maxHeight: "100%"}}>
      <div className="peter"
           style={{display: "flex", flexFlow: "column", height: "100%", maxHeight: "100%", margin: "20px"}}>
        <div style={{paddingBottom: "20px"}}>
          <div style={{fontSize: "20px"}}>Übersicht EEG</div>
          {activePeriod && <div style={{fontSize: "14px"}}>Zeitraum: {periodDisplayString(activePeriod)}</div>}
        </div>
        <div
          style={{
            display: "flex",
            flexFlow: "column",
            height: "100%",
            margin: "0 20px",
            flex: "1",
            flexBasis: "50%",
            background: "white"
          }}>
          <div>
            <div style={{display: "flex", flex: "1", padding: "5px 16px", gap: "10px", alignItems: "center"}}>
              <div style={{flexBasis: "50%"}}>Mitglieder <span style={{fontSize: "12px"}}>(Stand heute)</span></div>
              <div style={{display: "flex", flexFlow: "row", flex: "1"}}>
                <div style={{display: "flex", flex: "1", padding: "0px 16px", gap: "10px", alignItems: "center"}}>
                  <span>{members.ACTIVE} aktive</span>
                </div>
                <div style={{display: "flex", flex: "1", padding: "0px 16px", gap: "10px", alignItems: "center"}}>
                  {members.INACTIVE} inaktive{members.PENDING > 0 ? `, ${members.PENDING} in Anmeldung` : ""}
                </div>
              </div>
            </div>
            <div style={{display: "flex", flex: "1", padding: "5px 16px", gap: "10px"}}>
              <div style={{flexBasis: "50%"}}>Zählpunkte</div>
              <div style={{display: "flex", flexFlow: "column", flex: "1"}}>
                <div style={{display: "flex", flexFlow: "row", flex: "1"}}>
                  <div style={{display: "flex", flex: "1", padding: "0px 16px", gap: "10px", alignItems: "center"}}>
                    {consumerCount + producerCount} aktive
                  </div>
                  <div style={{display: "flex", flex: "1", padding: "0px 16px", gap: "10px", alignItems: "center"}}>
                    0 inaktive
                  </div>
                </div>
                <div style={{
                  padding: "5px 16px",
                  gap: "10px",
                  alignItems: "center",
                  fontSize: "14px"
                }}>{consumerCount} Abnehmer
                </div>
                <div style={{
                  padding: "5px 16px",
                  gap: "10px",
                  alignItems: "center",
                  fontSize: "14px"
                }}>{producerCount} Einspeiser
                </div>
              </div>
            </div>
            <div style={{display: "flex", flex: "1", padding: "15px 16px", gap: "10px", flexFlow: "column"}}>
              <div style={{flexBasis: "20%"}}>Tarife</div>
              <div style={{display: "flex", flexFlow: "row", flex: "1"}}>
                {renderTariffUsage(tariffUsage)}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    // <div>
    //   <div>participants {participantCount}</div>
    //   <div>consumers {consumerCount}</div>
    //   <div>producers {producerCount}</div>
    //   {renderTariffUssage(tariffUsage)}
    // </div>
  )
}

export default EegOverviewComponent