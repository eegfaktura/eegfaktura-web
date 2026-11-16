import {describe, expect, it, vi} from "vitest";
import {act, fireEvent, render, screen} from "@testing-library/react";
import React from "react";
import {FormProvider, useForm, UseFormReturn} from "react-hook-form";
import "../../util/I18n";
import RateComponent from "../../components/Rate.component";
import RateCardComponent from "../../components/RateCard.component";
import {RateContext} from "../../store/hook/Rate.provider";
import {EegTariff} from "../../models/eeg.model";

// platform#217: the joining fee section of the tariff dialog and its line on the tariff card

const renderForm = (rate: EegTariff, onSubmit = vi.fn(), onMethods?: (m: UseFormReturn<EegTariff>) => void) => {
  const Form = () => {
    // mode 'all' as in RateDetailPane: fields are checked while typing
    const methods = useForm<EegTariff>({defaultValues: rate, mode: "all"})
    onMethods?.(methods)
    return (
      <RateContext.Provider value={{currentRateType: rate.type as any, setRateType: () => {}}}>
        <FormProvider {...methods}>
          <RateComponent rate={rate} onSubmit={onSubmit} submitId="rate-form"/>
        </FormProvider>
      </RateContext.Provider>
    )
  }
  return render(<Form/>)
}

const eeg = (extra: Partial<EegTariff> = {}) =>
  ({id: "t1", name: "Mitglied", type: "EEG", useVat: false, useMeteringPointFee: false, participantFee: 2,
    joiningFeeText: "Beitrittsgebühr", ...extra}) as EegTariff

