import {beforeEach, describe, expect, it, vi} from "vitest";
import React from "react";
import {fireEvent, render, screen, waitFor} from "@testing-library/react";
import SettlementIntervalChangeDialog, {
  SETTLEMENT_INTERVAL_HELP_URL
} from "../../../components/dialogs/SettlementIntervalChange.dialog";
import {Api} from "../../../service";
import {Eeg, SettlementIntervalResult} from "../../../models/eeg.model";

// platform#230: the interval change dialog checks with billing's state first and saves only after the confirmation

const billingState = {finalPeriods: ["Abr_YM-2026-3"], runningPeriods: []}
const allowed: SettlementIntervalResult = {
  allowed: true, effectiveFrom: "2026-04-01", lastFinalPeriod: "Abr_YM-2026-3",
  message: "Das neue Intervall gilt ab 1. April 2026.", earliestFrom: null, eeg: null,
}
const blocked: SettlementIntervalResult = {
  allowed: false, effectiveFrom: null, lastFinalPeriod: "Abr_YM-2026-2",
  message: "Bis März 2026 muss noch im bisherigen Intervall abgerechnet werden. Ein Wechsel ist dann ab 1. April 2026 möglich.",
  earliestFrom: "2026-04-01", eeg: null,
}
const immediate: SettlementIntervalResult = {
  allowed: true, effectiveFrom: null, lastFinalPeriod: null,
  message: "Das neue Intervall gilt sofort, es gibt noch keine endgültige Abrechnung.", earliestFrom: null, eeg: null,
}

const fetchSettlementState = vi.fn()
const changeSettlementInterval = vi.fn()

const open = (onDone = vi.fn()) => {
  render(<SettlementIntervalChangeDialog tenant="TE100200" current="MONTHLY" next="QUARTER" onDone={onDone}/>)
  return onDone
}
const confirmDisabled = () => (screen.getByText("Wechseln").closest("ion-button") as HTMLIonButtonElement).disabled

describe("SettlementIntervalChangeDialog (platform#230)", () => {
  beforeEach(() => {
    fetchSettlementState.mockReset().mockResolvedValue(billingState)
    changeSettlementInterval.mockReset()
    Api.eegService = {fetchSettlementState, changeSettlementInterval} as unknown as typeof Api.eegService
  })

  it("checks with billing's state (dryRun) and shows old, new, from when, last final period and the hints", async () => {
    changeSettlementInterval.mockResolvedValue(allowed)
    open()
    await screen.findByText(allowed.message)
    expect(fetchSettlementState).toHaveBeenCalledWith("TE100200")
    expect(changeSettlementInterval).toHaveBeenCalledWith("TE100200", "QUARTER", true, billingState)
    expect(screen.getByText("Bisher: Monatlich")).toBeTruthy()
    expect(screen.getByText("Neu: Vierteljährlich")).toBeTruthy()
    expect(screen.getByText("Zuletzt endgültig abgerechnet: März 2026")).toBeTruthy()
    expect(screen.getByText("Bestehende Belege, Nummern und Exporte bleiben unverändert.")).toBeTruthy()
    expect(screen.getByText("Mitgliedsbeitrag, Zählpunktgebühr und kostenlose Energie (kWh) gelten je Abrechnung. "
      + "Mit einem anderen Intervall ändert sich der Jahresbetrag, wenn der Tarif gleich bleibt. Bitte die Tarife prüfen."))
      .toBeTruthy()
    expect(screen.getByText("Mehr dazu im Handbuch").getAttribute("href")).toBe(SETTLEMENT_INTERVAL_HELP_URL)
    expect(confirmDisabled()).toBe(false)
  })

  it("confirming saves without dryRun and hands the result on", async () => {
    const saved = {...allowed, eeg: {id: "TE100200", settlementInterval: "QUARTER"} as Eeg}
    changeSettlementInterval.mockResolvedValueOnce(allowed).mockResolvedValueOnce(saved)
    const onDone = open()
    await screen.findByText(allowed.message)
    fireEvent.click(screen.getByText("Wechseln"))
    await waitFor(() => expect(onDone).toHaveBeenCalledWith(saved))
    expect(changeSettlementInterval).toHaveBeenLastCalledWith("TE100200", "QUARTER", false, billingState)
  })

  it("a refused change shows the reason and the earliest start and cannot be confirmed", async () => {
    changeSettlementInterval.mockResolvedValue(blocked)
    open()
    await screen.findByText(blocked.message)
    expect(screen.getByText("Frühestmöglicher Beginn: 1. April 2026")).toBeTruthy()
    expect(screen.getByText("Zuletzt endgültig abgerechnet: Februar 2026")).toBeTruthy()
    expect(confirmDisabled()).toBe(true)
  })

  it("before the first final run the change applies at once", async () => {
    changeSettlementInterval.mockResolvedValue(immediate)
    open()
    await screen.findByText(immediate.message)
    expect(screen.getByText("Zuletzt endgültig abgerechnet: noch nichts")).toBeTruthy()
    expect(screen.queryByText(/Frühestmöglicher Beginn/)).toBeNull()
    expect(confirmDisabled()).toBe(false)
  })

  it("cancel saves nothing and hands no result on", async () => {
    changeSettlementInterval.mockResolvedValue(allowed)
    const onDone = open()
    await screen.findByText(allowed.message)
    fireEvent.click(screen.getByText("Abbrechen"))
    expect(onDone).toHaveBeenCalledWith()
    expect(changeSettlementInterval).toHaveBeenCalledTimes(1)
  })

  it("without billing's state there is no check and no confirmation", async () => {
    fetchSettlementState.mockRejectedValue(new Error("Bad Gateway"))
    open()
    await screen.findByText("Der Wechsel kann gerade nicht geprüft werden: Bad Gateway")
    expect(changeSettlementInterval).not.toHaveBeenCalled()
    expect(confirmDisabled()).toBe(true)
  })

  it("a refusal on saving (409, e.g. a run started meanwhile) shows the reason and stays open", async () => {
    const reason = "Für März 2026 läuft gerade eine Berechnung. Bitte nach deren Ende erneut versuchen."
    changeSettlementInterval.mockResolvedValueOnce(allowed).mockRejectedValueOnce(new Error(reason))
    const onDone = open()
    await screen.findByText(allowed.message)
    fireEvent.click(screen.getByText("Wechseln"))
    await screen.findByText(`Der Wechsel wurde nicht gespeichert: ${reason}`)
    expect(onDone).not.toHaveBeenCalled()
    expect(confirmDisabled()).toBe(true)
  })
})
