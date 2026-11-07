import React, {FC,  useMemo} from "react";
import {EegTariff} from "../../models/eeg.model";
import {useAppSelector} from "../../store";
import {allParticipantsSelector} from "../../store/participant";
import {countMemberActivity, countMemberFees} from "../../util/MemberActivity.util";
import {countInactiveMeters, countMetersToday} from "../../util/MeterCount.util";
import {useHasBilling} from "../../store/hook/Eeg.provider";

interface EegOverviewComponentProps {
  rateMap: Record<string, EegTariff>
}

const EegOverviewComponent: FC<EegOverviewComponentProps> = ({rateMap}) => {

  // const [participantCount, setParticipantCount] = useState<number>(0)
  // const [consumerCount, setConsumerCount] = useState<number>(0)
  // const [producerCount, setProducerCount] = useState<number>(0)
  // const [tariffUsage, setTariffUssage] = useState<Record<string, number>>({})


  // platform#165: members counted by the current state of their metering points, over all members (not only the
  // ones of the selected period): active = at least one active metering point
  const allParticipants = useAppSelector(allParticipantsSelector)
  const billing = useHasBilling()
  const members = useMemo(() => countMemberActivity(allParticipants), [allParticipants])
  // platform#223: membership fees of the active members, same basis as the member count above
  const memberFees = useMemo(() => countMemberFees(allParticipants), [allParticipants])
  // platform#228: was a fixed „0 inaktive“; counted over all members like the member counts (state today)
  const inactiveMeters = useMemo(() => countInactiveMeters(allParticipants), [allParticipants])

  // platform#211: each metering point once, with the tariff of its current participation; state today over all members
  // like the counts above (the card shows no period)
  const meters = useMemo(() => countMetersToday(allParticipants, Object.keys(rateMap)), [allParticipants, rateMap])
  const tariffUsage = meters.tariffs


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

  // a count list: name left, number right-aligned
  const countList = (rows: [string, string, number][]) => (
    <div style={{display: "grid", gridTemplateColumns: "1fr auto", gap: "6px 24px", maxWidth: "440px"}}>
      {rows.map(([key, name, count]) => (
        <React.Fragment key={key}>
          <div>{name}</div>
          <div style={{textAlign: "right", fontVariantNumeric: "tabular-nums"}}>{count}</div>
        </React.Fragment>
      ))}
    </div>
  )
  const energyTariffs: [string, string, number][] = Object.entries(tariffUsage)
    .filter(([id, c]) => c > 0 && rateMap[id]).map(([id, c]) => [id, rateMap[id].name, c])
  const feeTariffs: [string, string, number][] = [
    ...Object.entries(memberFees.tariffs).filter(([id]) => rateMap[id])
      .map(([id, c]) => [`fee-${id}`, rateMap[id].name, c] as [string, string, number]),
    ...(memberFees.withoutFee > 0 ? [["fee-none", "ohne Mitgliedsbeitrag", memberFees.withoutFee] as [string, string, number]] : []),
  ]

  const row = {display: "grid", gridTemplateColumns: "minmax(110px, 30%) 1fr", gap: "4px 16px", padding: "10px 16px",
    alignItems: "baseline"}
  const values = {display: "flex", flexWrap: "wrap", gap: "4px 24px"} as const
  const minor = {fontSize: "14px", color: "var(--ion-color-medium-shade)"}

  return (
    <div className="peter" style={{display: "flex", flexFlow: "column", height: "100%", maxHeight: "100%"}}>
      <div className="peter"
           style={{display: "flex", flexFlow: "column", height: "100%", maxHeight: "100%", margin: "20px"}}>
        <div style={{paddingBottom: "16px"}}>
          <div style={{fontSize: "20px"}}>Übersicht EEG</div>
          <div style={{fontSize: "14px"}}>Stand heute</div>
        </div>
        <div style={{display: "flex", flexFlow: "column", margin: "0 20px", flex: "1", background: "white"}}>
          <div style={row}>
            <div>Mitglieder</div>
            <div style={values}>
              <span>{members.ACTIVE} aktive</span>
              <span>{members.INACTIVE} inaktive</span>
              {members.PENDING > 0 && <span>{members.PENDING} in Anmeldung</span>}
            </div>
          </div>
          <div style={row}>
            <div>Zählpunkte</div>
            <div>
              <div style={values}>
                <span>{meters.consumers + meters.producers} aktive</span>
                <span>{inactiveMeters} inaktive</span>
                {meters.registering > 0 && <span>{meters.registering} in Anmeldung</span>}
              </div>
              <div style={{...values, ...minor, paddingTop: "4px"}}>
                <span>{meters.consumers} Abnehmer</span>
                <span>{meters.producers} Einspeiser</span>
              </div>
            </div>
          </div>
          {/* no tariffs without billing (P2P, EVA; platform#229) */}
          {billing && <div style={row}>
            <div>Tarife</div>
            <div style={{display: "flex", flexFlow: "column", gap: "12px"}}>
              {energyTariffs.length > 0 && <div>
                <div style={{...minor, paddingBottom: "4px"}}>Energietarife (aktive Zählpunkte)</div>
                {countList(energyTariffs)}
              </div>}
              {feeTariffs.length > 0 && <div>
                <div style={{...minor, paddingBottom: "4px"}}>Mitgliedsbeitrag (aktive Mitglieder)</div>
                {countList(feeTariffs)}
              </div>}
            </div>
          </div>}
        </div>
      </div>
    </div>
  )
}

export default EegOverviewComponent