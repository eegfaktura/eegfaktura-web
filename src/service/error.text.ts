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

// backend answers 409 with code 1109 when a metering point of the member is or was registered at the grid operator
export const deleteParticipantErrTxt = (error: any): string => error?.data?.error?.code === 1109
  ? "Das Mitglied hat Zählpunkte, die beim Netzbetreiber angemeldet sind oder waren, und kann nicht gelöscht werden."
  : "Das Mitglied konnte nicht gelöscht werden."

// backend codes whose message is already the text for the user: 1206 the metering point is already at this member
// (platform#247), 1207 it is active at another member, 1064 the import sheet is missing, 2000 invalid input such as an
// invalid e-mail address. The key lookup below cannot work for them, because "error" is that sentence; a general
// fallback to "message" would show raw database texts of other codes (e.g. 1111).
const USER_TEXT_CODES = [1206, 1207, 1064, 2000]

export const determineErrTxt = (error: any): string => {
  if (error instanceof ErrorResponse) {
    if (USER_TEXT_CODES.includes(error.error.code) && error.error.message) {
      return error.error.message
    }
    return i18n.t("E_" + error.error.code + "_" + error.error.error, { ns: 'error' })
  }
  return error
}