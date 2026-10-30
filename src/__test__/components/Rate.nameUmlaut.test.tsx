import {describe, expect, it, vi} from "vitest";
import {act, fireEvent, render, screen} from "@testing-library/react";
import React from "react";
import {FormProvider, useForm} from "react-hook-form";
import {EegTariff} from "../../models/eeg.model";
import RateComponent from "../../components/Rate.component";
import "../../util/I18n";

// Tariff names with umlauts were rejected (platform#228 step 4). Billing prints the name on the invoice (Helvetica,
// WinAnsi covers ä ö ü ß) and in the XLSX; the SEPA file does not carry it. Other characters stay rejected.

const ERROR = "Bitte nur Buchstaben (auch Umlaute und ß), Ziffern und '-_ ' eingeben"

const Form = () => {
  const methods = useForm<EegTariff>({defaultValues: {id: "t1", name: "Bezug", type: "EEG"} as EegTariff, mode: "all"})
  return <FormProvider {...methods}><RateComponent rate={methods.getValues()} onSubmit={vi.fn()} submitId="s"/></FormProvider>
}

const typeName = async (value: string) => {
  const {container} = render(<Form/>)
  const field = container.querySelector('ion-input[name="name"]') as any
  field.value = value
  await act(async () => { fireEvent(field, new CustomEvent("ionInput", {detail: {value}})) })
}

describe("tariff name: umlauts allowed (platform#228 step 4)", () => {
  it.each(["Bezug Mürztal", "Größe Ä Ö Ü", "Einspeisung-Süd_2"])("accepts „%s“", async (name) => {
    await typeName(name)
    expect(screen.queryAllByText(/Bitte nur Buchstaben/)).toHaveLength(0)
  })

  it.each(["Tarif <1>", "Łódź", "Tarif & Co"])("still rejects „%s“", async (name) => {
    await typeName(name)
    expect(screen.getAllByText(ERROR).length).toBeGreaterThan(0)
  })
})
