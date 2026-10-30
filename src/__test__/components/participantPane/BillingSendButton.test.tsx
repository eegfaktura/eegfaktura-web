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

import BillingSendButton, {documentCount, sendMailConfirmation} from "../../../components/participantPane/BillingSendButton.component";
import {Api} from "../../../service";
import {BillingRun} from "../../../models/meteringpoint.model";
import {BillingTotals} from "../../../components/participantPane/BillingTotals.functions";

const run = (extra: Partial<BillingRun> = {}) => ({id: "run-1", runStatus: "DONE", mailStatus: null,
  mailStatusDateTime: null, ...extra} as unknown as BillingRun)
const sum = (count: number) => ({count, net: 0, vat: 0, gross: 0})

const flush = () => act(async () => { await new Promise(r => setTimeout(r, 0)) })
const dismiss = (role: string) => act(async () => alert.mock.lastCall![0].onDidDismiss({detail: {role}}))

describe("sendMailConfirmation (platform#228 step 3)", () => {
  it("counts every document of the run once", () => {
    expect(documentCount({invoices: sum(30), creditNotes: sum(12), infos: sum(1)} as BillingTotals)).toBe(43)
    expect(documentCount(undefined)).toBeUndefined()
  })

  it("names the number of mails before the first send", () => {
    const c = sendMailConfirmation(run(), 1234)
    expect(c.label).toBe("SENDEN")
    expect(c.message).toBe("Jetzt 1.234 Abrechnungsdokumente per E-Mail an die Mitglieder versenden?")
  })

  it("reads „Erneut senden“ once the mails were sent and names the earlier send", () => {
    const c = sendMailConfirmation(run({mailStatus: "SENT", mailStatusDateTime: "2026-10-28T09:15:00.000"}), 1)
    expect(c.label).toBe("ERNEUT SENDEN")
    expect(c.confirmText).toBe("Erneut senden")
    expect(c.message).toMatch(/^Die Abrechnungsdokumente dieses Laufs wurden bereits versendet \(2026-10-28, \d\d:15\)\. /)
    expect(c.message).toMatch(/Erneut 1 Abrechnungsdokument per E-Mail an die Mitglieder versenden\?$/)
  })

  it("a send in progress counts as sent; without loaded documents it says „alle“", () => {
    const c = sendMailConfirmation(run({mailStatus: "IN PROGRESS"}), undefined)
    expect(c.label).toBe("ERNEUT SENDEN")
    expect(c.message).toBe("Der Versand für diesen Lauf wurde bereits gestartet. Erneut alle Abrechnungsdokumente "
      + "per E-Mail an die Mitglieder versenden?")
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

  it("confirm sends the run's mails as before and reloads the run", async () => {
    click()
    await dismiss("confirm")
    await flush()
    expect(Api.eegService.billingRunSendmail).toHaveBeenCalledWith("TE100200", "run-1", undefined)
    expect(Api.eegService.fetchBillingRunById).toHaveBeenCalledWith("TE100200", "run-1", undefined)
    expect(toaster).not.toHaveBeenCalled()
  })
})
