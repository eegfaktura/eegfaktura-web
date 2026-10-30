import {describe, expect, it, vi} from "vitest";
import {act, fireEvent, screen} from "@testing-library/react";
import React from "react";
import {renderWithProviders} from "../../test-utils";
import {EegParticipant} from "../../../models/members.model";
import {EegContext, EegState} from "../../../store/hook/Eeg.provider";
import MemberFormComponent from "../../../components/core/MemberForm.component";
import "../../../util/I18n";

// The member details save every field on its own (on change). The form shows whether all changes are saved; a failed
// save keeps the input and offers a retry (platform#228 step 4).

const participant = {
  id: "p1", participantNumber: "001", firstname: "Anna", lastname: "Muster", businessRole: "EEG_PRIVATE",
  billingAddress: {street: "Weg", streetNumber: "1", zip: "1010", city: "Wien"}, residentAddress: {},
  contact: {phone: "", email: "anna@example.org"}, accountInfo: {iban: "", owner: "", sepaDirectDebit: "NONE"},
  meters: [],
} as unknown as EegParticipant

const ctx = {tenant: "RC100100", isAdmin: () => false, isOwner: () => false, isUser: () => true} as unknown as EegState

const setup = (onSubmitPartial: (id: string, value: Record<string, any>) => Promise<unknown>) => {
  const r = renderWithProviders(
    <EegContext.Provider value={ctx}>
      <MemberFormComponent participant={participant} rates={[]} formId="" onSubmit={vi.fn()}
                           onSubmitPartial={onSubmitPartial} changeable={false}/>
    </EegContext.Provider>)
  const field = r.container.querySelector('ion-input[name="lastname"]') as any
  // typing, then leaving the field: Ionic fires ionInput while typing and ionChange when the value is committed
  const type = async (value: string) => {
    field.value = value
    await act(async () => { fireEvent(field, new CustomEvent("ionInput", {detail: {value}})) })
    await act(async () => { fireEvent(field, new CustomEvent("ionChange", {detail: {value}})) })
  }
  return {...r, field, type}
}

describe("member details: save status for the auto-saving form (platform#228 step 4)", () => {
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
})
