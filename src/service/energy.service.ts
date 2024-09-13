import BaseService, {ENERGY_API_SERVER} from "./base.service";
import {
  CombinedReportData,
  EegEnergyReport,
  EnergyReportResponse,
  ParticipantReport,
  RecordV2, ReportNamedData,
  SelectedPeriod,
  SummaryReportData
} from "../models/energy.model";
import {AuthService} from "./auth.service";
import {reportDateGraphqlQuery, uploadEnergyGraphqlMutation} from "./graphql-query";
import {ExcelReportRequest} from "../models/reports.model";
import {ActiveTenant} from "../models/eeg.model";

export class EnergyService extends BaseService {
  public constructor(authService: AuthService) {
    super(authService);
  }

  async fetchReportV2(tenant: ActiveTenant, year: number, segment: number, type: string, participants: ParticipantReport[]): Promise<EnergyReportResponse> {
    const token = await this.lookupToken()
    return await fetch(`${ENERGY_API_SERVER}/eeg/v2/${tenant.ecId}/report`, {
      method: 'POST',
      headers: {
        ...this.getSecureHeadersX(token, tenant.rcNr),
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({reportInterval: {type: type, year: year, segment: segment}, participants: participants})
    }).then(this.handleErrors).then(res => res.json());
  }

  async fetchLastReportEntryDate(tenant: string, ecId: string, token?: string): Promise<string> {
    if (!token) {
      token = await this.lookupToken()
    }
    return await fetch(`${ENERGY_API_SERVER}/query`, {
      method: 'POST',
      headers: {
        ...this.getSecureHeadersX(token, tenant),
        'Accept': 'application/json',
        "Content-Type": "application/json",
      },
      body: JSON.stringify(reportDateGraphqlQuery(tenant, ecId))
    }).then(this.handleErrors).then(res => res.json().then(data => data.data ? data.data.lastEnergyDate : ""));
    //   return await Http.post({
    //     url: `${ENERGY_API_SERVER}/query`,
    //     method: 'POST',
    //     headers: {
    //       ...this.getSecureHeaders(token, tenant),
    //       'Accept': 'application/json',
    //       "Content-Type": "application/json",
    //     },
    //     data: JSON.stringify(reportDateGraphqlQuery(tenant))
    //   }).then(async res => {
    //     if (res.status === 200) {
    //       const data = await res.data;
    //       console.log("last Report DATE: ", data);
    //       return data.data ? data.data.lastEnergyDate : "";
    //     }
    //   })
  }
  async fetchIntraDayReportV2(tenant: ActiveTenant, selectedPeroid: SelectedPeriod): Promise<SummaryReportData[]> {
    const token = await this.lookupToken()

    // const calcStartEndTime = (selectedPeroid: SelectedPeriod) => {
    //   const year = selectedPeroid.year
    //   const segment = selectedPeroid.segment
    //   const type = selectedPeroid.type
    //   switch (type) {
    //     case "YM":
    //       return {start: new Date(year, segment - 1).getTime(), end: new Date(year, segment, 0).getTime()}
    //     case "YQ":
    //       return {start: new Date(year, (segment * 3) - 3).getTime(), end: new Date(year, (segment * 3), 0).getTime()}
    //     case "YH":
    //       return {start: new Date(year, (segment * 6) - 6).getTime(), end: new Date(year, (segment * 6), 0).getTime()}
    //     default:
    //       return {start: new Date(year, 0).getTime(), end: new Date(year, 11, 31).getTime()}
    //   }
    //   throw new Error("wrong period type. Expected [Y, YH, YQ, YM]. Got " + type)
    // }

    return await fetch(`${ENERGY_API_SERVER}/eeg/v2/${tenant.ecId}/intra-day-report`, {
      method: 'POST',
      headers: {
        ...this.getSecureHeadersX(token, tenant.rcNr),
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(this.calcStartEndTime(selectedPeroid))
    }).then(this.handleErrors).then(res => res.json());
  }

  async fetchLoadCurveReportV2(tenant: ActiveTenant, selectedPeroid: SelectedPeriod): Promise<ReportNamedData[]> {
    const token = await this.lookupToken()
    return await fetch(`${ENERGY_API_SERVER}/eeg/v2/${tenant.ecId}/load-curve-report`, {
      method: 'POST',
      headers: {
        ...this.getSecureHeadersX(token, tenant.rcNr),
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(this.calcStartEndTime(selectedPeroid))
    }).then(this.handleErrors).then(res => res.json());
  }

  async fetchCombinedReportV2(tenant: ActiveTenant, reports: string[], selectedPeroid: SelectedPeriod): Promise<CombinedReportData[]> {
    const token = await this.lookupToken()
    return await fetch(`${ENERGY_API_SERVER}/eeg/v2/${tenant.ecId}/combined-report`, {
      method: 'POST',
      headers: {
        ...this.getSecureHeadersX(token, tenant.rcNr),
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({...this.calcStartEndTime(selectedPeroid), reports: reports})
    }).then(this.handleErrors).then(res => res.json());
  }

  async fetchSummary(tenant: ActiveTenant, year: number, segment: number, type: string): Promise<RecordV2> {
    const token = await this.lookupToken()
    return await fetch(`${ENERGY_API_SERVER}/eeg/v2/${tenant.ecId}/summary`, {
      method: 'POST',
      headers: {
        ...this.getSecureHeadersX(token, tenant.rcNr),
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({type: type, year: year, segment: segment})
    }).then(this.handleErrors).then(res => res.json()).then(res => res[0]);
  }

  async createReport(tenant: ActiveTenant, payload: ExcelReportRequest) {
    const token = await this.lookupToken()
    return fetch(`${ENERGY_API_SERVER}/eeg/${tenant.ecId}/excel/report/download`, {
      method: 'POST',
      headers: {
        ...this.getSecureHeadersX(token, tenant.rcNr),
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    })
      .then(this.handleErrors)
      .then( response => this.handleDownload(response, "energy-export"));
  }

  async fetchReport(tenant: string, ecId: string, year: number, segment: number, type: string, token?: string): Promise<EegEnergyReport> {
    if (!token) {
      token = await this.lookupToken()
    }
    return await fetch(`${ENERGY_API_SERVER}/eeg/${ecId}/report`, {
      method: 'POST',
      headers: {
        ...this.getSecureHeadersX(token, tenant),
        'Accept': 'application/json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({type: type, year: year, segment: segment})
    }).then(this.handleErrors).then(res => res.json());

    //   return await Http.post({
    //       url: `${ENERGY_API_SERVER}/query`,
    //       method: 'POST',
    //       headers: {
    //         ...this.getSecureHeaders(token, tenant),
    //         'Accept': 'application/json',
    //         "Content-Type": "application/json",
    //       },
    //       data: JSON.stringify(energyGraphqlQuery(tenant, year, month))
    //     }
    //   ).then(async res => {
    //     if (res.status === 200) {
    //       const data = await res.data;
    //       return data.data;
    //     }
    //   })
  }

  async uploadEnergyFile(tenant: ActiveTenant, sheet: string, data: File): Promise<boolean> {
    const token = await this.lookupToken()
    return await fetch(`${ENERGY_API_SERVER}/query`, {
      method: 'POST',
      headers: {
        ...this.getSecureHeadersX(token, tenant.rcNr),
        'Accept': 'application/json',
        // 'Content-Type': 'multipart/form-data'
      },
      body: await uploadEnergyGraphqlMutation(tenant.rcNr, tenant.ecId, sheet, data)
    }).then(this.handleErrors).then(this.handleGQLResponse).then(_ => true);
  }

  calcStartEndTime(selectedPeroid: SelectedPeriod): {start: number, end: number} {
    const year = selectedPeroid.year
    const segment = selectedPeroid.segment
    const type = selectedPeroid.type
    switch (type) {
      case "YM":
        return {start: new Date(year, segment - 1).getTime(), end: new Date(year, segment, 0).getTime()}
      case "YQ":
        return {start: new Date(year, (segment * 3) - 3).getTime(), end: new Date(year, (segment * 3), 0).getTime()}
      case "YH":
        return {start: new Date(year, (segment * 6) - 6).getTime(), end: new Date(year, (segment * 6), 0).getTime()}
      default:
        return {start: new Date(year, 0).getTime(), end: new Date(year, 11, 31).getTime()}
    }
  }
}

// export const energyService = new EnergyService(authKeycloak);