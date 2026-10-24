import {describe, expect, it, vi} from "vitest";
import {act, fireEvent, screen} from "@testing-library/react";
import {renderWithProviders} from "../../test-utils";

let tenants: string[] = ["TE100200"]
vi.mock("../../../store/hook/AuthProvider", () => ({useTenants: () => tenants}))

import EegLoadStateComponent from "../../../components/EegLoadState.component";
import {EegContext} from "../../../store/hook/Eeg.provider";
import {fetchEegModel} from "../../../store/eeg";

const render = (refresh = vi.fn()) => {
  const r = renderWithProviders(<EegContext.Provider value={{refresh} as any}><EegLoadStateComponent/></EegContext.Provider>)
  return {...r, refresh}
}

describe("EegLoadState (261024-ca11)", () => {
  it("shows a spinner while the EEG loads, not \"Keine aktive EEG geladen\"", () => {
    tenants = ["TE100200"]
    const {container} = render()
    expect(container.querySelector("ion-spinner")).toBeTruthy()
    expect(screen.queryByText("Keine aktive EEG geladen")).toBeNull()
  })

  it("shows the load error with \"Erneut versuchen\", which loads again", () => {
    tenants = ["TE100200"]
    const {store, refresh, container} = render()
    act(() => { store.dispatch(fetchEegModel.rejected(new Error("Bad Gateway"), "req", {tenant: "TE100200"})) })
    expect(screen.getByText("Die EEG-Daten konnten nicht geladen werden. (Bad Gateway)")).toBeTruthy()
    expect(container.querySelector("ion-spinner")).toBeNull()
    fireEvent.click(screen.getByText("Erneut versuchen"))
    expect(refresh).toHaveBeenCalledTimes(1)
  })

  it("a new load replaces the error by the spinner", () => {
    tenants = ["TE100200"]
    const {store, container} = render()
    act(() => { store.dispatch(fetchEegModel.rejected(new Error("Bad Gateway"), "req", {tenant: "TE100200"})) })
    act(() => { store.dispatch(fetchEegModel.pending("req2", {tenant: "TE100200"})) })
    expect(container.querySelector("ion-spinner")).toBeTruthy()
  })

  it("without any community for the account it says so", () => {
    tenants = []
    render()
    expect(screen.getByText("Keine aktive EEG geladen")).toBeTruthy()
  })
})

describe("EegLoadState is a page of the outlet (261024-ca11, review 1)", () => {
  it("renders inside an IonPage in every state, so it replaces the previous page", () => {
    tenants = ["TE100200"]
    const {container, store} = render()
    expect(container.querySelector(".ion-page ion-spinner")).toBeTruthy()
    act(() => { store.dispatch(fetchEegModel.rejected(new Error("Bad Gateway"), "req", {tenant: "TE100200"})) })
    expect(container.querySelector(".ion-page ion-button")).toBeTruthy()
  })

  it("also the empty state", () => {
    tenants = []
    const {container} = render()
    expect(container.querySelector(".ion-page")?.textContent).toContain("Keine aktive EEG geladen")
  })
})
