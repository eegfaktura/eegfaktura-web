import {describe, expect, it, vi} from "vitest"
import {fireEvent, render, screen} from "@testing-library/react"
import MemberSortPopover from "../../../components/participantPane/MemberSortPopover.component"
import "../../../util/I18n"

describe("MemberSortPopover (platform#214)", () => {
  it("offers the sorts without 'Standard', the action toggle and German buttons", () => {
    render(<MemberSortPopover memberSort="participantNumber" actionFirst={true} energySort="available" onApply={vi.fn()} onDismiss={vi.fn()}/>)
    for (const label of ["Mitgliedsnummer", "Nachname", "Vorname", "Mitglied seit (neueste zuerst)",
      "Mitglied seit (älteste zuerst)", "Aktiv ab (neueste zuerst)", "Einzugsart", "Ort",
      "Mitglieder mit nötiger Aktion oben", "Abbrechen", "Übernehmen"]) {
      expect(screen.getByText(label)).toBeTruthy()
    }
    expect(screen.queryByText("Standard")).toBeNull()
  })

  it("applies the changed choice only with 'Übernehmen'", () => {
    const onApply = vi.fn()
    const onDismiss = vi.fn()
    render(<MemberSortPopover memberSort="participantNumber" actionFirst={true} energySort="available" onApply={onApply} onDismiss={onDismiss}/>)
    fireEvent(document.querySelector("ion-radio-group")!, new CustomEvent("ionChange", {detail: {value: "city"}}))
    fireEvent(document.querySelector("ion-checkbox")!, new CustomEvent("ionChange", {detail: {checked: false}}))
    expect(onApply).not.toHaveBeenCalled()
    fireEvent.click(screen.getByText("Übernehmen"))
    expect(onApply).toHaveBeenCalledWith("city", false)
  })

  // platform#259
  it("offers the energy sorts when a direction is chosen", () => {
    render(<MemberSortPopover memberSort="participantNumber" actionFirst={true} energySort="available"
                              onApply={vi.fn()} onDismiss={vi.fn()}/>)
    expect(screen.getByText("Energiemenge (größte zuerst)").closest("ion-radio")!.getAttribute("disabled")).not.toBe("true")
    expect(screen.getByText("Energiemenge (kleinste zuerst)")).toBeTruthy()
    expect(screen.queryByText(/zuerst Erzeuger oder Verbraucher wählen/)).toBeNull()
  })

  it("greys out the energy sorts with a hint when no direction is chosen", () => {
    render(<MemberSortPopover memberSort="participantNumber" actionFirst={true} energySort="disabled"
                              onApply={vi.fn()} onDismiss={vi.fn()}/>)
    for (const label of ["Energiemenge (größte zuerst)", "Energiemenge (kleinste zuerst)"]) {
      expect(screen.getByText(label).closest("ion-radio")!.getAttribute("disabled")).toBe("true")
    }
    expect(screen.getByText(/zuerst Erzeuger oder Verbraucher wählen/)).toBeTruthy()
  })

  it("does not show the energy sorts in „Nur Mitglieder“", () => {
    render(<MemberSortPopover memberSort="participantNumber" actionFirst={true} energySort="hidden"
                              onApply={vi.fn()} onDismiss={vi.fn()}/>)
    expect(screen.queryByText(/Energiemenge/)).toBeNull()
    expect(screen.getByText("Ort")).toBeTruthy()
  })

  it("'Abbrechen' only closes", () => {
    const onApply = vi.fn()
    const onDismiss = vi.fn()
    render(<MemberSortPopover memberSort="lastname" actionFirst={false} energySort="available" onApply={onApply} onDismiss={onDismiss}/>)
    fireEvent.click(screen.getByText("Abbrechen"))
    expect(onDismiss).toHaveBeenCalled()
    expect(onApply).not.toHaveBeenCalled()
  })
})
