import {BillingConfig, EdaHistories, Eeg, EegNotification, EegTariff} from "../models/eeg.model";
import {EegParticipant} from "../models/members.model";
import {
  BillingRun,
  ClearingPreviewRequest,
  ClearingPreviewResponse,
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

export class EegService extends EegBaseService {
  
  public constructor(authService: AuthService) {
    super(authService);
  }
  
  async fetchEeg(tenant: string, token?: string): Promise<Eeg> {
    if (!token) {
      token = await this.lookupToken()
    }
    return await fetch(`${API_API_SERVER}/query`, {
      method: 'POST',
      headers: {
        ...this.getSecureHeaders(token, tenant),
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(eegGraphqlQuery)
    }).then((res) => this.handleErrors(res)).then(async res => {
      if (res.status === 200) {
        const data = await res.json();
        if (data.data.eeg) {
          return data.data.eeg;
        }
      }
      throw new Error("E_1001")
    });
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

  async fetchParicipants(tenant: string, token?: string, period?: SelectedPeriod): Promise<EegParticipant[]> {
    if (!token) {
      token = await this.lookupToken()
    }
    let url = "participant"
    if (period) {
      url += `?type=${period.type}&year=${period.year}&segment=${period.segment}`
    }
    return await fetch(`${API_API_SERVER}/${url}`, {
      method: 'GET',
      headers: {
        ...this.getSecureHeaders(token, tenant),
        'Accept': 'application/json'
      }
    }).then(this.handleErrors).then(res => res.json());
  }

  async createParticipant(tenant: string, participant: EegParticipant): Promise<EegParticipant> {
    const token = await this.lookupToken()
    return await fetch(`${API_API_SERVER}/participant`, {
      method: 'POST',
      headers: {
        ...this.getSecureHeaders(token, tenant),
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(participant)
    }).then(this.handleErrors).then(res => res.json());
  }

  async updateParticipant(tenant: string, participant: EegParticipant): Promise<EegParticipant> {
    const token = await this.lookupToken()
    return await fetch(`${API_API_SERVER}/participant/${participant.id}`, {
      method: 'PUT',
      headers: {
        ...this.getSecureHeaders(token, tenant),
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(participant)
    }).then(this.handleErrors).then(res => res.json());
  }

  async confirmParticipant(tenant: string, pid: string/*, data: FormData*/): Promise<EegParticipant> {
    const token = await this.lookupToken()
    return await fetch(`${API_API_SERVER}/participant/${pid}/confirm`, {
      method: 'POST',
      headers: {
        ...this.getSecureHeaders(token, tenant),
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      // body: data
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

  async fetchBilling(tenant: string, invoiceRequest: ClearingPreviewRequest): Promise<ClearingPreviewResponse> {
    const token = await this.lookupToken()
    return await fetch(`${BILLING_API_SERVER}/api/billing`, {
      method: 'POST',
      headers: {
        ...this.getSecureHeaders(token, tenant),
        'Accept': 'application/json',
        "Content-Type": "application/json",
      },
      body: JSON.stringify(invoiceRequest)
    }).then(this.handleErrors).then(res => res.json());
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

  async fetchBillingDocumentFiles(tenant: string): Promise<InvoiceDocumentResponse[]> {
    const token = await this.lookupToken()
    return await fetch(`${BILLING_API_SERVER}/api/billingDocumentFiles/tenant/${tenant.toUpperCase()}`, {
      method: 'GET',
      headers: {
        ...this.getSecureHeaders(token, tenant),
        'Accept': 'application/json',
      },
    }).then(this.handleErrors).then(res => res.json());
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
    }).then(this.handleErrors).then(res => this.handleDownload(res, billingRunId+".xlsx"));
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
        creditNoteNumberStart: 0, documentNumberSequenceLength: 5} as BillingConfig)
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
      body: JSON.stringify(billingConfig)
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

  async syncMeteringPointList(tenant: string): Promise<EegEnergyReport> {
    const token = await this.lookupToken()
    return await fetch(`${API_API_SERVER}/eeg/sync/participants`, {
      method: 'POST',
      headers: {
        ...this.getSecureHeaders(token, tenant),
        'Accept': 'application/json'
      },
      // body: JSON.stringify(body)
    }).then(this.handleErrors).then(res => res.json());
  }

  async syncMeteringPoint(tenant: string, meters: {meter: string, direction: string}[], from: number, to: number): Promise<any> {
    const token = await this.lookupToken()

    const body = {meteringPoints: meters, from: from, to: to}
    return await fetch(`${API_API_SERVER}/meteringpoint/syncenergy`, {
      method: 'POST',
      headers: {
        ...this.getSecureHeaders(token, tenant),
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    }).then(this.handleErrors); // Response with 201 - no Content
  }

  async revokeMeteringPoint(tenant: string, participantId: string, meters: {meter: string, direction: string}[], from: number, reason?: string): Promise<any> {
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

  async changeMeterPartitionFactor(tenant: string, meters: {meter: string, direction: MeterDirectionType, activation: Date, partFact: number}[]): Promise<any> {
    const token = await this.lookupToken()

    const body = {meteringPoints: meters}
    return await fetch(`${API_API_SERVER}/meteringpoint/changepartitionfactor`, {
      method: 'POST',
      headers: {
        ...this.getSecureHeaders(token, tenant),
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    }).then(this.handleErrors).then(res => res.json());
  }

  async registerMeteringPoint(tenant: string, participantId: string, meter: string, direction: string): Promise<EegEnergyReport> {
    const token = await this.lookupToken()
    const body = {meteringPoint: meter, direction: direction}
    return await fetch(`${API_API_SERVER}/meteringpoint/${participantId}/register`, {
      method: 'POST',
      headers: {
        ...this.getSecureHeaders(token, tenant),
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(body)
    }).then(this.handleErrors).then(res => res.json());
  }

  async exportMasterdata(tenant: string) {
    const token = await this.lookupToken()
    return fetch(`${API_API_SERVER}/eeg/export/masterdata`, {
      method: 'GET',
      headers: {
        ...this.getSecureHeaders(token, tenant),
        'Content-Type': 'application/json'
      },
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
}

// export const eegService = new EegService(authKeycloak);