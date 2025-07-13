export interface Eeg {
  id: string
  name: string;
  rcNumber: string;
  legal: string;
  salesTax: string;
  taxNumber: string;
  vatNumber: string;
  businessNr: string;
  settlement: string;
  description: string;
  gridOperator: string;
  operatorName: string;
  contactPerson: string;
  settlementInterval: 'MONTHLY' | "ANNUAL" | "BIANNUAL" | "QUARTER";
  allocationMode: "DYNAMIC" | "STATIC"
  area: "LOCAL" | "REGIONAL" | "BEG" | "GEA"
  communityId: string;
  address: Address;
  contact: Contact;
  accountInfo: AccountInfo;
  optionals: Optionals;
  online: boolean;
}

export interface EegOwner {
  username: string
  password: string
  confirmPassword: string
  firstname: string
  lastname: string
  email: string
}

export interface EegPonton {
  smtpHost: string
  smtpPort: number
  smtpUsername: string
  smtpPassword: string
  smtpConfirmPassword: string
}

export type EegRegister = Eeg & EegOwner & EegPonton

export interface Address {
  street: string;
  streetNumber: string;
  zip: string;
  city: string;
  type: "BILLING" | "RESIDENCE"
}

export interface Contact {
  phone: string;
  email: string;
}

export interface AccountInfo {
  iban: string;
  bic?: string;
  owner: string;
  bankName: string;
  sepa: boolean;
  creditorId?: string;
  mandateReference: string;
  mandateDate?: Date;
  sepaDirectDebit: SepaDirectDebitType;
}

export interface Optionals {
  website: string;
}

export interface BillingConfig {
  id : string;
  tenantId : string;
  headerImageFileDataId : string;
  footerImageFileDataId : string;
  createCreditNotesForAllProducers : boolean;
  beforeItemsTextInvoice : string;
  beforeItemsTextCreditNote : string;
  beforeItemsTextInfo : string;
  afterItemsTextInvoice : string;
  afterItemsTextCreditNote : string;
  afterItemsTextInfo : string;
  termsTextInvoice : string;
  termsTextCreditNote : string;
  termsTextInfo : string;
  footerText : string;
  documentNumberSequenceLength : number;
  customTemplateFileDataId : string;
  invoiceNumberPrefix : string;
  invoiceNumberStart : number;
  creditNoteNumberPrefix : string;
  creditNoteNumberStart : number;
}

export interface EegRateItem {
  name: RateTypeEnum;
  value: string;
  unit: string;
  optional: boolean;
}

export interface EegRate {
  id: string;
  name: string;
  vat: number;
  type: "EEG" | "EZP" | "VZP";
  items: EegRateItem[];
}

export type SepaDirectDebitType = 'B2B' | 'CORE' | 'NONE';

export enum RateTypeEnum {
  AHEAD = "Vorauszahlung",
  DISCOUNT = "Rabatt",
  CENTPERKWH = "Cent pro kWh",
  INCLUDEKWH = "Inklusive kWh",
  DISCOUNTINPERCENT = "Rabatt in %",
  FIXSUM = "Pauschalbetrag",
  FIXSUM1 = ""
}

export const memberType: EegRateItem[] = [
  {name: RateTypeEnum.AHEAD, value: "", unit: "€", optional: true},
  {name: RateTypeEnum.DISCOUNT, value: "", unit: "%", optional: true},
]

export const vzpType: EegRateItem[] = [
  {name: RateTypeEnum.CENTPERKWH, value: "", unit: "€", optional: false},
  {name: RateTypeEnum.INCLUDEKWH, value: "", unit: "kWh", optional: true},
  {name: RateTypeEnum.DISCOUNTINPERCENT, value: "", unit: "%", optional: true},
]

export const ezpType: EegRateItem[] = [
  {name: RateTypeEnum.FIXSUM, value: "", unit: "€", optional: false},
  {name: RateTypeEnum.CENTPERKWH, value: "", unit: "€" , optional: true},
]

export interface EegTariff {
  id: string;
  name: string;
  type: "EEG" | "EZP" | "VZP" | "AKONTO";
  billingPeriod?: string
  useVat?: boolean
  vatSupplementaryText?: string
  vatInPercent?: string
  accountNetAmount?: string
  accountGrossAmount?: string
  participantFee?: number
  baseFee?: string
  businessNr?: string
  centPerKWh?: number
  freeKWh?: number
  discount?: number
  useMeteringPointFee: boolean
  meteringPointFee?: number
  meteringPointVat?: number
}

export enum MONTHNAME {
  Januar = 1,
  Februar,
  März,
  April,
  Mai,
  Juni,
  Juli,
  August,
  September,
  Oktober,
  November,
  Dezember
}

export enum MONTHNAMESHORT {
  Jan = 1,
  Feb,
  Mär,
  Apr,
  Mai,
  Jun,
  Jul,
  Aug,
  Sep,
  Okt,
  Nov,
  Dez
}

export interface EdaProcess {
  name: string
  description: string
  type: 'CR_REQ_PT' | 'EC_REQ_ONL' | 'HISTORY' | 'CM_REV_CUS' | 'EC_PRTFACT_CHANGE' | 'EC_PODLIST'
}


export class Message {
  constructor(public properties: { [key: string]: any | any[]; }) {
  }

  private getValue = (prop: string): any => this.properties ? this.properties[prop] ? this.properties[prop] : "-" : "-"

  public get type(): string {
    return this.getValue("type")
  }
  public get meteringPoint(): string | string[] {
    // console.log("get MeteringPoint", this.properties["meteringPoint"])
    // console.log("get MeteringPoints", this.properties["meteringPoints"])
    if (this.properties) {
      return this.properties["meteringPoint"] ? this.properties["meteringPoint"] as string : this.properties["meteringPoints"] ? this.properties["meteringPoints"].join(", ") : "-"
    }
    return "-"
  }
  public get responseCode(): string | string[] {
    const value = this.getValue("responseCodes")
    if (value instanceof Array) {
      return (value as string[]).join(", ")
    }

    return value as string
  }
}

export interface EegNotification {
  id: number;
  date: Date;
  type: 'ERROR' | 'MESSAGE' | 'NOTIFICATION';
  process: string;
  message: Message;
}

export type EdaHistories = Record<string, Record<string, Array<any>>>

export interface ActiveTenant {
  tenant: string
  ecId: string
  rcNr: string
}
