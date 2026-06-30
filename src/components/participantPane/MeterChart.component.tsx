import React, {FC, useEffect, useState} from "react";
import MeterChartNavbarComponent from "./MeterChartNavbar.component";
import {Bar, BarChart, CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis} from "recharts";
import {
  EnergySeries,
  MeterEnergySeries,
  MeterReport,
  ParticipantReport,
  RawDataResult,
  SelectedPeriod
} from "../../models/energy.model";
import {calcXAxisName, dayOfYearToDate} from "../../util/Helper.util";
import {Metering} from "../../models/meteringpoint.model";
import {EegParticipant} from "../../models/members.model";
import {transformMeterReportToEnergySeries} from "../../util/ReportHelper";
import {Api} from "../../service";
import {ActiveTenant} from "../../models/eeg.model";

interface MeterChartComponentProps {
  tenant: ActiveTenant
  report: MeterEnergySeries
  activePeriod: SelectedPeriod
  selectedMeter: Metering
  selectedParticipant: EegParticipant
}

const MeterChartComponent: FC<MeterChartComponentProps> = ({tenant, report, activePeriod, selectedMeter, selectedParticipant}) => {

  const [activeEnergySeries, setActiveEnergySeries] = useState<MeterEnergySeries>(report)

  useEffect(() => {
    setActiveEnergySeries(report)
  }, [report]);

  // useIonViewWillEnter( () => {
  //   return false
  // })

  const transformRawToEnergySeries = (raw: RawDataResult): EnergySeries[] => {
    // 96 × 15-min slots, indexed 0..95 by minutes-of-day. Missing slots stay 0.
    const slots: EnergySeries[] = Array.from({length: 96}, (_, i) => ({
      segmentIdx: i, allocated: 0, consumed: 0
    }))
    raw.data.forEach(d => {
      const date = new Date(d.ts)
      const slot = date.getHours() * 4 + Math.floor(date.getMinutes() / 15)
      if (slot < 0 || slot > 95) return
      if (raw.direction === 'CONSUMPTION') {
        // value = [Consumed, Allocated, Distributed] → allocated=Distributed (EEG), consumed=Consumed-Distributed (EVU)
        const consumed = d.value[0] ?? 0
        const distributed = d.value[2] ?? 0
        slots[slot].allocated = distributed
        slots[slot].consumed = Math.max(0, consumed - distributed)
      } else {
        // value = [Produced, Allocation] → allocated=Produced-Allocation (eigen/extern), consumed=Allocation (an EEG)
        const produced = d.value[0] ?? 0
        const allocation = d.value[1] ?? 0
        slots[slot].allocated = Math.max(0, produced - allocation)
        slots[slot].consumed = allocation
      }
    })
    return slots
  }

  const fetchDaySeries = async (selectedPeriod: SelectedPeriod): Promise<MeterEnergySeries> => {
    const dayStart = dayOfYearToDate(selectedPeriod.year, selectedPeriod.segment)
    dayStart.setHours(0, 0, 0, 0)
    const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000 - 1)
    const raw = await Api.energyService.fetchRawV2(tenant, dayStart.getTime(), dayEnd.getTime(),
      [selectedMeter.meteringPoint])
    const meterRaw = raw[selectedMeter.meteringPoint]
    const series = meterRaw ? transformRawToEnergySeries(meterRaw) :
      Array.from({length: 96}, (_, i) => ({segmentIdx: i, allocated: 0, consumed: 0} as EnergySeries))
    return {series, period: selectedPeriod}
  }

  const updateSeries = async (selectedPeriod: SelectedPeriod): Promise<MeterEnergySeries> => {
    if (!selectedParticipant || !selectedMeter) return activeEnergySeries
    if (selectedPeriod.type === 'D') {
      return fetchDaySeries(selectedPeriod)
    }
    return Api.energyService.fetchReportV2(tenant, selectedPeriod.year, selectedPeriod.segment, selectedPeriod.type,
      [{
        participantId: selectedParticipant.id,
        meters: [
          {
            meterId: selectedMeter.meteringPoint,
            meterDir: selectedMeter.direction,
            from: selectedMeter.participantState
              ? new Date(selectedMeter.participantState.activeSince).getTime()
              : new Date().getTime(),
            until: selectedMeter.participantState
              ? new Date(selectedMeter.participantState.inactiveSince).getTime()
              : new Date().getTime(),
          } as MeterReport]
      } as ParticipantReport])
      .then(res => {
        if (res.participantReports.length !== 1) {
          throw new Error("Keine Daten gefunden")
        }
        return res.participantReports[0]
      })
      .then(rep => transformMeterReportToEnergySeries(rep.meters[0]))
      .then(s => ({series: s, period: selectedPeriod} as MeterEnergySeries))
  }


  const onMeterPeriodSelectionChanged = (selectedPeriod: SelectedPeriod) => {
    updateSeries(selectedPeriod).then(r => setActiveEnergySeries(r))
  }

  return (
    // activePeriod && activeEnergySeries && activeEnergySeries.series && activeEnergySeries.series.length > 0 &&
    <div>
      <div style={{marginLeft: "20px"}}>
        <h4>Energiedaten</h4>
        <MeterChartNavbarComponent
          activePeriod={activePeriod}
          selectedMeterId={selectedMeter.meteringPoint}
          onSelectionChanged={onMeterPeriodSelectionChanged}/>
      </div>
      <div style={{height: "200px", width: "100%"}}>
        <ResponsiveContainer width="90%" height={200}>
          {activeEnergySeries.period.type === 'D' ? (
            <LineChart
              data={activeEnergySeries.series.map((e) => ({
                name: calcXAxisName(e.segmentIdx, activeEnergySeries.period),
                distributed: e.allocated,
                consumed: e.consumed
              }))}
              margin={{top: 5, right: 30, left: 20, bottom: 5}}
            >
              <CartesianGrid strokeDasharray="3 3"/>
              <XAxis dataKey="name" interval={6} fontSize={10}/>
              <YAxis fontSize={10} unit={" kWh"}/>
              <Tooltip formatter={(value) => Number(value).toFixed(3) + " kWh"}/>
              <Legend/>
              <Line name="EEG" type="monotone" dataKey="distributed" stroke="#82ca9d" dot={false} strokeWidth={2}/>
              <Line name="EVU" type="monotone" dataKey="consumed" stroke="#8884d8" dot={false} strokeWidth={2}/>
            </LineChart>
          ) : (
            <BarChart
              width={500}
              height={300}
              data={activeEnergySeries.series.map((e) => ({
                name: calcXAxisName(e.segmentIdx, activeEnergySeries.period),
                distributed: e.allocated,
                consumed: e.consumed
              }))}
              margin={{top: 5, right: 30, left: 20, bottom: 5}}
              barCategoryGap={0}
              barGap={1}
            >
              <CartesianGrid strokeDasharray="3 3"/>
              <XAxis dataKey="name"/>
              <YAxis fontSize={10} unit={" kWh"}/>
              <Tooltip formatter={(value) => Number(value).toFixed(3) + " kWh"}/>
              <Legend/>
              <Bar name="EEG" dataKey="distributed" fill="#82ca9d"/>
              <Bar name="EVU" dataKey="consumed" fill="#8884d8"/>
            </BarChart>
          )}
        </ResponsiveContainer>
      </div>
    </div>
  )
}

export default MeterChartComponent