import {describe, expect, it, vi} from "vitest";
import {act, fireEvent, render} from "@testing-library/react";
import {useState} from "react";
import {useForm} from "react-hook-form";
import DatePicker from "react-datepicker";
import {DATE_PICKER_PROPS, parseDateRange} from "../../../util/DateFormat.util";
import DateTextInput from "../../../components/form/DateTextInput.component";
import DatePickerFormElement from "../../../components/form/DatePickerForm.element";
import DatePickerCoreElement from "../../../components/core/elements/DatePickerCore.element";
import DatePickerInput from "../../../components/form/NewDatePickerForm.component";
import {LocalDate} from "local-date";

const ymd = (d: Date | null | undefined) => d ? [d.getFullYear(), d.getMonth() + 1, d.getDate()] : null

const typeInto = async (input: any, value: string) => {
  await act(async () => {
    input.value = value
    fireEvent(input, new CustomEvent("ionInput", {detail: {value}}))
  })
}

describe("parseDateRange", () => {
  it.each([
    ["01.08.2026 - 01.10.2026", [2026, 8, 1], [2026, 10, 1]],
    ["1.8.2026 - 1.10.2026", [2026, 8, 1], [2026, 10, 1]],
    ["01.08.2026 - 01.08.2026", [2026, 8, 1], [2026, 8, 1]],
  ])("reads %s", (text, start, end) => {
    const range = parseDateRange(text)!
    expect(range.map(ymd)).toEqual([start, end])
  })

  it.each(["", "01.08.2026", "01.08.2026 - ", "01.08.2026 - 01.10.202", "01.13.2026 - 01.10.2026", "01.10.2026 - 01.08.2026",
    "2026-08-01 - 2026-10-01"])("rejects „%s“", (text) => {
    expect(parseDateRange(text)).toBeNull()
  })
})

describe("the picker of every calendar", () => {
  const open = (selected: Date) => {
    const {container} = render(<DatePicker {...DATE_PICKER_PROPS} selected={selected} onChange={vi.fn()}/>)
    fireEvent.click(container.querySelector("input")!)
  }

  it.each([[new Date(2026, 8, 15)], [new Date(2026, 7, 15)], [new Date(2026, 1, 15)]])("shows six week rows in %s", (date) => {
    open(date)
    expect(document.querySelectorAll(".react-datepicker__week")).toHaveLength(6)
  })

  it("has one header with year, month and arrows that do not submit a form", () => {
    open(new Date(2026, 8, 15))
    const header = document.querySelector(".date-picker-header")!
    expect((header.querySelector("select[name=header_year]") as HTMLSelectElement).value).toBe("2026")
    expect((header.querySelector("select[name=header_month]") as HTMLSelectElement).value).toBe("September")
    expect(Array.from(header.querySelectorAll("button")).map(b => b.type)).toEqual(["button", "button"])
  })

  it("shows a year outside the usual list", () => {
    open(new Date(2019, 0, 15))
    expect((document.querySelector("select[name=header_year]") as HTMLSelectElement).value).toBe("2019")
  })
})

describe("typing into the field", () => {
  it("a single date reaches the picker", async () => {
    const onChange = vi.fn()
    const {container} = render(<DatePicker {...DATE_PICKER_PROPS} selected={new Date(2026, 8, 1)} onChange={onChange}
                                           customInput={<DateTextInput label="Datum"/>}/>)
    await typeInto(container.querySelector("ion-input"), "01.08.2026")
    expect(onChange).toHaveBeenCalledTimes(1)
    expect(ymd(onChange.mock.calls[0][0])).toEqual([2026, 8, 1])
  })

  it("overwriting a range changes the range and keeps the typed text", async () => {
    let shown: [Date | null, Date | null] = [null, null]
    const Range = () => {
      const [range, setRange] = useState<[Date | null, Date | null]>([new Date(2026, 8, 1), new Date(2026, 9, 1)])
      shown = range
      return <DatePicker {...DATE_PICKER_PROPS} selectsRange startDate={range[0]} endDate={range[1]} onChange={setRange}
                         customInput={<DateTextInput label="Zeitraum" onRange={setRange}/>}/>
    }
    const {container} = render(<Range/>)
    const input = container.querySelector("ion-input") as any
    expect(input.value).toBe("01.09.2026 - 01.10.2026")

    await typeInto(input, "01.08.2026 - 01.10.2026")

    expect(shown.map(ymd)).toEqual([[2026, 8, 1], [2026, 10, 1]])
    expect(input.value).toBe("01.08.2026 - 01.10.2026")
  })
})

