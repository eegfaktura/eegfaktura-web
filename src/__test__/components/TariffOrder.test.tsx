import {describe, expect, it, vi} from "vitest";
import {act, fireEvent, screen} from "@testing-library/react";
import {renderWithProviders} from "../test-utils";
import {EegTariff} from "../../models/eeg.model";
import {compareTariffs, ratesSelector, selectedRateSelector} from "../../store/rate";
import {fetchRatesModel, selectRate} from "../../store/rate";
import "../../util/I18n";
import {MemoryRouter} from "react-router";

vi.mock("../../store/hook/Eeg.provider", () => ({useTenant: () => ({tenant: "RC100100"})}))
// the detail pane is not part of this test
vi.mock("../../components/RateDetailPane.component", () => ({default: () => <div/>}))

import RatesPage from "../../pages/Rates.page";

// the page holds an UnsavedChangesGuard (Prompt), which needs a router
const Page = () => <MemoryRouter><RatesPage/></MemoryRouter>

const tariff = (id: string, type: EegTariff["type"], name: string) => ({id, type, name, centPerKWh: 10} as EegTariff)
const rates = [
  tariff("1", "EEG", "Beitritt 2 ZP"), tariff("2", "VZP", "Sonnenstrom-Verkauf"), tariff("3", "VZP", "Verkauf"),
  tariff("4", "EZP", "Einkauf"), tariff("5", "EEG", "Beitritt 10 ZP"), tariff("6", "EEG", "beitritt 1 ZP"),
]

const headerButtons = (container: HTMLElement) => container.querySelectorAll(".header-fav-button")
// the search bar opens with the magnifier, as in the member list
const openSearch = (container: HTMLElement) => {
  if (!container.querySelector("ion-searchbar")) fireEvent.click(headerButtons(container)[0])
  return container.querySelector("ion-searchbar") as HTMLElement
}

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
    const {store} = renderWithProviders(<Page/>)
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
    const {store} = renderWithProviders(<Page/>)
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
    const {store} = renderWithProviders(<Page/>)
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

  it("searches the tariff names and opens a collapsed group with hits", () => {
    const {store, container} = renderWithProviders(<Page/>)
    act(() => { store.dispatch(fetchRatesModel.fulfilled({rates}, "req", {tenant: "RC100100"} as any)) })
    fireEvent.click(screen.getByRole("button", {name: /Verbrauchertarife/}))
    expect(screen.queryByText("Sonnenstrom-Verkauf")).toBeNull()
    expect(container.querySelector("ion-searchbar")).toBeNull()
    const search = openSearch(container)
    act(() => { search.dispatchEvent(new CustomEvent("ionInput", {detail: {value: "VERKAUF"}})) })
    expect(screen.getByText("Sonnenstrom-Verkauf")).toBeTruthy()
    expect(screen.getByText("Verkauf")).toBeTruthy()
    // groups without a hit are hidden
    expect(screen.queryByText("Mitgliedstarife")).toBeNull()
    expect(screen.queryByText("Einkauf")).toBeNull()
    act(() => { search.dispatchEvent(new CustomEvent("ionInput", {detail: {value: "gibt es nicht"}})) })
    expect(screen.getByText("Kein Tarif gefunden.")).toBeTruthy()
    act(() => { search.dispatchEvent(new CustomEvent("ionInput", {detail: {value: ""}})) })
    // back to the state before the search: the consumer group is still collapsed
    expect(screen.queryByText("Sonnenstrom-Verkauf")).toBeNull()
    expect(screen.getByText("Beitritt 2 ZP")).toBeTruthy()
  })

  const searchFor = (container: HTMLElement, value: string) =>
    { const bar = openSearch(container); act(() => { bar.dispatchEvent(new CustomEvent("ionInput", {detail: {value}})) }) }

  it("ignores a click on a heading while searching, so clearing the search restores the state before", () => {
    const {store, container} = renderWithProviders(<Page/>)
    act(() => { store.dispatch(fetchRatesModel.fulfilled({rates}, "req", {tenant: "RC100100"} as any)) })
    searchFor(container, "Beitritt")
    fireEvent.click(screen.getByRole("button", {name: /Mitgliedstarife/}))
    searchFor(container, "")
    expect(screen.getByText("Beitritt 2 ZP")).toBeTruthy()
  })

  it("keeps the selected tariff visible in a collapsed group and outside the hits", () => {
    const {store, container} = renderWithProviders(<Page/>)
    act(() => { store.dispatch(fetchRatesModel.fulfilled({rates}, "req", {tenant: "RC100100"} as any)) })
    fireEvent.click(screen.getByRole("button", {name: /Mitgliedstarife/}))
    act(() => { store.dispatch(selectRate(rates[0])) })
    expect(screen.getByText("Beitritt 2 ZP")).toBeTruthy()
    expect(screen.queryByText("Beitritt 10 ZP")).toBeNull()
    searchFor(container, "Einkauf")
    expect(screen.getByText("Beitritt 2 ZP")).toBeTruthy()
    expect(screen.getByText("Einkauf")).toBeTruthy()
  })

  it("searches without regard to accents", () => {
    const {store, container} = renderWithProviders(<Page/>)
    act(() => { store.dispatch(fetchRatesModel.fulfilled({rates: [...rates, tariff("8", "EZP", "Überschuss")]}, "req", {tenant: "RC100100"} as any)) })
    searchFor(container, "uberschuss")
    expect(screen.getByText("Überschuss")).toBeTruthy()
  })

  it("starts a new tariff with the plus button next to the magnifier", () => {
    const {store, container} = renderWithProviders(<Page/>)
    act(() => { store.dispatch(fetchRatesModel.fulfilled({rates}, "req", {tenant: "RC100100"} as any)) })
    fireEvent.click(headerButtons(container)[1])
    expect(selectedRateSelector(store.getState())).toMatchObject({id: "", name: "", type: "EEG"})
  })

  it("clears the search when the magnifier closes the search bar", () => {
    const {store, container} = renderWithProviders(<Page/>)
    act(() => { store.dispatch(fetchRatesModel.fulfilled({rates}, "req", {tenant: "RC100100"} as any)) })
    const bar = openSearch(container)
    act(() => { bar.dispatchEvent(new CustomEvent("ionInput", {detail: {value: "Einkauf"}})) })
    expect(screen.queryByText("Beitritt 2 ZP")).toBeNull()
    fireEvent.click(headerButtons(container)[0])
    expect(container.querySelector("ion-searchbar")).toBeNull()
    expect(screen.getByText("Beitritt 2 ZP")).toBeTruthy()
  })

  it("ignores a late debounced input after the search bar was closed", () => {
    const {store, container} = renderWithProviders(<Page/>)
    act(() => { store.dispatch(fetchRatesModel.fulfilled({rates}, "req", {tenant: "RC100100"} as any)) })
    const bar = openSearch(container)
    fireEvent.click(headerButtons(container)[0])
    // the debounce timer of the closed bar fires its ionInput only now
    act(() => { bar.dispatchEvent(new CustomEvent("ionInput", {detail: {value: "Einkauf"}})) })
    expect(screen.getByText("Beitritt 2 ZP")).toBeTruthy()
  })
})
