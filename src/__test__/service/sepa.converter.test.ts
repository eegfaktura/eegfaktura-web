import { describe, it, expect } from "vitest";
import {createSepaDirectDebit, debitInstrument, splitDebitByType, splitRowsByIban, toSepaText} from "../../service/sepa.converter";
import {Eeg} from "../../models/eeg.model";

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

describe("splitDebitByType", () => {
  const item = (Name: string, DebitType?: string) =>
    ({Amount: 10, Iban: "AT00", MandateRef: "", MandateDate: "", Name, EndToEndId: "", InvoiceIds: [], DebitType});

  it("leaves 'Kein SEPA' out, splits B2B from CORE, an empty type counts as CORE", () => {
    const {core, b2b, skipped} = splitDebitByType([item("A", "CORE"), item("B", "NONE"), item("C", "B2B"), item("D"), item("E", " ")]);
    expect(core.map(i => i.Name)).toEqual(["A", "D", "E"]);
    expect(b2b.map(i => i.Name)).toEqual(["C"]);
    expect(skipped.map(i => i.Name)).toEqual(["B"]);
  });

  it("reads the type case-insensitively", () => {
    expect(debitInstrument("b2b")).toBe("B2B");
    expect(debitInstrument(" none ")).toBe("NONE");
    expect(debitInstrument(null)).toBe("CORE");
    expect(debitInstrument("unknown")).toBe("CORE");
  });
});

describe("createSepaDirectDebit", () => {
  const eeg = {
    name: "EEG Test", settlementInterval: "MONTHLY",
    accountInfo: {owner: "EEG Test", iban: "AT61 1904 3002 3457 3201", bic: "TESTATWW", creditorId: "AT12ZZZ00000000001"},
  } as unknown as Eeg;
  const period = {type: "MRP", year: 2026, segment: 9} as any;
  const items = [{Amount: 12.5, Iban: "AT611904300234573201", MandateRef: "M1", MandateDate: "2026-01-01", Name: "Firma X", EndToEndId: "1", InvoiceIds: ["R-1"], DebitType: "B2B"}];

  it("writes the instrument into LclInstrm and keeps the CORE payment id unchanged", async () => {
    const b2b = await createSepaDirectDebit(items, eeg, period, new Date("2026-10-15"), true, "B2B");
    const core = await createSepaDirectDebit(items, eeg, period, new Date("2026-10-15"), true, "CORE");
    expect(b2b).toMatch(/<LclInstrm>\s*<Cd>B2B<\/Cd>/);
    expect(core).toMatch(/<LclInstrm>\s*<Cd>CORE<\/Cd>/);
    const id = (xml: string) => xml.match(/<PmtInfId>([^<]*)<\/PmtInfId>/)![1];
    expect(id(b2b)).toBe(id(core) + "-B2B");
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

  it("lists the account owner like the \"Kein SEPA\" list, else the recipient name", () => {
    const {withoutIban} = splitRowsByIban([
      {"Empfänger Name": "Gerhard Schuster", "Empfänger Kontoeigner": "Schuster, Gerhard", "Empfänger Konto IBAN": ""},
      {"Empfänger Name": "Julia Auer", "Empfänger Kontoeigner": "", "Empfänger Konto IBAN": ""},
    ]);
    expect(withoutIban).toEqual(["Schuster, Gerhard", "Julia Auer"]);
  });
});
