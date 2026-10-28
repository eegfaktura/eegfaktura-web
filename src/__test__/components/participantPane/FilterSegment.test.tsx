import {describe, expect, it, vi} from "vitest"
import {render, screen} from "@testing-library/react"
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

  it("shows the chosen sort as tooltip", () => {
    renderSegment("period")
    expect(screen.getByTitle("Sortierung: Mitgliedsnummer")).toBeTruthy()
  })
})
