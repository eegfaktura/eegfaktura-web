import {beforeEach, describe, expect, it, vi} from "vitest";
import React from "react";
import {act, fireEvent, screen} from "@testing-library/react";
import {renderWithProviders} from "../../test-utils";

const alert = vi.fn()
const toaster = vi.fn()
vi.mock("@ionic/react", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@ionic/react")>()),
  useIonAlert: () => [alert],
  useIonToast: () => [toaster],
}))

import BillingSendButton, {documentCount, sendMailState} from "../../../components/participantPane/BillingSendButton.component";
import {Api} from "../../../service";
import {sendmailRefusal} from "../../../service/eeg.service";
import {BillingRun} from "../../../models/meteringpoint.model";
import {BillingTotals} from "../../../components/participantPane/BillingTotals.functions";

const run = (extra: Partial<BillingRun> = {}) => ({id: "run-1", runStatus: "DONE", mailStatus: null,
  mailStatusDateTime: null, ...extra} as unknown as BillingRun)
const sum = (count: number) => ({count, net: 0, vat: 0, gross: 0})

const flush = () => act(async () => { await new Promise(r => setTimeout(r, 0)) })
const dismiss = (role: string) => act(async () => alert.mock.lastCall![0].onDidDismiss({detail: {role}}))

describe("sendMailState (platform#228 step 3)", () => {
  it("counts every document of the run once", () => {
    expect(documentCount({invoices: sum(30), creditNotes: sum(12), infos: sum(1)} as BillingTotals)).toBe(43)
    expect(documentCount(undefined)).toBeUndefined()
  })

  it("names the number of mails before the send; without loaded documents it says „alle“", () => {
    expect(sendMailState(run(), 1234)).toEqual({disabled: false, label: "SENDEN",
      message: "Jetzt 1.234 Abrechnungsdokumente per E-Mail an die Mitglieder versenden?"})
    expect(sendMailState(run(), undefined).message)
      .toBe("Jetzt alle Abrechnungsdokumente per E-Mail an die Mitglieder versenden?")
  })

  it("is disabled once billing recorded the send (billing refuses every further send), with the send time", () => {
    const state = sendMailState(run({mailStatus: "SENT", mailStatusDateTime: "2026-10-28T13:05:00.000"}), 43)
    expect(state.disabled).toBe(true)
    expect(state.message).toBeUndefined()
    // naive UTC from billing, shown in local time
    const local = new Date(Date.UTC(2026, 9, 28, 13, 5))
    const hh = String(local.getHours()).padStart(2, "0")
    expect(state.label).toBe(`Bereits versendet am 28.10.2026 ${hh}:05`)
    expect(sendMailState(run({mailStatus: "SENT"}), 43).label).toBe("Bereits versendet")
  })

  it("is disabled while the send runs", () => {
    expect(sendMailState(run({mailStatus: "IN PROGRESS"}), 43)).toEqual({disabled: true, label: "Wird versendet …"})
  })
})

describe("BillingSendButton", () => {
  beforeEach(() => {
    alert.mockReset()
    toaster.mockReset()
    Api.eegService = {
      billingRunSendmail: vi.fn().mockResolvedValue(true),
      fetchBillingRunById: vi.fn().mockResolvedValue(run({mailStatus: "SENT"})),
    } as unknown as typeof Api.eegService
  })

  const click = () => {
    renderWithProviders(<BillingSendButton tenant="TE100200" run={run()} documentCount={43}/>)
    fireEvent.click(screen.getByText("SENDEN"))
  }

  it("asks with the number of mails; cancel sends nothing", async () => {
    click()
    expect(alert.mock.lastCall![0].message).toBe("Jetzt 43 Abrechnungsdokumente per E-Mail an die Mitglieder versenden?")
    await dismiss("cancel")
    expect(Api.eegService.billingRunSendmail).not.toHaveBeenCalled()
  })

  it("a sent run offers no send", () => {
    renderWithProviders(<BillingSendButton tenant="TE100200" run={run({mailStatus: "SENT"})} documentCount={43}/>)
    fireEvent.click(screen.getByText("Bereits versendet"))
    expect(alert).not.toHaveBeenCalled()
    expect(Api.eegService.billingRunSendmail).not.toHaveBeenCalled()
  })

  it("confirm sends the run's mails as before and reloads the run", async () => {
    click()
    await dismiss("confirm")
    await flush()
    expect(Api.eegService.billingRunSendmail).toHaveBeenCalledWith("TE100200", "run-1", undefined)
    expect(Api.eegService.fetchBillingRunById).toHaveBeenCalledWith("TE100200", "run-1", undefined)
    expect(toaster).not.toHaveBeenCalled()
  })

  it("a refused send says so with billing's reason (web 261030-mm1)", async () => {
    vi.mocked(Api.eegService.billingRunSendmail).mockRejectedValue(new Error(
      "Dieser Abrechnungslauf wird gerade bearbeitet (Export, Mailversand oder Löschen) – bitte danach erneut versuchen."))
    click()
    await dismiss("confirm")
    await flush()
    expect(toaster.mock.lastCall![0].color).toBe("danger")
    expect(toaster.mock.lastCall![0].message).toBe("Der Mailversand ist fehlgeschlagen. (Dieser Abrechnungslauf wird "
      + "gerade bearbeitet (Export, Mailversand oder Löschen) – bitte danach erneut versuchen.)")
    expect(Api.eegService.fetchBillingRunById).toHaveBeenCalled()
  })
})

describe("sendmailRefusal", () => {
  it("billing's plain-text refusal (500) is the error", async () => {
    const text = "Mailversand fuer 2026-09 (run-1) nicht moeglich. Status = SENT"
    await expect(sendmailRefusal(new Response(text, {status: 500}))).rejects.toThrow(text)
  })

  it("leaves JSON errors and other answers to handleErrors", async () => {
    const json = new Response(JSON.stringify({httpStatus: 500}), {status: 500})
    expect(await sendmailRefusal(json)).toBe(json)
    const busy = new Response(JSON.stringify({error: "busy"}), {status: 409})
    expect(await sendmailRefusal(busy)).toBe(busy)
    const ok = new Response("protocol", {status: 200})
    expect(await sendmailRefusal(ok)).toBe(ok)
  })
})
