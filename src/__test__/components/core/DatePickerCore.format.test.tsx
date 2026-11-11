import {describe, expect, it, vi} from "vitest";
import {fireEvent, render, screen} from "@testing-library/react";
import DatePickerCoreElement from "../../../components/core/elements/DatePickerCore.element";

// platform#228 step 1: the invoice date of a billing run (ParticipantPane, "Rechnungsdatum") and the other
// date fields showed "October 28, 2026".

const renderPicker = () => {
  const {container} = render(<DatePickerCoreElement name="documentDate" label="Rechnungsdatum" placeholder="Datum"
                                                    initialValue={new Date(2026, 9, 28)} onChange={vi.fn()}/>)
  return container.querySelector("ion-input") as HTMLElement & { value?: string, placeholder?: string }
}

describe("DatePickerCoreElement (invoice date)", () => {
  it("shows the date as 28.10.2026", () => {
    const input = renderPicker()
    expect(input.value).toBe("28.10.2026")
    expect(input.value).not.toMatch(/October/)
    expect(input.placeholder).toBe("Datum z.B. 02.04.2024")
  })

  it("the calendar has German month and weekday names, the week starts on Monday", () => {
    const input = renderPicker()
    fireEvent.click(input)
    expect((screen.getByDisplayValue("Oktober") as HTMLSelectElement).value).toBe("Oktober")
    const weekdays = Array.from(document.querySelectorAll(".react-datepicker__day-name")).map(e => e.textContent)
    expect(weekdays[0]).toBe("Mo")
    expect(weekdays).not.toContain("Su")
  })
})
