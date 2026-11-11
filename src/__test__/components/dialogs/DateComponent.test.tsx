import {describe, expect, it, vi} from "vitest";
import {render, screen} from "@testing-library/react";
import DateComponent from "../../../components/dialogs/date.component";

describe("DateComponent (process history / process header range)", () => {
  it("shows the range in German format DD.MM.YYYY", () => {
    render(<DateComponent range={vi.fn()} initialDate={[new Date(2026, 9, 13), new Date(2026, 9, 27)]}/>)
    expect(screen.getByText("13.10.2026")).toBeTruthy()
    expect(screen.getByText("27.10.2026")).toBeTruthy()
  })

  it("shows nothing for a missing end date", () => {
    const {container} = render(<DateComponent range={vi.fn()} initialDate={[new Date(2026, 9, 13), null]}/>)
    expect(container.textContent).toContain("13.10.2026 -")
    expect(container.textContent).not.toContain("null")
  })
})
