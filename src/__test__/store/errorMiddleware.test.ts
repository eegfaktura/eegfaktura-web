import { describe, it, expect } from "vitest";
import {configureStore} from "@reduxjs/toolkit";
import {errorMiddleware, reducer} from "../../store/store";
import {selectError} from "../../store/eeg/selectors/eeg.selector";
import {fetchRatesModel} from "../../store/rate";
import {updateParticipantPartial, updateParticipant} from "../../store/participant";
import {fetchEnergyReportV2} from "../../store/energy";

const newStore = () => configureStore({
  reducer,
  middleware: (getDefault) => getDefault({serializableCheck: false}).concat(errorMiddleware),
})

describe("errorMiddleware", () => {
  it("reports a failed load that no caller shows", () => {
    const store = newStore()
    store.dispatch(fetchRatesModel.rejected(new Error("Bad Gateway"), "req", {tenant: "TE100200"}))
    expect(selectError(store.getState())).toEqual({hasError: true, error: {message: "Die Tarife konnten nicht geladen werden. (Bad Gateway)"}})
  })

  it("does not show the generic \"Rejected\" text", () => {
    const store = newStore()
    store.dispatch(updateParticipant.rejected(null, "req", {} as any, undefined))
    expect(selectError(store.getState()).error?.message).toBe("Das Mitglied konnte nicht gespeichert werden.")
  })

  it("shows a readable text for a rejected partial update instead of the raw i18n key", () => {
    const store = newStore()
    store.dispatch(updateParticipantPartial.rejected(null, "req", {} as any, new Error("Mitgliedsnummer vergeben")))
    const message = selectError(store.getState()).error?.message
    expect(message).not.toContain("_participant_update")
    expect(message).toBe("Das Mitglied konnte nicht gespeichert werden. (Mitgliedsnummer vergeben)")
  })

  it("reports a failed energy report of the latest request (261024-ca6)", () => {
    const store = newStore()
    store.dispatch(fetchEnergyReportV2.pending("a", {} as any))
    store.dispatch(fetchEnergyReportV2.rejected(new Error("Bad Gateway"), "a", {} as any))
    expect(selectError(store.getState()).error?.message).toBe("Die Energiedaten konnten nicht geladen werden. (Bad Gateway)")
  })

  it("does not report a failed energy report that a newer request replaced", () => {
    const store = newStore()
    store.dispatch(fetchEnergyReportV2.pending("old", {} as any))
    store.dispatch(fetchEnergyReportV2.pending("new", {} as any))
    store.dispatch(fetchEnergyReportV2.rejected(new Error("Bad Gateway"), "old", {} as any))
    expect(selectError(store.getState()).hasError).toBe(false)
  })
})