describe("a date is saved once on leaving, and only when the day changed", () => {
  const leave = async (input: Element) => { await act(async () => { fireEvent.focusOut(input) }) }

  const FormPicker = ({stored, onChangeDate}: {stored: any, onChangeDate: (name: string, value: any) => void}) => {
    const {control} = useForm({defaultValues: {date: stored}})
    return <DatePickerFormElement control={control} name="date" label="Datum" placeholder="x" onChangeDate={onChangeDate}/>
  }

  const NewPicker = ({onChangePartial}: {onChangePartial: (date: LocalDate | null) => void}) => {
    const {control} = useForm({defaultValues: {date: "2026-08-15"}})
    return <DatePickerInput control={control} name="date" label="Datum" onChangePartial={onChangePartial}/>
  }

  it("form picker: a date typed with the calendar closed is saved", async () => {
    const onChangeDate = vi.fn()
    const {container} = render(<FormPicker stored={new Date(2026, 7, 1)} onChangeDate={onChangeDate}/>)
    const input = container.querySelector("ion-input")!
    await typeInto(input, "02.08.2026")
    await leave(input)
    expect(onChangeDate).toHaveBeenCalledTimes(1)
    expect(ymd(onChangeDate.mock.calls[0][1])).toEqual([2026, 8, 2])
  })

  it.each([["a stored string", "2026-08-01"], ["a stored date", new Date(2026, 7, 1)], ["no stored date", undefined]])(
    "form picker: passing through the field saves nothing with %s", async (_, stored) => {
    const onChangeDate = vi.fn()
    const {container} = render(<FormPicker stored={stored} onChangeDate={onChangeDate}/>)
    await leave(container.querySelector("ion-input")!)
    expect(onChangeDate).not.toHaveBeenCalled()
  })

  it("core picker: saves a typed date, nothing without a change, and the way back to the first day", async () => {
    const onChange = vi.fn()
    // like ParticipantPane: initialValue stays the same object, the caller keeps the new date in a ref
    const {container} = render(<DatePickerCoreElement name="d" label="Datum" placeholder="x" initialValue={new Date(2026, 7, 1)} onChange={onChange}/>)
    const input = container.querySelector("ion-input")!

    await leave(input)
    expect(onChange).not.toHaveBeenCalled()

    await typeInto(input, "02.08.2026")
    await leave(input)
    await typeInto(input, "01.08.2026")
    await leave(input)
    expect(onChange.mock.calls.map(c => ymd(c[1]))).toEqual([[2026, 8, 2], [2026, 8, 1]])
  })

  it("member picker: the steps of a correction are not saved, only the result", async () => {
    const onChangePartial = vi.fn()
    const {container} = render(<NewPicker onChangePartial={onChangePartial}/>)
    const input = container.querySelector("ion-input")!

    await typeInto(input, "1.08.2026")
    await typeInto(input, "16.08.2026")
    expect(onChangePartial).not.toHaveBeenCalled()

    await leave(input)
    expect(onChangePartial).toHaveBeenCalledTimes(1)
    expect(ymd(onChangePartial.mock.calls[0][0])).toEqual([2026, 8, 16])

    await leave(input)
    expect(onChangePartial).toHaveBeenCalledTimes(1)
  })
})

describe("the field", () => {
  it("writes no undefined props on the IonInput", async () => {
    const Rerendered = () => {
      const [date, setDate] = useState<Date | null>(new Date(2026, 7, 1))
      return <DatePicker {...DATE_PICKER_PROPS} selected={date} onChange={setDate} customInput={<DateTextInput label="Datum"/>}/>
    }
    const {container} = render(<Rerendered/>)
    const input = container.querySelector("ion-input")!
    await typeInto(input, "02.08.2026")
    expect(input.getAttribute("id")).toBeNull()
    expect(input.getAttribute("title")).toBeNull()
    expect(input.getAttribute("tabindex")).toBeNull()
  })
})
