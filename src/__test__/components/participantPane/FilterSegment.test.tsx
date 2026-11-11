import {describe, expect, it, vi} from "vitest"
import {fireEvent, render, screen} from "@testing-library/react"

const alert = vi.fn()
vi.mock("@ionic/react", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@ionic/react")>()),
  useIonAlert: () => [alert],
}))

import FilterSegmentComponent, {MEMBER_VIEW_OPTIONS} from "../../../components/participantPane/FilterSegment.component"
import "../../../util/I18n"

const renderSegment = (selectedOption: string, setSelectedOption = vi.fn()) =>
  render(<FilterSegmentComponent selectedOption={selectedOption} setSelectedOption={setSelectedOption}
                                 memberSort="participantNumber" actionFirst={true} setMemberSort={vi.fn()}/>)

describe("FilterSegment: one view choice (platform#214, 28.10.2026)", () => {
  it("offers Standard first, then the filters", () => {
    expect(MEMBER_VIEW_OPTIONS).toEqual(["period", "all", "active", "inactive"])
  })

  it("names the chosen view, 'period' as Standard", () => {
    renderSegment("period")
    expect(screen.getByText("Anzeige: Standard")).toBeTruthy()
    renderSegment("all")
    expect(screen.getByText("Anzeige: Alle")).toBeTruthy()
    renderSegment("inactive")
    expect(screen.getByText("Anzeige: Inaktive")).toBeTruthy()
  })

  it("explains the chosen view as tooltip", () => {
    renderSegment("period")
    expect(screen.getByTitle(/im gewählten Zeitraum aktiv/)).toBeTruthy()
  })

  it("opens the choice with the current view checked and applies the picked one", () => {
    const setSelectedOption = vi.fn()
    renderSegment("period", setSelectedOption)
    fireEvent.click(screen.getByText("Anzeige: Standard"))
    const options = alert.mock.lastCall![0]
    expect(options.inputs.map((i: {value: string}) => i.value)).toEqual(["period", "all", "active", "inactive"])
    expect(options.inputs.find((i: {checked: boolean}) => i.checked).value).toBe("period")
    options.buttons.find((b: {role: string}) => b.role === "confirm").handler("inactive")
    expect(setSelectedOption).toHaveBeenCalledWith("inactive")
  })

  it("opens the choice with the keyboard", () => {
    alert.mockClear()
    renderSegment("all")
    fireEvent.keyDown(screen.getByRole("button", {name: /Anzeige: Alle/}), {key: "Enter"})
    expect(alert).toHaveBeenCalledTimes(1)
  })

  it("shows the chosen sort as tooltip", () => {
    renderSegment("period")
    expect(screen.getByTitle("Sortierung: Mitgliedsnummer")).toBeTruthy()
  })
})
