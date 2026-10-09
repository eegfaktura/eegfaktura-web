import { describe, it, expect } from "vitest";
import {splitDebitByMandate, toSepaText} from "../../service/sepa.converter";

describe("toSepaText", () => {
  it("drops accents outside the SEPA character set", () => {
    expect(toSepaText("René Müller")).toBe("Rene Müller");
    expect(toSepaText("François Łukasz")).toBe("Francois Lukasz");
  });
  it("keeps umlauts and the EPC basic characters", () => {
    expect(toSepaText("Gemeinde Weißenbach a.d. Triesting (Ö) / Nr: 1-2, 'x' + y?")).toBe("Gemeinde Weißenbach a.d. Triesting (Ö) / Nr: 1-2, 'x' + y?");
  });
  it("replaces other characters and limits the length", () => {
    expect(toSepaText("Huber & Söhne_GmbH  \"Test\"")).toBe("Huber + Söhne GmbH Test");
    expect(toSepaText("x".repeat(80))).toHaveLength(70);
    expect(toSepaText(undefined)).toBe("");
  });
});

describe("splitDebitByMandate", () => {
  const item = (Name: string, DebitType?: string) =>
    ({Amount: 10, Iban: "AT00", MandateRef: "", MandateDate: "", Name, EndToEndId: "", InvoiceIds: [], DebitType});

  it("leaves members with 'Kein SEPA' out of the direct debit", () => {
    const {debit, skipped} = splitDebitByMandate([item("A", "CORE"), item("B", "NONE"), item("C", "B2B"), item("D")]);
    expect(debit.map(i => i.Name)).toEqual(["A", "C", "D"]);
    expect(skipped.map(i => i.Name)).toEqual(["B"]);
  });
});
