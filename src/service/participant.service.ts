import BaseService, {API_API_SERVER} from "./base.service";
import {authKeycloak} from "../keycloak";
import {EegParticipant} from "../models/members.model";
import {AuthService} from "./auth.service";

export class ParticipantService extends BaseService {
  public constructor(authService: AuthService) {
    super(authService);
  }

  /*async archiveParticipant(tenant: string, id: string): Promise<any> {
    const token = await this.lookupToken()
    return fetch(`${API_API_SERVER}/participant/${id}`, {
      method: 'DELETE',
      headers: {
        ...this.getSecureHeaders(token, tenant),
        'Accept-Type': 'application/json'
      },
    }).then(this.handleErrors).then(res => res.json());
  }*/
  
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
}

// export const participantService = new ParticipantService(authKeycloak);