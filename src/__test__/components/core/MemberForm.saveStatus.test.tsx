import {beforeEach, describe, expect, it, vi} from "vitest";
import {act, fireEvent, screen} from "@testing-library/react";
import React from "react";
import {MemoryRouter} from "react-router";

const alert = vi.fn()
vi.mock("@ionic/react", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@ionic/react")>()),
  useIonAlert: () => [alert],
}))
const persistBusinessType = vi.fn()
vi.mock("../../../store/participant/api", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../../store/participant/api")>()),
  usePersistBusinessTypeMutation: () => [persistBusinessType],
}))
import {renderWithProviders} from "../../test-utils";
import {EegParticipant} from "../../../models/members.model";
import {EegContext, EegState} from "../../../store/hook/Eeg.provider";
import MemberFormComponent from "../../../components/core/MemberForm.component";
import {ParticipantContext} from "../../../store/hook/ParticipantProvider";
import "../../../util/I18n";

// The member details save every field on its own (on change). The form shows whether all changes are saved; a failed
// save keeps the input and offers a retry (platform#228 step 4).

const participant = {
  id: "p1", participantNumber: "001", firstname: "Anna", lastname: "Muster", businessRole: "EEG_PRIVATE",
  billingAddress: {street: "Weg", streetNumber: "1", zip: "1010", city: "Wien"}, residentAddress: {},
  contact: {phone: "", email: "anna@example.org"}, accountInfo: {iban: "", owner: "", sepaDirectDebit: "NONE"},
  meters: [],
} as unknown as EegParticipant

const ctx = (admin = false) =>
  ({tenant: "RC100100", isAdmin: () => admin, isOwner: () => false, isUser: () => true} as unknown as EegState)

const setup = (onSubmitPartial: (id: string, value: Record<string, any>) => Promise<unknown>, admin = false) => {
  const setUnsaved = vi.fn()
  const r = renderWithProviders(
    <MemoryRouter>
      <EegContext.Provider value={ctx(admin)}>
        <ParticipantContext.Provider value={{setUnsaved} as any}>
          <MemberFormComponent participant={participant} rates={[]} formId="" onSubmit={vi.fn()}
                               onSubmitPartial={onSubmitPartial} changeable={false}/>
        </ParticipantContext.Provider>
      </EegContext.Provider>
    </MemoryRouter>)
  const field = r.container.querySelector('ion-input[name="lastname"]') as any
  // typing, then leaving the field: Ionic fires ionInput while typing and ionChange when the value is committed
  const type = async (value: string) => {
    field.value = value
    await act(async () => { fireEvent(field, new CustomEvent("ionInput", {detail: {value}})) })
    await act(async () => { fireEvent(field, new CustomEvent("ionChange", {detail: {value}})) })
  }
  return {...r, field, type, setUnsaved}
}

describe("member details: save status for the auto-saving form (platform#228 step 4)", () => {
  beforeEach(() => { alert.mockReset(); persistBusinessType.mockReset() })

  it("shows „Alle Änderungen gespeichert“ before and after a save", async () => {
    const save = vi.fn().mockResolvedValue(true)
    const {type} = setup(save)
    expect(screen.getByRole("status").textContent).toBe("Alle Änderungen gespeichert")
    await type("Neu")
    expect(save).toHaveBeenCalledWith("p1", {lastname: "Neu"})
    expect(screen.getByRole("status").textContent).toBe("Alle Änderungen gespeichert")
  })

  it("shows „Wird gespeichert …“ while the save runs", async () => {
    let finish: (ok: boolean) => void = () => {}
    const {type} = setup(vi.fn(() => new Promise<boolean>(res => { finish = res })))
    await type("Neu")
    expect(screen.getByRole("status").textContent).toBe("Wird gespeichert …")
    await act(async () => finish(true))
    expect(screen.getByRole("status").textContent).toBe("Alle Änderungen gespeichert")
  })

  it("a failed save keeps the input and offers a retry that sends the change again", async () => {
    const save = vi.fn().mockResolvedValueOnce(false).mockResolvedValueOnce(true)
    const {type, field} = setup(save)
    await type("Neu")
    expect(screen.getByRole("status").textContent).toBe("Nicht gespeichert – erneut versuchen")
    expect(field.value).toBe("Neu")
    await act(async () => fireEvent.click(screen.getByText("erneut versuchen")))
    expect(save).toHaveBeenCalledTimes(2)
    expect(save).toHaveBeenLastCalledWith("p1", {lastname: "Neu"})
    expect(screen.getByRole("status").textContent).toBe("Alle Änderungen gespeichert")
  })

  it("a rejected save counts as not saved", async () => {
    const {type} = setup(vi.fn().mockRejectedValue(new Error("500")))
    await type("Neu")
    expect(screen.getByRole("status").textContent).toBe("Nicht gespeichert – erneut versuchen")
  })

  it("an invalid field is not saved: the status says so and the member list asks before switching (review PR #244)", async () => {
    const save = vi.fn().mockResolvedValue(true)
    const {type, setUnsaved} = setup(save)
    await type("")
    expect(save).not.toHaveBeenCalled()
    expect(screen.getByRole("status").textContent).toBe("Nicht gespeichert – bitte die markierten Felder prüfen")
    expect(setUnsaved).toHaveBeenLastCalledWith("details", true)
  })

  it("a failed save counts as unsaved for the member list (review PR #244)", async () => {
    const {type, setUnsaved} = setup(vi.fn().mockResolvedValue(false))
    await type("Neu")
    expect(setUnsaved).toHaveBeenLastCalledWith("details", true)
  })

  it("a failed business type change shows „Nicht gespeichert“ and is retried (review PR #244)", async () => {
    persistBusinessType.mockReturnValueOnce({unwrap: () => Promise.reject(new Error("500"))})
      .mockReturnValueOnce({unwrap: () => Promise.resolve({})})
    const {container} = setup(vi.fn().mockResolvedValue(true), true)
    fireEvent.click(container.querySelector("ion-button[size=small]")!)
    const ok = alert.mock.lastCall![1].find((b: any) => b.text === "Ok")
    await act(async () => ok.handler())
    expect(persistBusinessType).toHaveBeenCalledWith({tenant: "RC100100", participantId: "p1",
      value: {path: "businessRole", value: "EEG_BUSINESS"}})
    expect(screen.getByRole("status").textContent).toBe("Nicht gespeichert – erneut versuchen")
    await act(async () => fireEvent.click(screen.getByText("erneut versuchen")))
    expect(persistBusinessType).toHaveBeenCalledTimes(2)
    expect(screen.getByRole("status").textContent).toBe("Alle Änderungen gespeichert")
  })
})
