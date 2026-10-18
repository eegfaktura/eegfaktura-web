import {MeterDirectionType} from "./meteringpoint.model";

// Request and response of energystore POST /eeg/v2/{ecId}/billing-check (platform#148).
// All times are epoch ms.

export interface BillingCheckCp {
  meteringPoint: string
  direction: MeterDirectionType
  activeSince: number
  inactiveSince: number
}

export interface BillingCheckRequest {
  start: number
  end: number
  cps: BillingCheckCp[]
}

export interface BillingCheckMeter extends BillingCheckCp {
  l3Count: number
  l3Days: string[]
  firstData: number | null
  lastData: number | null
}

export interface BillingCheckTotals {
  produced: number      // producer G.01
  consumed: number      // consumer G.01
  allocated: number     // consumer G.02, share of the community production
  selfCovered: number   // consumer G.03
  surplus: number       // producer P.01
}

export interface BillingCheckResponse {
  periodStart: number
  periodEnd: number
  meters: BillingCheckMeter[]
  totals: BillingCheckTotals
}
