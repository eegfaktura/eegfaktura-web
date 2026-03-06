

export type InvestigatorCP = {
  meteringPoint: string
  direction: string
  name: string
}

export type ExcelReportRequest = {
  start: number;
  end: number;
  communityId: string;
  // cps: InvestigatorCP[];
  cps: ParticipantCp[];
}

export type CpPeriodType = {
  begin: string;
  end: string;
}

export type ParticipantCp = {
  meteringPoint: string
  direction: string
  name: string
  activeSince: number
  inactiveSince: number
}