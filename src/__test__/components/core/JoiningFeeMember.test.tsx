import {beforeEach, describe, expect, it, vi} from "vitest";
import {act, fireEvent, render, screen} from "@testing-library/react";
import React from "react";

const alert = vi.fn()
const toast = vi.fn()
vi.mock("@ionic/react", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@ionic/react")>()),
  useIonAlert: () => [alert],
  useIonToast: () => [toast],
}))

import "../../../util/I18n";
import JoiningFeeMember from "../../../components/core/JoiningFeeMember.component";
import {Api} from "../../../service";
import {JoiningFeeAlreadyBilledError} from "../../../service/eeg.service";
import {EegTariff, JoiningFeeState} from "../../../models/eeg.model";

// platform#217 + extension 2026-10-27: status line, hint and actions in the member details

const HINT = "Dieses Mitglied wurde schon abgerechnet – die Beitrittsgebühr wird ihm nicht mehr automatisch verrechnet. " +
  "Mit „Beitrittsgebühr nachverrechnen“ lässt sie sich im nächsten Abrechnungslauf verrechnen."
const tariff = (joiningFee: number, extra: Partial<EegTariff> = {}) =>
  ({id: "t1", name: "Mitglied", type: "EEG", joiningFee, ...extra}) as EegTariff
const flush = () => act(async () => { await new Promise(r => setTimeout(r, 0)) })
const entry = (extra: Partial<JoiningFeeState> = {}): JoiningFeeState =>
  ({participantId: "p1", energyBilled: true, joiningFee: null, requested: false, paidExternally: null, ...extra})

const show = async (state: JoiningFeeState[], t: EegTariff = tariff(50), feeInUse = true) => {
  vi.mocked(Api.eegService.fetchJoiningFeeState).mockResolvedValue(state)
  const r = render(<JoiningFeeMember tenant="TE100200" participantId="p1" tariff={t} feeInUse={feeInUse}/>)
  await flush()
  return r
}
const button = (name: string) => screen.queryByText(name)
const confirmAlert = async (values?: any) => {
  const b = alert.mock.lastCall![0].buttons.find((x: any) => x.role === "confirm")
  let result: any
  await act(async () => { result = b.handler(values) })
  await flush()
  return result
}

