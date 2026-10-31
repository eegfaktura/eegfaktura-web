import {HttpError} from "./base.service";
import i18n from "../util/I18n";

export interface IErrorResponse {
  error: {code: number, error: string, message: string}
}

export class ErrorResponse {
  constructor(public error : {code: number, error: string, message: string}) {
  }
}

// a German error text with the reason of the failure; rejectWithValue's generic "Rejected" is left out
export const withReason = (text: string, reason: string | undefined) =>
  reason && reason !== "Rejected" ? `${text} (${reason})` : text

// backend answers 409 with code 1109 when a metering point of the member took part or is being registered
export const deleteParticipantErrTxt = (error: any): string => error?.data?.error?.code === 1109
  ? "Das Mitglied hat Zählpunkte, die schon aktiv waren oder gerade beim Netzbetreiber angemeldet werden, und kann nicht gelöscht werden."
  : "Das Mitglied konnte nicht gelöscht werden."

export const determineErrTxt = (error: any): string => {
  if (error instanceof ErrorResponse) {
    return i18n.t("E_" + error.error.code + "_" + error.error.error, { ns: 'error' })
  }
  return error
}