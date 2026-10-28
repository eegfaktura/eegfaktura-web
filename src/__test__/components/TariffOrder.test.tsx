import {describe, expect, it, vi} from "vitest";
import {act, fireEvent, screen} from "@testing-library/react";
import {renderWithProviders} from "../test-utils";
import {EegTariff} from "../../models/eeg.model";
import {compareTariffs, ratesSelector} from "../../store/rate";
import {fetchRatesModel} from "../../store/rate";
import "../../util/I18n";

vi.mock("../../store/hook/Eeg.provider", () => ({useTenant: () => ({tenant: "RC100100"})}))
// the detail pane is not part of this test
vi.mock("../../components/RateDetailPane.component", () => ({default: () => <div/>}))

import RatesPage from "../../pages/Rates.page";

const tariff = (id: string, type: EegTariff["type"], name: string) => ({id, type, name, centPerKWh: 10} as EegTariff)
const rates = [
  tariff("1", "EEG", "Beitritt 2 ZP"), tariff("2", "VZP", "Sonnenstrom-Verkauf"), tariff("3", "VZP", "Verkauf"),
  tariff("4", "EZP", "Einkauf"), tariff("5", "EEG", "Beitritt 10 ZP"), tariff("6", "EEG", "beitritt 1 ZP"),
]

describe("tariff order (pilot group 2026-10-28)", () => {
  it("sorts by kind as in the tariff form, then by name with numbers in natural order", () => {
    expect([...rates].sort(compareTariffs).map(r => r.name)).toEqual([
      "beitritt 1 ZP", "Beitritt 2 ZP", "Beitritt 10 ZP", "Einkauf", "Sonnenstrom-Verkauf", "Verkauf",
    ])
  })

  it("gives every tariff list the sorted order", () => {
    const {store} = renderWithProviders(<div/>)
    act(() => { store.dispatch(fetchRatesModel.fulfilled({rates}, "req", {tenant: "RC100100"} as any)) })
    expect(ratesSelector(store.getState()).map(r => r.id)).toEqual(["6", "1", "5", "4", "2", "3"])
  })

  it("groups the tariff page under the headings of the tariff form", () => {
    const {store} = renderWithProviders(<RatesPage/>)
    act(() => { store.dispatch(fetchRatesModel.fulfilled({rates}, "req", {tenant: "RC100100"} as any)) })
    const text = document.body.textContent ?? ""
    const at = (s: string) => text.indexOf(s)
    expect(screen.getByText("Mitgliedstarife")).toBeTruthy()
    expect(screen.getByText("(3)")).toBeTruthy()
    expect(at("Mitgliedstarife")).toBeLessThan(at("beitritt 1 ZP"))
    expect(at("Beitritt 10 ZP")).toBeLessThan(at("Erzeugertarife"))
    expect(at("Erzeugertarife")).toBeLessThan(at("Einkauf"))
    expect(at("Einkauf")).toBeLessThan(at("Verbrauchertarife"))
    expect(at("Verbrauchertarife")).toBeLessThan(at("Sonnenstrom-Verkauf"))
  })

  it("shows a tariff of an unknown kind at the end under „Sonstige Tarife“ instead of hiding it", () => {
    const {store} = renderWithProviders(<RatesPage/>)
    act(() => { store.dispatch(fetchRatesModel.fulfilled({rates: [...rates, tariff("7", "AKONTO", "Alt")]}, "req", {tenant: "RC100100"} as any)) })
    const text = document.body.textContent ?? ""
    expect(text.indexOf("Sonstige Tarife")).toBeGreaterThan(text.indexOf("Verkauf"))
    expect(text.indexOf("Alt")).toBeGreaterThan(text.indexOf("Sonstige Tarife"))
  })

  it("keeps a fixed order for equal names", () => {
    const a = tariff("b", "VZP", "Strom"), b = tariff("a", "VZP", "strom")
    expect([a, b].sort(compareTariffs).map(r => r.id)).toEqual(["a", "b"])
  })

  it("collapses and expands a group with its heading", () => {
    const {store} = renderWithProviders(<RatesPage/>)
    act(() => { store.dispatch(fetchRatesModel.fulfilled({rates}, "req", {tenant: "RC100100"} as any)) })
    const heading = screen.getByRole("button", {name: /Mitgliedstarife/})
    expect(heading.getAttribute("aria-expanded")).toBe("true")
    fireEvent.click(heading)
    expect(heading.getAttribute("aria-expanded")).toBe("false")
    expect(screen.queryByText("Beitritt 2 ZP")).toBeNull()
    // the other groups stay open
    expect(screen.getByText("Einkauf")).toBeTruthy()
    fireEvent.click(heading)
    expect(screen.getByText("Beitritt 2 ZP")).toBeTruthy()
  })
})
