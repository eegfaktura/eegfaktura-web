import {
  BillingConfig, EdaHistories, Eeg, EegNotification, EegTariff, JoiningFeeRecord, JoiningFeeState
} from "../models/eeg.model";
import {EegParticipant} from "../models/members.model";
import {
  BillingDocumentAmounts,
  BillingRun,
  ClearingPreviewRequest,
  ClearingStartResponse,
  InvoiceDocumentResponse, MeterDirectionType,
  Metering,
  ParticipantBillType
} from "../models/meteringpoint.model";
import {EegEnergyReport, SelectedPeriod} from "../models/energy.model";
import {eegGraphqlQuery} from "./graphql-query";
import {API_API_SERVER} from "./base.service";
import {AuthService} from "./auth.service";
import EegBaseService from "./base.service";

const BILLING_API_SERVER = import.meta.env.VITE_BILLING_SERVER_URL;

// POST /meteringpoint/syncenergy (smart re-request)
export interface SyncEnergyMeter {
  meter: string
  direction: string
  from?: number
  to?: number
}

export interface SyncEnergySkipped {
  meteringPoint: string
  reason: string
  until?: number  // ALREADY_REQUESTED: when the metering point is free again (ms)
}

// requested is unknown from an older backend (204, no body) or for a community that is not online
export interface SyncEnergyResult {
  requested?: number
  skipped: SyncEnergySkipped[]
}

export const parseSyncEnergyResult = async (res: Response): Promise<SyncEnergyResult> => {
  const text = res.status === 204 ? "" : await res.text()
  if (!text) return {skipped: []}
  const body = JSON.parse(text)
  return {requested: body.requested, skipped: body.skipped ?? []}
}

// billing answers 409 when the member's joining fee was charged in a final run meanwhile
export class JoiningFeeAlreadyBilledError extends Error {
  constructor() {
    super("Die Beitrittsgebühr wurde inzwischen verrechnet – die Änderung ist nicht mehr möglich.")
  }
}

export class EegService extends EegBaseService {
  
  public constructor(authService: AuthService) {
    super(authService);
  }

  async fetchEeg(tenant: string, token?: string): Promise<Eeg> {
    if (!token) {
      token = await this.lookupToken()
    }
    return await fetch(`${API_API_SERVER}/eeg`, {
      method: 'GET',
      headers: {
        ...this.getSecureHeaders(token, tenant),
        'Accept': 'application/json'
      }
    }).then(this.handleErrors).then(res => res.json())
  }


