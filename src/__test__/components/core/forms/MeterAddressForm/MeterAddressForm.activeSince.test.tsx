import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import {act, cleanup, fireEvent, render, screen} from "@testing-library/react";
import React from "react";
import {FormProvider, useForm} from "react-hook-form";
import "../../../../../util/I18n";
import {Api} from "../../../../../service";
import MeterAddressFormElement from "../../../../../components/core/forms/MeterAddressForm/MeterAddressForm.element";
import {EegContext, EegState} from "../../../../../store/hook/Eeg.provider";
import {Metering} from "../../../../../models/meteringpoint.model";
import {registrationDateError} from "../../../../../components/form/useRegistrationWindow.hook";

// platform#272: „Aktiv ab“ of an online community is the requested day until the grid operator reports the activation

const HINT = "Ab diesem Tag beantragt eegFaktura die Aktivierung beim Netzbetreiber, höchstens 30 Arbeitstage im Voraus. " +
  "Manche Netzbetreiber aktivieren nur zu bestimmten Tagen."
const ctx = {tenant: "TE100100", eeg: undefined, isAdmin: () => true, isOwner: () => false, isUser: () => false,
  getTenants: () => [], setTenant: () => {}, refresh: async () => 1} as unknown as EegState

const regWindow = {from: new Date(2026, 10, 27), to: new Date(2027, 0, 13)}
let fetchWindow: ReturnType<typeof vi.fn>
beforeEach(() => {
  fetchWindow = vi.fn().mockResolvedValue(regWindow)
  Api.eegService = {fetchRegistrationWindow: fetchWindow} as unknown as typeof Api.eegService
})
afterEach(() => cleanup())

const setup = (online: boolean, processState: string, registeredSince = "2026-12-01") => {
  let form: any
  const Form = () => {
    const methods = useForm<Metering>({mode: "onChange", defaultValues: {processState, status: "INIT", registeredSince,
        participantState: {activeSince: "2026-10-01"}} as unknown as Metering})
    form = methods
    return (
      <EegContext.Provider value={ctx}>
        <FormProvider {...methods}><MeterAddressFormElement isOnline={online}/></FormProvider>
      </EegContext.Provider>)
  }
  const r = render(<Form/>)
  const field = () => r.container.querySelector("ion-input[label^='Aktiv ab']") as HTMLIonInputElement
  return {...r, field, form: () => form}
}
const flush = () => act(async () => { await new Promise(r => setTimeout(r, 0)) })

describe("„Aktiv ab“ per state of the metering point", () => {
  it.each([
    // online, state, bound field, label, read only, hint
    [true, "NEW", "registeredSince", "Aktiv ab (noch nicht beantragt)", false, true],
    [true, "INIT", "registeredSince", "Aktiv ab (beantragt)", true, false],
    [true, "PENDING", "registeredSince", "Aktiv ab (beantragt)", true, false],
    [true, "APPROVED", "registeredSince", "Aktiv ab (beantragt)", true, false],
    [true, "REJECTED", "registeredSince", "Aktiv ab ...", false, true],
    [true, "INVALID", "registeredSince", "Aktiv ab ...", false, true],
    [true, "REVOKED", "registeredSince", "Aktiv ab ...", false, true],
    [true, "INACTIVE", "registeredSince", "Aktiv ab ...", false, true],
    [true, "ACTIVE", "participantState.activeSince", "Aktiv ab (vom Netzbetreiber gemeldet)", true, false],
    [false, "NEW", "participantState.activeSince", "Aktiv ab ...", false, false],
    [false, "ACTIVE", "participantState.activeSince", "Aktiv ab ...", false, false],
  ])("online %s, %s: bound to %s, label „%s“, read only %s, hint %s", async (online, state, name, label, readOnly, hint) => {
    const {field} = setup(online, state)
    await flush()
    expect(field().getAttribute("name")).toBe(name)
    expect(field().getAttribute("label")).toBe(label)
    expect(field().disabled).toBe(readOnly)
    expect(!!screen.queryByText(HINT)).toBe(hint)
  })

  it("shows the requested day, not the activation date, while not active", async () => {
    const {field} = setup(true, "PENDING", "2027-01-01")
    await flush()
    expect(field().value).toBe("01.01.2027")
  })

  it("loads the window only where the day can be chosen", async () => {
    setup(true, "NEW")
    await flush()
    expect(fetchWindow).toHaveBeenCalledWith("TE100100")
    cleanup()
    fetchWindow.mockClear()
    setup(true, "PENDING")
    setup(true, "ACTIVE")
    setup(false, "NEW")
    await flush()
    expect(fetchWindow).not.toHaveBeenCalled()
  })
})

describe("„Aktiv ab“ within the window", () => {
  const typeAndLeave = async (input: Element, value: string) => {
    await act(async () => {
      (input as any).value = value
      fireEvent(input, new CustomEvent("ionInput", {detail: {value}}))
    })
    await act(async () => { fireEvent.focusOut(input) })
  }

  it("a typed day after the 30th working day is an error", async () => {
    const {field, container} = setup(true, "NEW")
    await flush()
    await typeAndLeave(field(), "14.01.2027")
    await flush()
    expect(container.querySelector(".error-line")?.textContent).toBe("Höchstens 30 Arbeitstage im Voraus, also bis 13.01.2027.")
  })

  it("the 30th working day itself is fine and goes into the form as that day", async () => {
    const {field, container, form} = setup(true, "NEW")
    await flush()
    await typeAndLeave(field(), "13.01.2027")
    await flush()
    expect(container.querySelector(".error-line")).toBeNull()
    expect(form().getValues("registeredSince")).toBe("2027-01-13")
  })

  it("a typed day before the window is an error", async () => {
    const {field, container} = setup(true, "REJECTED")
    await flush()
    await typeAndLeave(field(), "01.11.2026")
    await flush()
    expect(container.querySelector(".error-line")?.textContent).toBe("Frühestens ab morgen (27.11.2026).")
  })

  it("a stored day in the past is no error: saving another field must still work", async () => {
    const {form, container} = setup(true, "REJECTED", "2026-10-01")
    await flush()
    let valid = false
    await act(async () => { valid = await form().trigger("registeredSince") })
    expect(valid).toBe(true)
    expect(container.querySelector(".error-line")).toBeNull()
  })
})

describe("registrationDateError", () => {
  it("has no upper bound while the window is not loaded", () => {
    expect(registrationDateError("2030-01-01", {from: new Date(2026, 10, 29)})).toBeUndefined()
    expect(registrationDateError("2026-11-28", {from: new Date(2026, 10, 29)})).toBe("before")
  })
})