describe("JoiningFeeMember", () => {
  beforeEach(() => {
    alert.mockReset()
    toast.mockReset()
    Api.eegService = {
      fetchJoiningFeeState: vi.fn(),
      saveJoiningFeeRecord: vi.fn().mockResolvedValue(undefined),
      deleteJoiningFeeRecord: vi.fn().mockResolvedValue(undefined),
    } as unknown as typeof Api.eegService
  })

  it("asks billing nothing and shows nothing when no tariff of the community has a fee", async () => {
    const {container} = await show([], tariff(0), false)
    expect(container).toBeEmptyDOMElement()
    expect(Api.eegService.fetchJoiningFeeState).not.toHaveBeenCalled()
  })

  it("shows nothing when billing fails", async () => {
    vi.mocked(Api.eegService.fetchJoiningFeeState).mockRejectedValue(new Error("503"))
    const {container} = render(<JoiningFeeMember tenant="TE100200" participantId="p1" tariff={tariff(50)} feeInUse={true}/>)
    await flush()
    expect(container).toBeEmptyDOMElement()
  })

  it("member billed with energy: hint, status „nicht verrechnet“ and request after confirming the amount", async () => {
    await show([entry()], tariff(49.9, {joiningFeeUseVat: true, joiningFeeVatInPercent: 20}))
    expect(screen.getByText(HINT)).toBeInTheDocument()
    expect(screen.getByText("Beitrittsgebühr: nicht verrechnet – Mitglied wurde schon abgerechnet")).toBeInTheDocument()
    fireEvent.click(button("Beitrittsgebühr nachverrechnen")!)
    expect(alert.mock.lastCall![0].message).toBe("Die Beitrittsgebühr laut Tarif „Mitglied“ (49,90 € netto, zzgl. 20 % USt) " +
      "wird im nächsten endgültigen Abrechnungslauf verrechnet. Es gilt der Tarifstand beim Abrechnen.")
    expect(Api.eegService.saveJoiningFeeRecord).not.toHaveBeenCalled()
    await confirmAlert()
    expect(Api.eegService.saveJoiningFeeRecord).toHaveBeenCalledWith("TE100200", "p1", {kind: "CHARGE_REQUESTED"})
    expect(Api.eegService.fetchJoiningFeeState).toHaveBeenCalledTimes(2) // reloaded after the action
  })

  it("requested: status, withdraw on confirm, no request and no payment record", async () => {
    await show([entry({requested: true})])
    expect(screen.getByText("Beitrittsgebühr: zur Verrechnung im nächsten Abrechnungslauf vorgemerkt")).toBeInTheDocument()
    expect(screen.queryByText(HINT)).toBeNull()
    expect(button("Beitrittsgebühr nachverrechnen")).toBeNull()
    expect(button("Außerhalb bezahlt erfassen")).toBeNull()
    fireEvent.click(button("Vormerkung zurücknehmen")!)
    await confirmAlert()
    expect(Api.eegService.deleteJoiningFeeRecord).toHaveBeenCalledWith("TE100200", "p1")
  })

  it("records a payment: date required, note optional and trimmed", async () => {
    await show([], tariff(50))
    expect(screen.getByText("Beitrittsgebühr: offen – wird mit der ersten Energieabrechnung verrechnet")).toBeInTheDocument()
    fireEvent.click(button("Außerhalb bezahlt erfassen")!)
    expect(await confirmAlert({paidOn: "", note: "x"})).toBe(false) // the dialog stays open
    expect(toast.mock.lastCall![0].message).toBe("Bitte das Datum der Zahlung angeben.")
    expect(Api.eegService.saveJoiningFeeRecord).not.toHaveBeenCalled()
    await confirmAlert({paidOn: "2026-03-01", note: "  "})
    expect(Api.eegService.saveJoiningFeeRecord).toHaveBeenCalledWith("TE100200", "p1",
      {kind: "PAID_EXTERNALLY", paidOn: "2026-03-01", note: null})
  })

  it("paid outside: status with note, correct (prefilled) and remove; no request", async () => {
    await show([entry({paidExternally: {paidOn: "2026-03-01", note: "bar beim Beitritt"}})])
    expect(screen.getByText("Beitrittsgebühr: außerhalb bezahlt am 01.03.2026 (bar beim Beitritt)")).toBeInTheDocument()
    expect(screen.queryByText(HINT)).toBeNull()
    expect(button("Beitrittsgebühr nachverrechnen")).toBeNull()
    fireEvent.click(button("Zahlung korrigieren")!)
    expect(alert.mock.lastCall![0].inputs.map((i: any) => i.value)).toEqual(["2026-03-01", "bar beim Beitritt"])
    await confirmAlert({paidOn: "2026-03-02", note: "Überweisung"})
    expect(Api.eegService.saveJoiningFeeRecord).toHaveBeenCalledWith("TE100200", "p1",
      {kind: "PAID_EXTERNALLY", paidOn: "2026-03-02", note: "Überweisung"})
    fireEvent.click(button("Zahlung entfernen")!)
    await confirmAlert()
    expect(Api.eegService.deleteJoiningFeeRecord).toHaveBeenCalledTimes(1)
  })

  it("billed: status with the document, no action", async () => {
    await show([entry({joiningFee: {documentNumber: "RG202600012", documentDate: "2026-01-15"}})])
    expect(screen.getByText("Beitrittsgebühr: verrechnet mit RG202600012 vom 15.01.2026")).toBeInTheDocument()
    expect(document.querySelectorAll("ion-button")).toHaveLength(0)
  })

  it("409 (charged meanwhile): a warning toast and the state is reloaded", async () => {
    vi.mocked(Api.eegService.saveJoiningFeeRecord).mockRejectedValue(new JoiningFeeAlreadyBilledError())
    await show([entry()])
    fireEvent.click(button("Beitrittsgebühr nachverrechnen")!)
    await confirmAlert()
    expect(toast.mock.lastCall![0]).toEqual(expect.objectContaining({
      message: "Die Beitrittsgebühr wurde inzwischen verrechnet – die Änderung ist nicht mehr möglich.", color: "warning"}))
    expect(Api.eegService.fetchJoiningFeeState).toHaveBeenCalledTimes(2)
  })

  it("loads once per member across re-renders with new tariff objects", async () => {
    vi.mocked(Api.eegService.fetchJoiningFeeState).mockResolvedValue([entry()])
    const {rerender} = render(<JoiningFeeMember tenant="TE100200" participantId="p1" tariff={tariff(50)} feeInUse={true}/>)
    await flush()
    rerender(<JoiningFeeMember tenant="TE100200" participantId="p1" tariff={tariff(50)} feeInUse={true}/>)
    rerender(<JoiningFeeMember tenant="TE100200" participantId="p1" tariff={tariff(0)} feeInUse={true}/>)
    await flush()
    expect(screen.getByText("Beitrittsgebühr: kein Tarif mit Beitrittsgebühr")).toBeInTheDocument()
    expect(Api.eegService.fetchJoiningFeeState).toHaveBeenCalledTimes(1)
  })
})