describe("tariff dialog: section „Einmalige Beitrittsgebühr“", () => {
  it("shows amount and VAT choice for a membership fee tariff, the rate only with VAT", () => {
    const {container} = renderForm(eeg())
    expect(screen.getByText("Einmalige Beitrittsgebühr")).toBeInTheDocument()
    expect(container.querySelector('ion-input[name="joiningFee"]')).not.toBeNull()
    expect(screen.getByText("Umsatzsteuer für die Beitrittsgebühr anführen")).toBeInTheDocument()
    expect(container.querySelector('ion-input[name="joiningFeeVatInPercent"]')).toBeNull()

    const withVat = renderForm(eeg({joiningFeeUseVat: true, joiningFeeVatInPercent: 20}))
    expect(withVat.container.querySelector('ion-input[name="joiningFeeVatInPercent"]')).not.toBeNull()
  })

  // platform#260: the text of the invoice line is shown with the tariff's value and saved as typed
  it("shows the text of the invoice line and saves a changed one", async () => {
    const onSubmit = vi.fn()
    const {container} = renderForm(eeg({joiningFee: 30, joiningFeeText: "Beitrittsgebühr"}), onSubmit)
    const input = container.querySelector('ion-input[name="joiningFeeText"]') as HTMLIonInputElement
    expect(input.getAttribute("label")).toBe("Bezeichnung auf der Rechnung")
    expect(input.value).toBe("Beitrittsgebühr")
    await act(async () => {
      input.value = "Einmalige Einrichtungsgebühr"
      fireEvent(input, new CustomEvent("ionInput", {detail: {value: "Einmalige Einrichtungsgebühr"}}))
    })
    await act(async () => {
      fireEvent.submit(container.querySelector("form#rate-form")!)
    })
    expect(onSubmit).toHaveBeenCalledTimes(1)
    expect(onSubmit.mock.calls[0][0].joiningFeeText).toBe("Einmalige Einrichtungsgebühr")
  })

  const submit = async (container: HTMLElement) => act(async () => {
    fireEvent.submit(container.querySelector("form#rate-form")!)
  })

  it("does not save a joining fee without a text", async () => {
    const onSubmit = vi.fn()
    const {container} = renderForm(eeg({joiningFee: 30, joiningFeeText: " "}), onSubmit)
    await submit(container)
    expect(onSubmit).not.toHaveBeenCalled()
  })

  it("saves a tariff without a joining fee and without a text", async () => {
    const onSubmit = vi.fn()
    const {container} = renderForm(eeg({joiningFee: 0, joiningFeeText: ""}), onSubmit)
    await submit(container)
    expect(onSubmit).toHaveBeenCalledTimes(1)
  })

  it("does not save a text the invoice cannot print, but WinAnsi punctuation", async () => {
    const refused = vi.fn()
    await submit(renderForm(eeg({joiningFee: 30, joiningFeeText: "Eintritt ✓"}), refused).container)
    expect(refused).not.toHaveBeenCalled()

    const saved = vi.fn()
    await submit(renderForm(eeg({joiningFee: 30, joiningFeeText: "Einrichtung – „einmalig“ (50 €)"}), saved).container)
    expect(saved).toHaveBeenCalledTimes(1)
  })

  // review: the text is required only with a fee, so a changed fee checks the text again (deps)
  it("checks the text again when the fee changes", async () => {
    let methods: UseFormReturn<EegTariff> | undefined
    const {container} = renderForm(eeg({joiningFee: 0, joiningFeeText: ""}), vi.fn(), m => methods = m)
    const fee = container.querySelector('ion-input[name="joiningFee"]') as HTMLIonInputElement
    await act(async () => {
      fee.value = "30"
      fireEvent(fee, new CustomEvent("ionChange", {detail: {value: "30"}}))
    })
    expect(methods!.getFieldState("joiningFeeText").error?.message)
      .toBe("Bitte eine Bezeichnung für die Rechnung eingeben, z. B. „Beitrittsgebühr“.")

    await act(async () => {
      fee.value = "0"
      fireEvent(fee, new CustomEvent("ionChange", {detail: {value: "0"}}))
    })
    expect(methods!.getFieldState("joiningFeeText").error).toBeUndefined()
  })

  it("is not offered for consumer and producer tariffs", () => {
    renderForm({id: "v", name: "Bezug", type: "VZP", useVat: true, useMeteringPointFee: false} as EegTariff)
    expect(screen.queryByText("Einmalige Beitrittsgebühr")).toBeNull()
  })

  it("takes an amount with cents (49,90 → 49.9) into the saved tariff", async () => {
    const onSubmit = vi.fn()
    const {container} = renderForm(eeg(), onSubmit)
    const input = container.querySelector('ion-input[name="joiningFee"]') as HTMLIonInputElement
    await act(async () => {
      input.value = "49,90"
      fireEvent(input, new CustomEvent("ionChange", {detail: {value: "49,90"}}))
    })
    await act(async () => {
      fireEvent.submit(container.querySelector("form#rate-form")!)
    })
    expect(onSubmit).toHaveBeenCalledTimes(1)
    expect(onSubmit.mock.calls[0][0].joiningFee).toBe(49.9)
  })
})

describe("tariff card: joining fee", () => {
  it("shows the fee and its VAT when set", () => {
    render(<RateCardComponent rate={eeg({joiningFee: 49.9, joiningFeeUseVat: true, joiningFeeVatInPercent: 20})}/>)
    expect(screen.getByText("Beitrittsgebühr")).toBeInTheDocument()
    expect(screen.getByText("49,90 €")).toBeInTheDocument()
    expect(screen.getByText("Umsatzsteuer Beitrittsgebühr")).toBeInTheDocument()
    expect(screen.getByText("20 %")).toBeInTheDocument()
  })

  it("shows nothing without a fee", () => {
    render(<RateCardComponent rate={eeg({joiningFee: 0, joiningFeeUseVat: true, joiningFeeVatInPercent: 20})}/>)
    expect(screen.queryByText("Beitrittsgebühr")).toBeNull()
    expect(screen.queryByText("Umsatzsteuer Beitrittsgebühr")).toBeNull()
  })
})
