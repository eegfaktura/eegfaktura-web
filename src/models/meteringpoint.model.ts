import {EnergyBucket, TariffTimeWindow} from "./energy.model";

export interface ParticipantState {
  activeSince: Date
  inactiveSince: Date
}

export type MeteringStateType = "INIT" | "ACTIVE" | "INACTIVE"
export type MeteringProcessStateType = "NEW" | "INIT" | "PENDING" | "APPROVED" | "ACTIVE" | "INACTIVE" | "REJECTED" | "REVOKED" | "INVALID"
export type MeterDirectionType = "GENERATION" | "CONSUMPTION"

// type MapMeterType<PropType> =
//   PropType extends Metering ? Metering & ActivationProps : PropType;
//
// type MapParticipantObject<T> = {
//   [PropertyKey in keyof T]:
//   MapMeterType<T[PropertyKey]>;
// }

export interface Metering {
  meteringPoint: string;
  consentId: string;
  direction: MeterDirectionType;
  ownValue: number;
  totalValue: number;
  participantId: string;
  equipmentName: string;
  transformer: string;
  inverterid: string;
  tariff_id: string;
  street: string;
  streetNumber: string;
  city: string;
  zip: string,
  status: MeteringStateType,
  statusCode: number,
  registeredSince: Date,
  gridOperatorId: string,
  gridOperatorName: string,
  allocationFactor: number,
  modifiedAt: number,
  modifiedBy: string,
  processState: MeteringProcessStateType,
  participantState: ParticipantState,
  partFact: number,
  activationCode?: string
  activationMode: 'ONLINE' | 'OFFLINE'
  enabled: boolean
}

/*
export interface ActivationProps {
  enabled: boolean
  activationCode: string
  activationMode: 'ONLINE' | 'OFFLINE'
}
*/

//@TODO: Refactor diesen Type --> billing.model.ts (o.ä.)
export interface ClearingPreviewRequest {
  tenantId: string;
  clearingPeriodType: string;
  clearingPeriodIdentifier: string;
  allocations: MeteringEnergyGroupType[];
  preview: boolean;
  clearingDocumentDate: String;
}

//@TODO: Refactor diesen Type --> billing.model.ts (o.ä.)
export interface ClearingPreviewResponse {
  abstractText : string;
  billingRunId : string;
  participantAmounts: ParticipantBillType[];
}

// Antwort des asynchronen Abrechnungsstarts (POST /api/billing):
// 202 = gestartet, 409 = läuft bereits (billingRunId des laufenden Laufs),
// 400/503 = abgelehnt (abstractText = Meldung). Siehe konzept-async-billing-run.md.
export interface ClearingStartResponse {
  status: number;
  billingRunId?: string;
  abstractText?: string;
}

//@TODO: Refactor diesen Type --> billing.model.ts (o.ä.)
export interface BillingRun {
  id: string;
  clearingPeriodType: string;
  clearingPeriodIdentifier: string;
  tenantId: string;
  runStatus: "NEW" | "DONE" | "CANCELLED" | "RUNNING" | "FAILED";
  runStatusDateTime: string;
  errorSummary?: string;
  mailStatus: string;
  mailStatusDateTime: string;
  sepaStatus: string;
  sepaStatusDateTime: string;
  numberOfInvoices: string;
  numberOfCreditNotes: string;
}

//@TODO: Refactor diesen Type --> billing.model.ts (o.ä.)
export interface InvoiceDocumentResponse {
  name: string;
  mimeType: string;
  tenantId: string;
  fileDataId: string;
  billingDocumentId: string;
  participantId: string;
}

export interface MeteringEnergyGroupType {
  participantId: string;
  meteringPoint: string;
  allocationKWh: number;
  // ZVT: Fenster-Teilsummen aus dem energystore-Report + verwendete
  // Fenster-Definitionen (Konsistenz-Guard in billing). Nur bei
  // zeitbasierten Tarifen gesetzt.
  buckets?: EnergyBucket[];
  timeWindows?: TariffTimeWindow[];
}

export interface MeteringBillType {
  id: string;
  amount: number;
}

export interface ParticipantBillType {
  id: string;
  amount: number;
  participantFee: number;
  meteringPoints: MeteringBillType[]
}