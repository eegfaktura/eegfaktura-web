import {describe, expect, it} from "vitest";
import {reducer} from "../../store/eeg/reducers/eeg.reducer";
import {fetchEegModel, updateEegModel} from "../../store/eeg/actions/eeg.action";
import {initialState} from "../../store/eeg/states/eeg.state";

const saveFailed = (message: string) =>
  reducer(initialState, updateEegModel.rejected(new Error(message), "req", {tenant: "TE100200", eeg: {}}))
const loadFailed = (message: string) =>
  reducer(initialState, fetchEegModel.rejected(new Error(message), "req", {tenant: "TE100200"}))

describe("eeg reducer: error texts (261024-ca7)", () => {
  it("a failed save names the save, not the load", () => {
    const message = saveFailed("Bad Gateway").error?.message
    expect(message).toBe("Die Änderung der EEG-Daten konnte nicht gespeichert werden. (Bad Gateway)")
    expect(message).not.toContain("Laden")
  })

  it("a failed save never shows a raw i18n key", () => {
    expect(saveFailed("Failed to fetch").error?.message).not.toContain("_eeg_")
  })

  it("a known load error keeps its text", () => {
    expect(loadFailed("E_1001").error?.message).toBe("Die EEG wurde noch nicht angelegt!")
  })

  it("an unknown load error shows a German text instead of the raw i18n key", () => {
    expect(loadFailed("Failed to fetch").error?.message)
      .toBe("Die EEG-Daten konnten nicht geladen werden. (Failed to fetch)")
  })
})
