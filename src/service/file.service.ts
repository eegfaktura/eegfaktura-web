import BaseService, {FILESTORE_API_SERVER} from "./base.service";
import {ContractInfo} from "../models/members.model";
import {deleteContractFilesMutation, loadContractFilesQuery, uploadContractFileMutation} from "./graphql-query";
import {AuthService} from "./auth.service";

export class FileService extends BaseService {
  public constructor(authService: AuthService) {
    super(authService);
  }

  // Filestore Services
  async loadContractDocumentInfos(tenant: string, participantId: string): Promise<ContractInfo[]> {
    const token = await this.lookupToken()
    return await fetch(`${FILESTORE_API_SERVER}/graphql`, {
      method: 'POST',
      headers: {
        ...this.getSecureHeaders(token, tenant),
        'Accept': 'application/json',
        'Content-Type': "application/json"
      },
      body: JSON.stringify(loadContractFilesQuery(tenant, participantId))
    }).then(this.handleErrors).then(res => res.json()).then(res => res.data.files);
  }

  // Uploads every file on its own (the mutation takes one file). Continues after a failed file and
  // rejects at the end with the names and messages of all failed files.
  async uploadContractDocuments(tenant: string, participantId: string, files: File[]): Promise<ContractInfo[]> {
    const uploaded: ContractInfo[] = []
    const failed: string[] = []
    for (const file of files) {
      try {
        uploaded.push(await this.uploadContractDocument(tenant, participantId, file))
      } catch (e) {
        failed.push(`${file.name}: ${(e as Error).message}`)
      }
    }
    if (failed.length > 0) {
      throw new Error(failed.join("; "))
    }
    return uploaded
  }

  private async uploadContractDocument(tenant: string, participantId: string, file: File): Promise<ContractInfo> {
    const token = await this.lookupToken()
    const res = await fetch(`${FILESTORE_API_SERVER}/graphql`, {
      method: 'POST',
      headers: {
        ...this.getSecureHeaders(token, tenant),
        'Accept': 'application/json',
      },
      body: uploadContractFileMutation(tenant, file, participantId)
    }).then(this.handleErrors).then(res => res.json());

    if (res.errors && res.errors.length > 0) {
      throw new Error(res.errors[0].message)
    }
    const addFile = res.data?.addFile
    if (!addFile || addFile.__typename === "AddFileError" || !addFile.id) {
      throw new Error(addFile?.message || "Upload fehlgeschlagen")
    }
    return addFile as ContractInfo
  }

  async deleteContractDocuments(tenant: string, fileId: string) {
    const token = await this.lookupToken()
    return await fetch(`${FILESTORE_API_SERVER}/graphql`, {
      method: 'POST',
      headers: {
        ...this.getSecureHeaders(token, tenant),
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(deleteContractFilesMutation(fileId))
    }).then(this.handleFilestoreResponse);

  }

  async downloadDocument(tenant: string, fileId: string): Promise<Blob> {
    const token = await this.lookupToken()
    return await fetch(`${FILESTORE_API_SERVER}/filestore/${fileId}`, {
      method: 'GET',
      headers: {
        ...this.getSecureHeaders(token, tenant),
      },
    }).then(this.handleErrors).then(res => res.blob());
  }

}

// export const fileService = new FileService(authKeycloak);