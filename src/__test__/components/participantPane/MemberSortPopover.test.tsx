import {describe, expect, it, vi} from "vitest"
import {fireEvent, render, screen} from "@testing-library/react"
import MemberSortPopover from "../../../components/participantPane/MemberSortPopover.component"
import "../../../util/I18n"

describe("MemberSortPopover (platform#214)", () => {
  it("offers the sorts without 'Standard', the action toggle and German buttons", () => {
    render(<MemberSortPopover memberSort="participantNumber" actionFirst={true} onApply={vi.fn()} onDismiss={vi.fn()}/>)
    for (const label of ["Mitgliedsnummer", "Nachname", "Vorname", "Mitglied seit (neueste zuerst)",
      "Mitglied seit (älteste zuerst)", "Aktiviert seit (neueste zuerst)", "Einzugsart", "Ort",
      "Mitglieder mit nötiger Aktion oben", "Abbrechen", "Übernehmen"]) {
      expect(screen.getByText(label)).toBeTruthy()
    }
    expect(screen.queryByText("Standard")).toBeNull()
  })

  it("applies the changed choice only with 'Übernehmen'", () => {
    const onApply = vi.fn()
    const onDismiss = vi.fn()
    render(<MemberSortPopover memberSort="participantNumber" actionFirst={true} onApply={onApply} onDismiss={onDismiss}/>)
    fireEvent(document.querySelector("ion-radio-group")!, new CustomEvent("ionChange", {detail: {value: "city"}}))
    fireEvent(document.querySelector("ion-checkbox")!, new CustomEvent("ionChange", {detail: {checked: false}}))
    expect(onApply).not.toHaveBeenCalled()
    fireEvent.click(screen.getByText("Übernehmen"))
    expect(onApply).toHaveBeenCalledWith("city", false)
  })

  it("'Abbrechen' only closes", () => {
    const onApply = vi.fn()
    const onDismiss = vi.fn()
    render(<MemberSortPopover memberSort="lastname" actionFirst={false} onApply={onApply} onDismiss={onDismiss}/>)
    fireEvent.click(screen.getByText("Abbrechen"))
    expect(onDismiss).toHaveBeenCalled()
    expect(onApply).not.toHaveBeenCalled()
  })
})
