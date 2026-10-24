import { describe, it, expect } from "vitest";
import {compactReference, createPmtInfId, createSepaCreditTransfer, createSepaDirectDebit, debitInstrument, splitDebitByType, splitRowsByIban, toSepaText} from "../../service/sepa.converter";
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

  it("leaves 'Kein SEPA' and an empty type out, splits B2B from CORE", () => {
    const {core, b2b, skipped, unset} = splitDebitByType([item("A", "CORE"), item("B", "NONE"), item("C", "B2B"), item("D"), item("E", " ")]);
    expect(core.map(i => i.Name)).toEqual(["A"]);
    expect(b2b.map(i => i.Name)).toEqual(["C"]);
    expect(skipped.map(i => i.Name)).toEqual(["B"]);
    expect(unset.map(i => i.Name)).toEqual(["D", "E"]);
  });

  it("reads the type case-insensitively; empty or unknown is UNSET", () => {
    expect(debitInstrument("b2b")).toBe("B2B");
    expect(debitInstrument(" core ")).toBe("CORE");
    expect(debitInstrument(" none ")).toBe("NONE");
    expect(debitInstrument(null)).toBe("UNSET");
    expect(debitInstrument("unknown")).toBe("UNSET");
  });
});

describe("createPmtInfId", () => {
  it("uses the year of the billed period, not the current year", () => {
    const eeg = {name: "EEG Test"} as unknown as Eeg;
    expect(createPmtInfId(eeg, {type: "Y", year: 2025, segment: 0}, 'G')).toBe("G2025Y000-EEGTEST");
  });

  // the bank refuses a file whose first 16 characters ("Bestandskontrollnummer") it has seen before
  it("is unique in its first 16 characters per file kind and period, also with a long name", () => {
    const eeg = {name: "EEG Strasshof an der Nordbahn"} as unknown as Eeg;
    const q3 = {type: "YQ", year: 2026, segment: 3} as const;
    const ids = [
      createPmtInfId(eeg, q3, 'G'),
      createPmtInfId(eeg, q3, 'C'),
      createPmtInfId(eeg, q3, 'B'),
      createPmtInfId(eeg, {...q3, segment: 4}, 'G'),
      createPmtInfId(eeg, {type: "YM", year: 2026, segment: 3}, 'G'),
      createPmtInfId(eeg, {...q3, year: 2027}, 'G'),
    ];
    expect(new Set(ids.map(id => id.slice(0, 16))).size).toBe(ids.length);
    ids.forEach(id => expect(id.length).toBeLessThanOrEqual(35));
    expect(ids[0]).toBe("G2026YQ003-EEGSTRASSH");
  });

  // a file downloaded and uploaded again must be refused by the bank (no double debit)
  it("is the same for the same file kind and period", () => {
    const eeg = {name: "EEG Test"} as unknown as Eeg;
    expect(createPmtInfId(eeg, {type: "YM", year: 2026, segment: 9}, 'C')).toBe(createPmtInfId(eeg, {type: "YM", year: 2026, segment: 9}, 'C'));
  });

  it("keeps only A-Z and 0-9 of the name", () => {
    const y = {type: "Y", year: 2026, segment: 0} as const;
    const id = (name: string) => createPmtInfId({name} as unknown as Eeg, y, 'C');
    expect(id("B&S Énergie/Wind Grüß")).toBe("C2026Y000-BSENERGIEW");
    expect(id("EEG Nord|ost")).toBe("C2026Y000-EEGNORDOST");
    expect(id("EEG A | B")).toBe("C2026Y000-EEGAB");
    // umlaut entered decomposed (u + combining diaeresis) gives the same id as the composed one
    expect(id("Grüne")).toBe(id("Grüne"));
    expect(id("&&")).toBe("C2026Y000");
  });
});

