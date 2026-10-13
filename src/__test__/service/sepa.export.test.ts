import { describe, it, expect, vi, beforeEach } from "vitest";
import * as XLSX from "xlsx";

const exportBillingExcelForSepa = vi.fn();
vi.mock("../../service/index", () => ({Api: {eegService: {exportBillingExcelForSepa: (...a: any[]) => exportBillingExcelForSepa(...a)}}}));

import {ConvertExcelToXML} from "../../service/sepa.converter";
import {Eeg} from "../../models/eeg.model";

const eeg = (creditorId?: string) => ({
  name: "EEG Test", settlementInterval: "MONTHLY",
  accountInfo: {owner: "EEG Test", iban: "AT61 1904 3002 3457 3201", bic: "TESTATWW", creditorId},
}) as unknown as Eeg;
const period = {type: "MRP", year: 2026, segment: 9} as any;

// rows like the billing Excel export
const row = (nr: string, name: string, iban: string, type: string, debit: string, amount: number, mandate = "M-" + nr) => ({
  "Nummer": nr, "Abrechnung": "A", "Dokumenttyp": type, "Rechnungsbetrag Brutto": amount,
  "Empfänger Name": name, "Empfänger Kontoeigner": name, "Empfänger Konto IBAN": iban,
  "Empfänger Mandatsreferenz": mandate, "Empfänger Mandatsausstellung": "2026-01-01", "Empfänger Einzugsart": debit,
});

const serve = (rows: any[]) => {
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(rows), "Belege");
  const buf = XLSX.write(wb, {type: "array", bookType: "xlsx"});
  exportBillingExcelForSepa.mockResolvedValue({arrayBuffer: async () => buf});
};

const run = (e: Eeg) => ConvertExcelToXML("TE1", "run", e, new Date("2026-10-15"), period, true, true);
const IBAN_A = "AT611904300234573201", IBAN_B = "DE89370400440532013000";

describe("ConvertExcelToXML", () => {
  beforeEach(() => exportBillingExcelForSepa.mockReset());

  it("an all-B2B run gives only the B2B file, no empty CORE or credit transfer file", async () => {
    serve([row("R1", "Firma X", IBAN_A, "Rechnung", "B2B", 10)]);
    const r = await run(eeg("AT12ZZZ00000000001"));
    expect(r.files.map(f => f.name)).toEqual([expect.stringMatching(/SEPA_Direct_Debit_B2B$/)]);
  });

  it("keeps a CORE and a B2B member on one account apart when summarizing", async () => {
    serve([row("R1", "Anna", IBAN_A, "Rechnung", "CORE", 10), row("R2", "Firma", IBAN_A, "Rechnung", "B2B", 20)]);
    const r = await run(eeg("AT12ZZZ00000000001"));
    expect(r.files).toHaveLength(2);
    expect(r.files[0].content).toContain("<InstdAmt Ccy=\"EUR\">10.00</InstdAmt>");
    expect(r.files[1].content).toContain("<InstdAmt Ccy=\"EUR\">20.00</InstdAmt>");
  });

  it("without creditor ID gives only the credit transfer file and flags the missing debit file", async () => {
    serve([row("R1", "Anna", IBAN_A, "Rechnung", "CORE", 10), row("G1", "Bert", IBAN_B, "Gutschrift", "NONE", 5)]);
    const r = await run(eeg(undefined));
    expect(r.files.map(f => f.name)).toEqual([expect.stringMatching(/SEPA_Credit_Transfer$/)]);
    expect(r.missingCreditorId).toBe(true);
  });

  it("lists 'Kein SEPA' debtors and does not flag a creditor ID when nothing is debited", async () => {
    serve([row("R1", "Anna", IBAN_A, "Rechnung", "NONE", 10)]);
    const r = await run(eeg(undefined));
    expect(r.files).toEqual([]);
    expect(r.skippedDebit).toEqual(["Anna"]);
    expect(r.missingCreditorId).toBe(false);
  });
});
