import { LocalDate } from "local-date";
import {AccountInfo, Address, Contact, Optionals} from "./eeg.model";
import {Metering} from "./meteringpoint.model";
import {Moment} from "moment";

export interface EegParticipant {
  id: string;
  participantNumber:string,
  tariffId?: string
  participantSince: LocalDate
  titleBefore?: string;
  titleAfter?: string;
  firstname: string;
  lastname?: string;
  vatNumber?: string;
  taxNumber?: string;
  residentAddress: Address;
  billingAddress: Address;
  contact: Contact;
  accountInfo: AccountInfo;
  optionals: Optionals;
  meters: Metering[];
  status: 'NEW' | 'PENDING' | 'ACTIVE' | 'DISUSED'
  role: 'EEG_ADMIN' | 'EEG_USER'
  businessRole: 'EEG_PRIVATE' | 'EEG_BUSINESS'
}

export interface ContractInfo {
  id: string;
  userId: string;
  name: string;
  fileCategory: string;
  fileDownloadUri: string;
  createdAt: string;
}