import {describe, expect, it} from "vitest";
import {numberInputValue} from "../../../components/form/NumberInput.component";
import i18n from "../../../util/I18n";

const t = i18n.getFixedT("de", "common")

describe("numberInputValue (261027-mm1)", () => {
  it("an emptied field is 0 instead of keeping the old value", () => {
    expect(numberInputValue("")).toBe(0)
    expect(numberInputValue("  ")).toBe(0)
    expect(numberInputValue(null)).toBe(0)
    expect(numberInputValue(undefined)).toBe(0)
  })

  it("reads a German decimal comma", () => {
    expect(numberInputValue("49,90")).toBe(49.9)
    expect(numberInputValue("20")).toBe(20)
    expect(numberInputValue(7.5)).toBe(7.5)
  })
})

describe("VAT range messages of the tariff dialog (261027-mm2)", () => {
  it("say what is wrong", () => {
    expect(t("warnings.vat_to_big")).toBe("Höchstens 100 % erlaubt!")
    expect(t("warnings.vat_zero")).toBe("Negative Werte sind nicht erlaubt!")
  })
})
