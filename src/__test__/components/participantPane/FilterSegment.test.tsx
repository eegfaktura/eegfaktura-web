import {describe, expect, it, vi} from "vitest"
import {fireEvent, render, screen} from "@testing-library/react"
import FilterSegmentComponent from "../../../components/participantPane/FilterSegment.component"
import "../../../util/I18n"

const renderSegment = (selectedOption: string, setSelectedOption = vi.fn()) =>
  render(<FilterSegmentComponent selectedOption={selectedOption} setSelectedOption={setSelectedOption}
                                 memberSort="participantNumber" actionFirst={true} setMemberSort={vi.fn()}/>)

describe("FilterSegment (platform#214)", () => {
  it("the second tab is 'Inaktive' by default and selects it", () => {
    const setSelectedOption = vi.fn()
    renderSegment("period", setSelectedOption)
    fireEvent.click(screen.getByText("Inaktive"))
    expect(setSelectedOption).toHaveBeenCalledWith("inactive")
  })

  it("names the chosen filter", () => {
    renderSegment("all")
    expect(screen.getByText("Alle")).toBeTruthy()
    renderSegment("active")
    expect(screen.getByText("Aktive")).toBeTruthy()
  })

  it("shows the chosen sort as tooltip", () => {
    renderSegment("period")
    expect(screen.getByTitle("Sortierung: Mitgliedsnummer")).toBeTruthy()
  })
})
