import {describe, expect, it, vi} from "vitest";
import {fireEvent, render} from "@testing-library/react";
import DatePicker from "react-datepicker";
import {DATE_PICKER_PROPS} from "../../util/DateFormat.util";

// platform#228 step 1: every picker gets DATE_PICKER_PROPS. Typed text is read as TT.MM.JJJJ only; without
// strictParsing react-datepicker falls back to new Date(text), which reads "05.13.2026" as 13 May.

const typeInto = (text: string) => {
  const onChange = vi.fn()
  const {container} = render(<DatePicker {...DATE_PICKER_PROPS} selected={null} onChange={onChange}/>)
  fireEvent.change(container.querySelector("input")!, {target: {value: text}})
  return onChange
}

describe("date picker input", () => {
  it("reads 28.10.2026 as 28 October 2026", () => {
    const onChange = typeInto("28.10.2026")
    expect(onChange).toHaveBeenCalled()
    const d = onChange.mock.calls[0][0] as Date
    expect([d.getFullYear(), d.getMonth(), d.getDate()]).toEqual([2026, 9, 28])
  })

  it("rejects 05.13.2026 instead of reading it as 13 May", () => {
    const onChange = typeInto("05.13.2026")
    const dates = onChange.mock.calls.map(c => c[0]).filter((d): d is Date => d instanceof Date)
    expect(dates).toEqual([])
  })
})
