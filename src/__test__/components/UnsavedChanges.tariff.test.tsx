import {beforeEach, describe, expect, it, vi} from "vitest";
import {act, fireEvent, screen} from "@testing-library/react";
import React from "react";
import {MemoryRouter, useHistory} from "react-router";
import {useFormContext} from "react-hook-form";
import {renderWithProviders} from "../test-utils";
import {EegTariff} from "../../models/eeg.model";
import {fetchRatesModel, selectedRateSelector} from "../../store/rate";
import "../../util/I18n";

const alert = vi.fn()
vi.mock("@ionic/react", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@ionic/react")>()),
  useIonAlert: () => [alert],
}))
vi.mock("../../store/hook/Eeg.provider", () => ({useTenant: () => ({tenant: "RC100100"})}))
// the tariff form itself is not part of this test: one button changes the name like typing would
vi.mock("../../components/Rate.component", () => ({
  default: () => {
    const {setValue} = useFormContext<EegTariff>()
    return <button onClick={() => setValue("name", "Geändert", {shouldDirty: true})}>ändern</button>
  }
}))

import RatesPage from "../../pages/Rates.page";
import {UNSAVED_CHANGES_MESSAGE, UNSAVED_DISCARD_MESSAGE} from "../../components/core/UnsavedChangesGuard.component";

const rates = [
  {id: "1", type: "EEG", name: "Beitritt", centPerKWh: 10} as EegTariff,
  {id: "2", type: "EEG", name: "Mitglied", centPerKWh: 10} as EegTariff,
]

const setup = () => {
  const userConfirmation = vi.fn((_message: string, callback: (ok: boolean) => void) => callback(false))
  let history: ReturnType<typeof useHistory> | undefined
  const Capture = () => { history = useHistory(); return null }
  const r = renderWithProviders(
    <MemoryRouter initialEntries={["/page/rates"]} getUserConfirmation={userConfirmation}>
      <RatesPage/>
      <Capture/>
    </MemoryRouter>)
  act(() => { r.store.dispatch(fetchRatesModel.fulfilled({rates}, "req", {tenant: "RC100100"} as any)) })
  fireEvent.click(screen.getByText("Beitritt"))
  const selected = () => selectedRateSelector(r.store.getState())?.id
  return {...r, selected, userConfirmation, history: () => history!}
}
const answer = (role: "confirm" | "cancel") => act(() => alert.mock.lastCall![0].onDidDismiss({detail: {role}}))

describe("tariff editor: unsaved changes ask before they are lost (platform#228 step 4)", () => {
  beforeEach(() => alert.mockReset())

  it("selecting another tariff with unsaved input asks and keeps the form when declined", () => {
    const {selected} = setup()
    expect(selected()).toBe("1")
    fireEvent.click(screen.getByText("ändern"))
    fireEvent.click(screen.getByText("Mitglied"))
    expect(alert.mock.lastCall![0].message).toBe(UNSAVED_DISCARD_MESSAGE)
    answer("cancel")
    expect(selected()).toBe("1")
    fireEvent.click(screen.getByText("Mitglied"))
    answer("confirm")
    expect(selected()).toBe("2")
  })

  it("a new tariff with unsaved input elsewhere asks first", () => {
    const {selected, container} = setup()
    fireEvent.click(screen.getByText("ändern"))
    fireEvent.click(container.querySelectorAll(".header-fav-button")[1])
    expect(alert).toHaveBeenCalledTimes(1)
    expect(selected()).toBe("1")
  })

  it("an unchanged form switches without asking", () => {
    const {selected} = setup()
    fireEvent.click(screen.getByText("Mitglied"))
    expect(alert).not.toHaveBeenCalled()
    expect(selected()).toBe("2")
  })

  it("„Zurück“ with unsaved input asks and closes only on confirm", () => {
    const {selected} = setup()
    fireEvent.click(screen.getByText("ändern"))
    fireEvent.click(screen.getByText("Zurück"))
    expect(alert.mock.lastCall![0].message).toBe(UNSAVED_DISCARD_MESSAGE)
    expect(selected()).toBe("1")
    answer("confirm")
    expect(selected()).toBeUndefined()
  })

  it("leaving the page (menu, browser back) with unsaved input asks", () => {
    const {userConfirmation, history} = setup()
    fireEvent.click(screen.getByText("ändern"))
    act(() => history().push("/page/participants"))
    expect(userConfirmation).toHaveBeenCalledWith(UNSAVED_CHANGES_MESSAGE, expect.any(Function))
    expect(history().location.pathname).toBe("/page/rates")
  })
})
