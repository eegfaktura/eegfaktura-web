import BaseService, {API_API_SERVER} from "./base.service";
import {authKeycloak} from "../keycloak";
import {EegParticipant} from "../models/members.model";
import {AuthService} from "./auth.service";
import {SelectedPeriod} from "../models/energy.model";
import {Metering} from "../models/meteringpoint.model";

export class ParticipantService extends BaseService {
  public constructor(authService: AuthService) {
    super(authService);
  }

  async archiveParticipant(tenant: string, id: string): Promise<any> {
    const token = await this.lookupToken()
    return fetch(`${API_API_SERVER}/participant/${id}`, {
      method: 'DELETE',
      headers: {
        ...this.getSecureHeaders(token, tenant),
        'Accept-Type': 'application/json'
      },
    }).then(this.handleErrors).then(res => res.json());
  }

  async updateParticipantPartial(tenant: string, id: string, value: { path: string, value: any }): Promise<EegParticipant> {
    const token = await this.lookupToken()
    return fetch(`${API_API_SERVER}/participant/v2/${id}`, {
      method: 'PUT',
      headers: {
        ...this.getSecureHeaders(token, tenant),
        'Accept-Type': 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(value),
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

  async confirmParticipant(tenant: string, pid: string, meters: Metering[]/*, data: FormData*/): Promise<EegParticipant> {
    const token = await this.lookupToken()
    return await fetch(`${API_API_SERVER}/participant/${pid}/confirm`, {
      method: 'POST',
      headers: {
        ...this.getSecureHeaders(token, tenant),
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(meters)
    }).then(this.handleErrors).then(res => res.json());

  }

}

// export const participantService = new ParticipantService(authKeycloak);