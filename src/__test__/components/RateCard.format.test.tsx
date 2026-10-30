import {describe, expect, it} from "vitest";
import {render, screen} from "@testing-library/react";
import "../../util/I18n";
import RateCardComponent from "../../components/RateCard.component";
import {EegTariff} from "../../models/eeg.model";

// platform#228 step 1: the tariff card mixed "12.5 €", "12,5 Cent" and "2.5 %"; now one notation.

const rate = (extra: Partial<EegTariff>) => ({id: "t1", name: "Tarif", useVat: true, ...extra}) as EegTariff

describe("RateCard number notation", () => {
  it("consumer tariff: cent, euro, kWh and percent with decimal comma and thousands dot", () => {
    render(<RateCardComponent rate={rate({type: "VZP", centPerKWh: 12.5, vatInPercent: "20", useMeteringPointFee: true,
      meteringPointFee: 1234.5, freeKWh: 1500, discount: 2.5})}/>)
    expect(screen.getByText("12,5 Cent")).toBeInTheDocument()
    expect(screen.getByText("20 %")).toBeInTheDocument()
    expect(screen.getByText("1.234,50 €")).toBeInTheDocument()
    expect(screen.getByText("1.500 kWh")).toBeInTheDocument()
    expect(screen.getByText("2,5 %")).toBeInTheDocument()
  })

  it("membership fee tariff: the fee with two decimals", () => {
    render(<RateCardComponent rate={rate({type: "EEG", useVat: false, participantFee: 12.5})}/>)
    expect(screen.getByText("12,50 €")).toBeInTheDocument()
  })
})

describe("RateCard missing fee", () => {
  it("shows a dash for a missing member fee or metering point fee, never NaN € or 0,00 €", () => {
    const {container, unmount} = render(<RateCardComponent rate={rate({type: "EEG", useVat: false})}/>)
    expect(container.textContent).toContain("–")
    expect(container.textContent).not.toMatch(/NaN|0,00 €/)
    unmount()
    const vzp = render(<RateCardComponent rate={rate({type: "VZP", centPerKWh: 10, useMeteringPointFee: true,
      meteringPointFee: null as unknown as number})}/>)
    expect(vzp.container.textContent).not.toMatch(/NaN|0,00 €/)
    expect(vzp.container.textContent).toContain("–")
  })
})
