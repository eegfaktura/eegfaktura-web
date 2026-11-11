import {describe, expect, it} from "vitest";
import "../../util/I18n";
import {determineErrTxt, ErrorResponse} from "../../service/error.text";

// The backend's revoke refusals (5011-5014) carry the German text for the user in "message": the web shows it instead
// of the raw key "E_<code>_<message>".
describe("determineErrTxt", () => {
  const response = (code: number, message: string) => new ErrorResponse({code, error: message, message})

  it("shows the revoke refusals readable", () => {
    expect(determineErrTxt(response(5011, "Die Begründung ist zu lang (höchstens 50 Zeichen).")))
      .toBe("Die Begründung ist zu lang (höchstens 50 Zeichen).")
    expect(determineErrTxt(response(5013, "Mindestens ein Zählpunkt hat keine aktive Datenfreigabe dieses Mitglieds.")))
      .toBe("Mindestens ein Zählpunkt hat keine aktive Datenfreigabe dieses Mitglieds.")
    expect(determineErrTxt(response(5014, "Das Ende der Datenfreigabe fehlt."))).toBe("Das Ende der Datenfreigabe fehlt.")
    expect(determineErrTxt(response(5012, "Mindestens ein Zählpunkt gehört nicht zu diesem Mitglied.")))
      .toBe("Mindestens ein Zählpunkt gehört nicht zu diesem Mitglied.")
  })

  it("keeps the existing per-message texts and the raw key of an unknown error", () => {
    expect(determineErrTxt(response(4002, "Tariff is currently used")))
      .toBe("Der Tarif wird noch von Mitgliedern oder Zählpunkten verwendet und kann nicht gelöscht werden.")
    expect(determineErrTxt(response(9999, "unknown"))).toBe("E_9999_unknown")
  })
})
