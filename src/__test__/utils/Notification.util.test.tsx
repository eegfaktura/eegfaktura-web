import {describe, expect, it} from "vitest";
import {render} from "@testing-library/react";
import {buildNotificationText} from "../../util/Notificaton.util";
import {Message} from "../../models/eeg.model";

const mail = (kind: string, code: string, message: string, mp = "zp-active") =>
  ({message: new Message({type: "Mail", messages: [{kind, metering_point: mp, message_code: code, message}]})})
const text = (n: object) => render(<>{buildNotificationText("NOTIFICATION", "EDA_PROCESS", n)}</>).container.textContent

describe("buildNotificationText — Mail", () => {
  it("shows the notice about a changed default as its own text, not as a failed mail", () => {
    const t = text(mail("INFO", "I_MAIL_TEMPLATE_DEFAULT", "Der Standardtext der Mail „Zählpunkt aktiv“ wurde geändert."))
    expect(t).toBe("E-Mail-Texte: Der Standardtext der Mail „Zählpunkt aktiv“ wurde geändert.")
  })

  it("shows the fallback notice of a customised mail as its own text", () => {
    const t = text(mail("ERROR", "E_MAIL_TEMPLATE", "Ihre angepasste Mail „Zählpunkt aktiv“ konnte nicht verwendet werden."))
    expect(t).toBe("E-Mail-Texte: Ihre angepasste Mail „Zählpunkt aktiv“ konnte nicht verwendet werden.")
  })

  it("keeps the failed-mail text for other mail errors", () => {
    expect(text(mail("ERROR", "E_MAIL", "invalid address", "AT001"))).toBe("Mailversand fehlgeschlagen: AT001 — invalid address")
  })

  it("shows template notices and other mail errors of the same notification", () => {
    const n = {message: new Message({type: "Mail", messages: [
      {kind: "INFO", metering_point: "zp-active", message_code: "I_MAIL_TEMPLATE_DEFAULT", message: "Neuer Standard."},
      {kind: "ERROR", metering_point: "AT001", message_code: "E_MAIL", message: "invalid address"},
    ]})}
    expect(text(n)).toBe("E-Mail-Texte: Neuer Standard.Mailversand fehlgeschlagen: AT001 — invalid address")
  })

  it("shows an unconfirmed send as not confirmed, not as failed", () => {
    const t = text(mail("WARNING", "W_MAIL_UNCONFIRMED",
      "Zeitüberschreitung – die Mail wurde vermutlich trotzdem verschickt. Vor einem erneuten Versand bitte beim Mitglied nachfragen.", "AT001"))
    expect(t).toBe("Mailversand nicht bestätigt: AT001 — Zeitüberschreitung – die Mail wurde vermutlich trotzdem verschickt. Vor einem erneuten Versand bitte beim Mitglied nachfragen.")
    expect(t).not.toContain("fehlgeschlagen")
  })

  it("shows an unconfirmed send and a failed mail of the same notification separately", () => {
    const n = {message: new Message({type: "Mail", messages: [
      {kind: "WARNING", metering_point: "AT001", message_code: "W_MAIL_UNCONFIRMED", message: "Zeitüberschreitung."},
      {kind: "ERROR", metering_point: "AT002", message_code: "E_MAIL", message: "invalid address"},
    ]})}
    expect(text(n)).toBe("Mailversand nicht bestätigt: AT001 — Zeitüberschreitung.Mailversand fehlgeschlagen: AT002 — invalid address")
  })
})
