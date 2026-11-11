import {describe, expect, it} from "vitest";
import {act, renderHook, waitFor} from "@testing-library/react";
import {useController, useForm} from "react-hook-form";
import {LocalDate} from "local-date";
import {commitFormDate, toFormDateValue} from "../../../components/form/NewDatePickerForm.component";

// Fehlerbild: Beim Anlegen eines Mitglieds wurde das SEPA-Mandatsdatum aus dem DatePicker
// um einen Tag zu frueh gespeichert. react-hook-form klont die Werte in handleSubmit und
// macht aus jedem Date (auch LocalDate) ein gewoehnliches Date, das als UTC serialisiert:
// lokale Mitternacht 04.06. wurde "2026-06-03T22:00:00.000Z".

const submit = async (value: unknown) => {
  const {result} = renderHook(() => useForm<{ d: unknown }>());
  act(() => result.current.setValue("d", value));
  let submitted: { d: unknown } | undefined;
  await act(() => result.current.handleSubmit((data) => {
    submitted = data
  })());
  return JSON.stringify(submitted?.d);
};

describe("DatePickerInput - Datum uebersteht das Speichern", () => {

  it("liefert das gewaehlte Kalenderdatum als YYYY-MM-DD, unabhaengig von der Uhrzeit", () => {
    expect(toFormDateValue(new Date(2026, 5, 4))).toBe("2026-06-04");
    expect(toFormDateValue(new Date(2026, 5, 4, 23, 59))).toBe("2026-06-04");
    expect(toFormDateValue(new Date(2026, 0, 1))).toBe("2026-01-01");
  });

  it("der Formularwert kommt nach handleSubmit unveraendert an", async () => {
    expect(await submit(toFormDateValue(new Date(2026, 5, 4)))).toBe('"2026-06-04"');
  });

  it("ein LocalDate verliert beim Klonen sein Datumsformat - deshalb kein LocalDate im Formular", async () => {
    expect(await submit(new LocalDate("2026-06-04"))).not.toBe('"2026-06-04"');
  });
});

// Fehlerbild (Support 23.10.2026): Neues Mitglied, Einzugsart CORE/B2B. Das Umschalten prueft das
// noch leere Mandatsdatum ("Mandatsdatum fehlt!"); nach der Auswahl im Kalender blieb die Meldung
// stehen, weil das Formular im Modus "onBlur" eine Aenderung allein nicht neu prueft.
describe("DatePickerInput - Pflichtmeldung verschwindet nach der Auswahl", () => {

  it("ein gewaehltes Datum loescht den vorher gesetzten Fehler", async () => {
    const {result} = renderHook(() => {
      const form = useForm<{ d: string }>({mode: "onBlur", reValidateMode: "onChange"})
      const ctrl = useController({name: "d", control: form.control, rules: {required: "fehlt"}})
      return {form, ctrl}
    });
    await act(() => result.current.form.trigger("d"));
    expect(result.current.ctrl.fieldState.error?.message).toBe("fehlt");

    act(() => commitFormDate(result.current.ctrl.field, new Date(2026, 9, 23)));

    await waitFor(() => expect(result.current.ctrl.fieldState.error).toBeUndefined());
    expect(result.current.form.getValues("d")).toBe("2026-10-23");
  });
});