  async updateEeg(tenant: string, eeg: Record<string, any>): Promise<Eeg> {
    const token = await this.lookupToken()
    return await fetch(`${API_API_SERVER}/eeg`, {
      method: 'POST',
      headers: {
        ...this.getSecureHeaders(token, tenant),
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(eeg)
    }).then(this.handleErrors).then(res => res.json());
  }

  async fetchRates(tenant: string, token?: string): Promise<EegTariff[]> {
    if (!token) {
      token = await this.lookupToken()
    }
    return await fetch(`${API_API_SERVER}/eeg/tariff`, {
      method: 'GET',
      headers: {
        ...this.getSecureHeaders(token, tenant),
        'Accept': 'application/json'
      }
    }).then(this.handleErrors).then(async res => res.json());
  }

  async addRate(tenant: string, rate: EegTariff): Promise<EegTariff> {
    const token = await this.lookupToken()
    return await fetch(`${API_API_SERVER}/eeg/tariff`, {
      method: 'POST',
      headers: {
        ...this.getSecureHeaders(token, tenant),
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(rate)
    }).then((res) => this.handleErrors(res)).then(async res => res.json());
  }

  async createMeteringPoint(tenant: string, participantId: string, meter: Metering): Promise<{
    participantId: string,
    meter: Metering
  }> {
    const token = await this.lookupToken()
    return await fetch(`${API_API_SERVER}/meteringpoint/${participantId}/create`, {
      method: 'PUT',
      headers: {
        ...this.getSecureHeaders(token, tenant),
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(meter)
    }).then(this.handleErrors)
      .then((res) => res.json())
      .then(m => {return {participantId: participantId, meter: m}});
  }

  async updateMeteringPoint(tenant: string, participantId: string, meter: Metering): Promise<Metering> {
    const token = await this.lookupToken()
    // return new Promise<Metering>((resolve, reject) => resolve(meter));
    return await fetch(`${API_API_SERVER}/meteringpoint/${participantId}/update/${meter.meteringPoint}`, {
      method: 'PUT',
      headers: {
        ...this.getSecureHeaders(token, tenant),
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(meter)
    }).then(this.handleErrors).then(res => res.json());
  }

  async updateMeteringPointPartFact(tenant: string, participantId: string, meter: string, partFact: number): Promise<Metering> {
    const token = await this.lookupToken()
    // return new Promise<Metering>((resolve, reject) => resolve(meter));
    const body = {partFact: partFact}
    return await fetch(`${API_API_SERVER}/meteringpoint/${participantId}/update/${meter}/partfact`, {
      method: 'PUT',
      headers: {
        ...this.getSecureHeaders(token, tenant),
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(body)
    }).then(this.handleErrors).then(res => res.json());
  }

  async moveMeteringPoint(tenant: string, sParticipantId: string, dParticipantId: string, meter: Metering): Promise<Metering> {
    const token = await this.lookupToken()
    // return new Promise<Metering>((resolve, reject) => resolve(meter));
    return await fetch(`${API_API_SERVER}/meteringpoint/${sParticipantId}/${dParticipantId}/move/${meter.meteringPoint}`, {
      method: 'PUT',
      headers: {
        ...this.getSecureHeaders(token, tenant),
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(meter)
    }).then(this.handleErrors).then(res => res.json());
  }

  async removeMeteringPoint(tenant: string, participantId: string, meter: Metering): Promise<Metering> {
    const token = await this.lookupToken()
    return await fetch(`${API_API_SERVER}/meteringpoint/${participantId}/remove/${meter.meteringPoint}`, {
      method: 'DELETE',
      headers: {
        ...this.getSecureHeaders(token, tenant),
        'Content-Type': 'application/json'
      },
    }).then(this.handleErrors).then(res => res.json());
  }

  async fetchBillingRun(tenant: string, clearingPeriodType: string, clearingPeriodIdentifier: string, token?: string): Promise<BillingRun[]> {
    if (!token) {
      token = await this.lookupToken()
    }
    return await fetch( `${BILLING_API_SERVER}/api/billingRuns/${tenant}/${clearingPeriodType}/${clearingPeriodIdentifier}`, {
      method: 'GET',
      headers: {
        ...this.getSecureHeaders(token, tenant),
        'Accept': 'application/json',
        "Content-Type": "application/json",
      }
    }).then(this.handleErrors).then(res => res.json());
  }

  async fetchBillingRunById(tenant: string, billingRundId : string, token?: string): Promise<BillingRun> {
    if (!token) {
      token = await this.lookupToken()
    }
    return await fetch( `${BILLING_API_SERVER}/api/billingRuns/${billingRundId}`, {
      method: 'GET',
      headers: {
        ...this.getSecureHeaders(token, tenant),
        'Accept': 'application/json',
        "Content-Type": "application/json",
      }
    }).then(this.handleErrors).then(res => res.json());
  }

  // Startet den asynchronen Abrechnungslauf. Bewusst OHNE handleErrors:
  // 409 (läuft bereits) trägt die billingRunId im Body, 400/503 die Meldung
  // in abstractText — beides würde handleErrors verwerfen.
  async startBilling(tenant: string, invoiceRequest: ClearingPreviewRequest): Promise<ClearingStartResponse> {
    const token = await this.lookupToken()
    const response = await fetch(`${BILLING_API_SERVER}/api/billing`, {
      method: 'POST',
      headers: {
        ...this.getSecureHeaders(token, tenant),
        'Accept': 'application/json',
        "Content-Type": "application/json",
      },
      body: JSON.stringify(invoiceRequest)
    });
    const body = await response.json().catch(() => ({}));
    return {status: response.status, billingRunId: body.billingRunId, abstractText: body.abstractText};
  }

  async fetchParticipantAmounts(tenant : string, billingRunId : string) : Promise<ParticipantBillType[]> {
    const token = await this.lookupToken()
    return await fetch(`${BILLING_API_SERVER}/api/billingRuns/${billingRunId}/participantAmounts`, {
      method: 'GET',
      headers: {
        ...this.getSecureHeaders(token, tenant),
        'Accept': 'application/json',
        "Content-Type": "application/json",
      },
    }).then(this.handleErrors).then(res => res.json())
  }

  async fetchBillingDocuments(tenant : string, billingRunId : string) : Promise<BillingDocumentAmounts[]> {
    const token = await this.lookupToken()
    return await fetch(`${BILLING_API_SERVER}/api/billingRuns/${billingRunId}/billingDocuments`, {
      method: 'GET',
      headers: {
        ...this.getSecureHeaders(token, tenant),
        'Accept': 'application/json',
        "Content-Type": "application/json",
      },
    }).then(this.handleErrors).then(res => res.json())
  }

  // platform#217: per member with a final document, energy billed yes/no and the document with the joining fee
  async fetchJoiningFeeState(tenant: string): Promise<JoiningFeeState[]> {
    const token = await this.lookupToken()
    return await fetch(`${BILLING_API_SERVER}/api/billingDocuments/tenant/${tenant.toUpperCase()}/joiningFeeState`, {
      method: 'GET',
      headers: {
        ...this.getSecureHeaders(token, tenant),
        'Accept': 'application/json',
      },
    }).then(this.handleErrors).then(res => res.json())
  }

  // extension 2026-10-27: request the fee for the next final run or record a payment made outside eegfaktura (PUT),
  // or take the record back (DELETE); 409 once the fee is charged
  async saveJoiningFeeRecord(tenant: string, participantId: string, record: JoiningFeeRecord): Promise<void> {
    return this.joiningFeeRecordCall(tenant, participantId, 'PUT', record)
  }

  async deleteJoiningFeeRecord(tenant: string, participantId: string): Promise<void> {
    return this.joiningFeeRecordCall(tenant, participantId, 'DELETE')
  }

  private async joiningFeeRecordCall(tenant: string, participantId: string, method: 'PUT' | 'DELETE', record?: JoiningFeeRecord) {
    const token = await this.lookupToken()
    const response = await fetch(`${BILLING_API_SERVER}/api/billingDocuments/tenant/${tenant.toUpperCase()}/participants/${encodeURIComponent(participantId)}/joiningFee`, {
      method,
      headers: {
        ...this.getSecureHeaders(token, tenant),
        'Content-Type': 'application/json',
      },
      body: record ? JSON.stringify(record) : undefined,
    })
    if (response.status === 409) throw new JoiningFeeAlreadyBilledError()
    await this.handleErrors(response)
  }

  async fetchBillingDocumentFiles(tenant: string): Promise<InvoiceDocumentResponse[]> {
    const token = await this.lookupToken()
    return await fetch(`${BILLING_API_SERVER}/api/billingDocumentFiles/tenant/${tenant.toUpperCase()}`, {
      method: 'GET',
      headers: {
        ...this.getSecureHeaders(token, tenant),
        'Accept': 'application/json',
      },
    }).then(this.handleErrors).then(res => res.json()).then(res => res.sort((a: InvoiceDocumentResponse, b:InvoiceDocumentResponse) => b.name.localeCompare(a.name)));
  }

  async downloadBillingDocument(tenant: string, filedataId: string): Promise<Blob> {
    const token = await this.lookupToken()
    return await fetch(`${BILLING_API_SERVER}/api/fileData/${filedataId}`, {
      method: 'GET',
      headers: {
        ...this.getSecureHeaders(token, tenant),
      },
    }).then(this.handleErrors).then(res => res.blob());
  }

  async exportBillingArchive(tenant: string, billingRunId : string, token? : string): Promise<boolean> {
    if (!token) {
      token = await this.lookupToken()
    }
    return await fetch(`${BILLING_API_SERVER}/api/billingRuns/${billingRunId}/billingDocuments/archive`, {
      method: 'GET',
      headers: {
        ...this.getSecureHeaders(token, tenant),
      },
    }).then(this.handleErrors).then(res => this.handleDownload(res, billingRunId+".zip"));
  }

  async exportBillingExcel(tenant: string, billingRunId : string, token? : string): Promise<boolean> {
    if (!token) {
      token = await this.lookupToken()
    }
    return await fetch(`${BILLING_API_SERVER}/api/billingRuns/${billingRunId}/billingDocuments/xlsx`, {
      method: 'GET',
      headers: {
        ...this.getSecureHeaders(token, tenant),
      },
    }).then(this.handleErrors).then(res => this.handleDownload(res, billingRunId+".xlsx", tenant));
  }

  async exportBillingExcelForSepa(tenant: string, billingRunId : string, token? : string): Promise<Response> {
    if (!token) {
      token = await this.lookupToken()
    }
    return await fetch(`${BILLING_API_SERVER}/api/billingRuns/${billingRunId}/billingDocuments/xlsx`, {
      method: 'GET',
      headers: {
        ...this.getSecureHeaders(token, tenant),
      },
    }).then(this.handleErrors);
  }

  async billingRunSendmail(tenant: string, billingRunId : string, token? : string): Promise<boolean> {
    if (!token) {
      token = await this.lookupToken()
    }
    return await fetch(`${BILLING_API_SERVER}/api/billingRuns/${billingRunId}/billingDocuments/sendmail`, {
      method: 'GET',
      headers: {
        ...this.getSecureHeaders(token, tenant),
      },
    }).then(this.handleErrors).then(res => true);
  }

  async fetchBillingConfigByTenantId(tenant: string, token?: string): Promise<BillingConfig>  {
    if (!token) {
      token = await this.lookupToken()
    }
    return await fetch( `${BILLING_API_SERVER}/api/billingConfigs/tenant/${tenant}`, {
      method: 'GET',
      headers: {
        ...this.getSecureHeaders(token, tenant),
        'Accept': 'application/json',
        "Content-Type": "application/json",
      }
    }).then(this.handleErrors).then(res => res.json());
  }

  async fetchBillingConfigById(billingConfigId: string, tenant : string, token?: string): Promise<BillingConfig> {
    if (!token) {
      token = await this.lookupToken()
    }
    return await fetch( `${BILLING_API_SERVER}/api/billingConfigs/${billingConfigId}`, {
      method: 'GET',
      headers: {
        ...this.getSecureHeaders(token, tenant),
        'Accept': 'application/json',
        "Content-Type": "application/json",
      }
    }).then(this.handleErrors).then(res => res.json());
  }

  async createBillingConfig(tenant: string, token?: string): Promise<BillingConfig> {
    if (!token) {
      token = await this.lookupToken()
    }
    const result = fetch( `${BILLING_API_SERVER}/api/billingConfigs`, {
      method: 'POST',
      headers: {
        ...this.getSecureHeaders(token, tenant),
        'Accept': 'application/json',
        "Content-Type": "application/json",
      },
      body: JSON.stringify({tenantId : tenant, invoiceNumberStart : 0,
        creditNoteNumberStart: 0, documentNumberSequenceLength: 5,
        createCreditNotesForAllProducers: true} as BillingConfig)
    }).then(this.handleErrors).then(res => res.json())

    return await result.then(
      data => {
        return this.fetchBillingConfigById(data, tenant, token);
      }
    )
  }

  async updateBillingConfig(tenant: string, billingConfig: BillingConfig, token?: string): Promise<BillingConfig> {
    if (!token) {
      token = await this.lookupToken()
    }

    const result = await fetch( `${BILLING_API_SERVER}/api/billingConfigs/${billingConfig.id}`, {
      method: 'PUT',
      headers: {
        ...this.getSecureHeaders(token, tenant),
        'Accept': 'application/json',
        "Content-Type": "application/json",
      },
      // Abrechnungsinfo-Option entfällt: UST-pflichtige Erzeuger bekommen immer die
      // RC-Gutschrift. Das Flag hat kein UI mehr; hier fix true senden, sonst würde das
      // primitive boolean serverseitig auf false zurückfallen (BillingConfig full overwrite).
      body: JSON.stringify({...billingConfig, createCreditNotesForAllProducers: true})
    }).then(this.handleErrors).then(res => {});

    return this.fetchBillingConfigById(billingConfig.id, tenant, token);

  }

  async uploadImageBillingConfig(tenant: string, billingConfig : BillingConfig, imageType: "logo" | "footer", file: File): Promise<BillingConfig> {
    const token = await this.lookupToken()
    const body = new FormData();
    body.append('file', file)

    const result = await fetch(`${BILLING_API_SERVER}/api/billingConfigs/${billingConfig.id}/${imageType}Image`, {
      method: 'POST',
      headers: {
        ...this.getSecureHeaders(token, tenant),
        'Accept': 'application/json',
      },
      body: body
    }).then(this.handleErrors).then(res => {});

    return this.fetchBillingConfigById(billingConfig.id, tenant, token);
  }

  async deleteImageBillingConfig(tenant: string, billingConfig : BillingConfig, imageType: "logo" | "footer"): Promise<BillingConfig> {
    const token = await this.lookupToken()

    const result = await fetch(`${BILLING_API_SERVER}/api/billingConfigs/${billingConfig.id}/${imageType}Image`, {
      method: 'DELETE',
      headers: {
        ...this.getSecureHeaders(token, tenant),
        'Accept': 'application/json',
      }
    }).then(this.handleErrors).then(res => {});

    return this.fetchBillingConfigById(billingConfig.id, tenant, token);
  }

  async getImageBillingConfig(tenant: string, billingConfig : BillingConfig, imageType: "logo" | "footer"): Promise<Blob> {
    const token = await this.lookupToken()
    return await fetch(`${BILLING_API_SERVER}/api/billingConfigs/${billingConfig.id}/${imageType}Image`, {
      method: 'GET',
      headers: {
        ...this.getSecureHeaders(token, tenant),
        'Accept': 'application/json',
      }
    }).then(this.handleErrors).then(response => response.blob());
  }

  async syncMeteringPointList(tenant: string, operatorId: string): Promise<void> {
    const token = await this.lookupToken()
    return await fetch(`${API_API_SERVER}/eeg/sync/participants/${operatorId}`, {
      method: 'POST',
      headers: {
        ...this.getSecureHeaders(token, tenant),
        'Accept': 'application/json'
      },
      // body: JSON.stringify(body)
    }).then(this.handleErrors).then(res => new Promise<void>((resolve) => resolve()));
  }

  // from/to of a metering point (ms) are optional, the request period applies without them; complete are the
  // metering points found complete, recorded by the backend as skipped (COMPLETE) and not requested
  async syncMeteringPoint(tenant: string, meters: SyncEnergyMeter[], from: number, to: number, complete?: string[]): Promise<SyncEnergyResult> {
    const token = await this.lookupToken()

    const body = {meteringPoints: meters, from: from, to: to, ...(complete && complete.length > 0 ? {complete} : {})}
    return await fetch(`${API_API_SERVER}/meteringpoint/syncenergy`, {
      method: 'POST',
      headers: {
        ...this.getSecureHeaders(token, tenant),
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    }).then(this.handleErrors).then(parseSyncEnergyResult);
  }

  async revokeMeteringPoint(tenant: string, participantId: string, meters: {meter: string, direction: string, consentId: string}[], from: number, reason?: string): Promise<any> {
    const token = await this.lookupToken()

    const body = {meteringPoints: meters, from: from, reason: reason}
    return await fetch(`${API_API_SERVER}/meteringpoint/${participantId}/revokemeters`, {
      method: 'POST',
      headers: {
        ...this.getSecureHeaders(token, tenant),
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    }).then(this.handleErrors).then(res => res.json());
  }

  async changeMeterPartitionFactor(tenant: string, meters: {meter: string, direction: MeterDirectionType, gridOperatorId: string, activation: Date, partFact: number}[]): Promise<any> {
    const token = await this.lookupToken()

    const body = {meteringPoints: meters}
    // the backend answers 204 No Content: no body to parse
    return await fetch(`${API_API_SERVER}/meteringpoint/changepartitionfactor`, {
      method: 'POST',
      headers: {
        ...this.getSecureHeaders(token, tenant),
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    }).then(this.handleErrors).then(() => undefined);
  }

  async registerMeteringPoint(tenant: string, participantId: string, meter: string, direction: string, mode: 'ONLINE' | 'OFFLINE', code?: string): Promise<EegEnergyReport> {
    const token = await this.lookupToken()
    const body = {meteringPoint: meter, direction: direction, activationCode: code, activationMode: mode}
    return await fetch(`${API_API_SERVER}/meteringpoint/${participantId}/register`, {
      method: 'POST',
      headers: {
        ...this.getSecureHeaders(token, tenant),
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    }).then(this.handleErrors).then(res => res.json());
  }

  // platform#217: POST with billing's joiningFeeState as body for the column „Beitrittsgebühr verrechnet“; without
  // a body (billing not reachable) the backend leaves the column empty
  async exportMasterdata(tenant: string, joiningFeeState?: JoiningFeeState[]) {
    const token = await this.lookupToken()
    return fetch(`${API_API_SERVER}/eeg/export/masterdata`, {
      method: 'POST',
      headers: {
        ...this.getSecureHeaders(token, tenant),
        'Content-Type': 'application/json'
      },
      body: joiningFeeState ? JSON.stringify(joiningFeeState) : undefined,
    })
      .then(this.handleErrors)
      .then( response => this.handleDownload(response, "energy-export"));
  }

  async uploadMasterDataFile(tenant: string, sheet: string, data: File): Promise<boolean> {
    const token = await this.lookupToken()

    const formData = new FormData();
    formData.append("sheet", sheet)
    formData.append("masterdatafile", data)

    return await fetch(`${API_API_SERVER}/eeg/import/masterdata`, {
      method: 'POST',
      headers: {
        ...this.getSecureHeaders(token, tenant),
      },
      body: formData
    }).then(this.handleErrors).then(res => true);
  }

  async getNotifications(tenant: string, start: number): Promise<EegNotification[]> {
    const token = await this.lookupToken()
    return await fetch(`${API_API_SERVER}/eeg/notifications/${start}`, {
      method: 'GET',
      headers: {
        ...this.getSecureHeaders(token, tenant),
      },
    }).then(this.handleErrors).then(res => res.json());
  }

  async getHistories(tenant: string, beginTimestamp: number, endTimestamp: number): Promise<EdaHistories> {
    const token = await this.lookupToken()
    return await fetch(`${API_API_SERVER}/process/history?start=${beginTimestamp}&end=${endTimestamp}`, {
      method: 'GET',
      headers: {
        ...this.getSecureHeaders(token, tenant),
      },
    }).then((res) => this.handleErrors(res)).then(res => res.json());
  }

  async getHistories1(tenant: string, protocols: Array<string>, beginTimestamp: number, endTimestamp: number): Promise<EdaHistories> {
    const token = await this.lookupToken()
    // encoded: Go (backend) drops a query parameter with a raw ";", the list arrived empty (platform#170)
    return await fetch(`${API_API_SERVER}/process/history?start=${beginTimestamp}&end=${endTimestamp}&protocol=${encodeURIComponent(protocols.join(';'))}&ps=0`, {
      method: 'GET',
      headers: {
        ...this.getSecureHeaders(token, tenant),
      },
    }).then((res) => this.handleErrors(res)).then(res => res.json()).then(res => res.data);
  }

  async getGridOperators(tenant: string): Promise<Record<string, string>> {
    const token = await this.lookupToken()
    return await fetch(`${API_API_SERVER}/eeg/gridoperators`, {
      method: 'GET',
      headers: {
        ...this.getSecureHeaders(token, tenant),
      },
    }).then(this.handleErrors).then(res => res.json());
  }
}

// export const eegService = new EegService(authKeycloak);