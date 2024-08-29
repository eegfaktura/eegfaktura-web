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

//@TODO: Refactor diesen Type --> billing.model.ts (o.ä.)
export interface BillingRun {
  id: string;
  clearingPeriodType: string;
  clearingPeriodIdentifier: string;
  tenantId: string;
  runStatus: "NEW" | "DONE" | "CANCELLED";
  runStatusDateTime: string;
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