describe("compactReference", () => {
  const ticket6610818 = ["Rechnung202600051", "Gutschrift202600021", "Rechnung202600061", "Gutschrift202600027", "Rechnung202600090",
    "Gutschrift202600040", "Rechnung202600103", "Rechnung202600118", "Gutschrift202600056", "Rechnung202600123", "Gutschrift202600058"];

  it("keeps the full list when it fits", () => {
    expect(compactReference(["Rechnung202600051"])).toBe("Rechnung202600051");
    expect(compactReference(["Rechnung202600135", "Gutschrift202600070"])).toBe("Rechnung202600135 / Gutschrift202600070");
  });
  it("writes numbers of one type once with their common prefix when the list is too long", () => {
    const ref = compactReference(ticket6610818);
    expect(ref).toBe("Rechnung202600051/061/090/103/118/123 / Gutschrift202600021/027/040/056/058");
    expect(ref.length).toBeLessThanOrEqual(140);
  });
  it("never shortens a number of another length (no ambiguous short form)", () => {
    expect(compactReference(["R1000", "R999", "R1001"], 17)).toBe("R1000/001 / R999");
    expect(compactReference(["Rechnung20269", "Rechnung202610", "Rechnung202611"], 40)).toBe("Rechnung20269 / Rechnung202610/611");
  });
  it("drops from the longest group first, every type keeps its first number, the rest is counted", () => {
    const ids = [...Array.from({length: 30}, (_, i) => `Rechnung2026${String(100 + i * 7).padStart(5, "0")}`), "Gutschrift202600070"];
    const ref = compactReference(ids, 80);
    expect(ref.length).toBeLessThanOrEqual(80);
    expect(ref).toContain("Gutschrift202600070");
    expect(ref).toMatch(/\(\+\d+ weitere\)$/);
  });
  it("lists a document only once", () => {
    expect(compactReference(["Rechnung202600135", "Rechnung202600135"])).toBe("Rechnung202600135");
  });
  it("passes other ids through and cuts only a single overlong number", () => {
    expect(compactReference(["Storno-A", "Rechnung1"])).toBe("Storno-A / Rechnung1");
    expect(compactReference(["X".repeat(150)])).toHaveLength(140);
  });
});

describe("createSepaDirectDebit", () => {
  const eeg = {
    name: "EEG Test", settlementInterval: "MONTHLY",
    accountInfo: {owner: "EEG Test", iban: "AT61 1904 3002 3457 3201", bic: "TESTATWW", creditorId: "AT12ZZZ00000000001"},
  } as unknown as Eeg;
  const period = {type: "YM", year: 2026, segment: 9} as any;
  const items = [{Amount: 12.5, Iban: "AT611904300234573201", MandateRef: "M1", MandateDate: "2026-01-01", Name: "Firma X", EndToEndId: "1", InvoiceIds: ["R-1"], DebitType: "B2B"}];

  it("writes the instrument into LclInstrm and gives every file its own payment id", async () => {
    const b2b = await createSepaDirectDebit(items, eeg, period, new Date("2026-10-15"), true, "B2B");
    const core = await createSepaDirectDebit(items, eeg, period, new Date("2026-10-15"), true, "CORE");
    expect(b2b).toMatch(/<LclInstrm>\s*<Cd>B2B<\/Cd>/);
    expect(core).toMatch(/<LclInstrm>\s*<Cd>CORE<\/Cd>/);
    const id = (xml: string) => xml.match(/<PmtInfId>([^<]*)<\/PmtInfId>/)![1];
    const transfer = await createSepaCreditTransfer(items, eeg, period, new Date("2026-10-15"), true);
    expect(id(b2b)).toBe("B2026YM009-EEGTEST");
    expect(id(core)).toBe("C2026YM009-EEGTEST");
    expect(id(transfer)).toBe("G2026YM009-EEGTEST");
    const msgId = (xml: string) => xml.match(/<MsgId>([^<]*)<\/MsgId>/)![1];
    // the bank's 16-character check must tell the three files of one export apart, in both ids
    for (const ids of [[b2b, core, transfer].map(id), [b2b, core, transfer].map(msgId)]) {
      expect(new Set(ids.map(x => x.slice(0, 16))).size).toBe(3);
    }
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
