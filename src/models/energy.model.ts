export interface EnergyMeta {
  sourceIdx: number
  name: string
  period_start: string
  period_end: string
  dir: "GENERATION" | "CONSUMPTION"
}

export interface EnergyReport {
  id: string
  allocated: number[]
  consumed: number[]
  produced: number[]
  distributed: number[]
  total_produced: number
}

export interface EnergyReportModel {
  report: EnergyReport
  meta: EnergyMeta[]
  intermediateReportResults: EnergyReport[]
}

export interface EegEnergyReport {
  eeg: EnergyReportModel
}

export interface Record {
  consumption: number // Consumption total energy consumption - value for CONSUMER
  utilization: number // Utilization energy used from the EEG  - value for CONSUMER
  allocation: number  // Allocation calculated energy value that can be allocated to all participants - value for CONSUMER / GENERATOR
  production: number  // Production total value of energy production
}

export interface RecordV2 {
  consumed: number // Consumption total energy consumption - value for CONSUMER
  distributed: number // Utilization energy used from the EEG  - value for CONSUMER
  allocated: number  // Allocation calculated energy value that can be allocated to all participants - value for CONSUMER / GENERATOR
  produced: number  // Production total value of energy production
  qoVConsumer: number
  qoVProducer: number
}

export interface IntermediateRecord {
  consumption: number[] // Consumption total energy consumption - value for CONSUMER
  utilization: number[] // Utilization energy used from the EEG  - value for CONSUMER
  allocation: number[]  // Allocation calculated energy value that can be allocated to all participants - value for CONSUMER / GENERATOR
  production: number[]  // Production total value of energy production - value for GENERATOR
}

export interface Report {
  summary: Record
  intermediate: IntermediateRecord
}

export interface MeterReport {
  meterId: string
  meterDir: "GENERATION" | "CONSUMPTION"
  from: number
  until: number
  report: Report
}

export interface ParticipantReport {
  participantId: string
  meters: MeterReport[]
}

export interface EnergyReportResponse {
  id:                 string
  participantReports: ParticipantReport[]
  meta: EnergyMeta[]
  totalProduction: number
  totalConsumption: number
}


export interface BaseReport {
  allocated: number
  total_production: number
}

export interface ConsumerReport extends BaseReport {
  consumed: number
}

export interface ProducerReport extends BaseReport {
  produced: number
}

export type ReportType = 'YH' | "YQ" | 'YM' | 'Y'

export type EnergyPeriodType = {
  begin: string;
  end: string;
}

export interface SelectedPeriod {
  type: ReportType
  year: number
  segment: number
}

export const createPeriodIdentifier = (type: string, year: number, segment: number): string => {
  return "Abr_" + type + "-" + year + "-" + segment;
}

export interface EnergySeries {
  segmentIdx: number,
  allocated: number,
  consumed: number,
}

export interface MeterEnergySeries {
  period: SelectedPeriod,
  series: EnergySeries[],
}

export interface SummaryReportData {
  consumed: number,
  allocated: number,
  distributed: number,
  produced: number,
  qoVConsumer: number,
  qoVProducer: number,
}

export interface ReportNamedData extends SummaryReportData {
  name: string
  cntConsumer: number
  cntProducer: number
}

export interface CombinedReportData {
  reportName: string
  reportData: ReportNamedData[]

}