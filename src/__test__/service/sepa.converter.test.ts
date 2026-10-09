import { describe, it, expect } from "vitest";
import {splitDebitByMandate, splitRowsByIban, toSepaText} from "../../service/sepa.converter";

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

describe("toSepaText length limit", () => {
  it("does not end with a blank after cutting", () => {
    expect(toSepaText("a".repeat(69) + " b")).toBe("a".repeat(69));
  });
});

describe("splitRowsByIban", () => {
  it("leaves rows without IBAN out of both files and lists them once", () => {
    const row = (name: string, iban?: string) =>
      ({"Empfänger Name": name, "Empfänger Konto IBAN": iban, "Dokumenttyp": "Rechnung"});
    const {withIban, withoutIban} = splitRowsByIban([
      row("A", "AT61 1904 3002 3457 3201"), row("B"), row("C", "  "), row("B", ""),
    ]);
    expect(withIban.map(r => r["Empfänger Name"])).toEqual(["A"]);
    expect(withoutIban).toEqual(["B", "C"]);
  });
});
