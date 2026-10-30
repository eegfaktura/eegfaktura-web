// Reads a workbook laid out like the billing SEPA export (BillingDocumentXlsxService: dates as serial numbers with
// the format "dd.mm.yy", amounts as plain numbers rounded to 2 decimals) and checks what ends up in the SEPA XML.
// Guards the SheetJS upgrade 0.18.5 -> 0.20.3 (0.20 reads dates as UTC): the expected values were produced with
// 0.18.5 and must stay the same.
process.env.TZ = 'Europe/Vienna'

import { describe, it, expect, vi } from "vitest";
import * as XLSX from "xlsx";

const exportBillingExcelForSepa = vi.fn();
vi.mock("../../service/index", () => ({Api: {eegService: {exportBillingExcelForSepa: (...a: any[]) => exportBillingExcelForSepa(...a)}}}));

import {ConvertExcelToXML} from "../../service/sepa.converter";
import {Eeg} from "../../models/eeg.model";

const eeg = {
  name: "EEG Test", settlementInterval: "MONTHLY",
  accountInfo: {owner: "EEG Test", iban: "AT61 1904 3002 3457 3201", bic: "TESTATWW", creditorId: "AT12ZZZ00000000001"},
} as unknown as Eeg;
const period = {type: "MRP", year: 2026, segment: 9} as any;

// Excel serial number of a calendar date (1900 date system), as Apache POI writes a LocalDate
const serial = (y: number, m: number, d: number) => (Date.UTC(y, m - 1, d) - Date.UTC(1899, 11, 30)) / 864e5;
const date = (y: number, m: number, d: number) => ({t: "n", v: serial(y, m, d), z: "dd.mm.yy"});

const header = ["Dokumenttyp", "Nummer", "Datum", "Abrechnung", "Empfänger Name", "Empfänger Kontoeigner",
  "Empfänger Konto IBAN", "Empfänger Mandatsausstellung", "Empfänger Mandatsreferenz", "Empfänger Einzugsart",
  "Rechnungsbetrag Brutto"];
// mandate dates around the DST switches, a year end and a leap day
const rows: any[][] = [
  ["Rechnung", "R1", date(2026, 9, 30), "2026-09", "Jörg Öß", "Jörg Öß", "AT61 1904 3002 3457 3201", date(2026, 3, 29), "M-1", "CORE", 1234.5],
  ["Rechnung", "R2", date(2026, 9, 30), "2026-09", "Müller & Söhne", "Müller & Söhne", "AT48 3200 0000 1234 5864", date(2026, 10, 25), "M-2", "CORE", 0.1],
  ["Rechnung", "R3", date(2026, 9, 30), "2026-09", "Anna", "Anna", "AT02 6000 0000 0134 9870", date(2025, 12, 31), "M-3", "CORE", 99999.99],
  ["Rechnung", "R4", date(2026, 9, 30), "2026-09", "Bert", "Bert", "DE89 3704 0044 0532 0130 00", date(2024, 2, 29), "M-4", "CORE", 12.35],
  ["Gutschrift", "G1", date(2026, 9, 30), "2026-09", "Carl", "Carl", "AT26 1100 0000 1234 5678", date(2026, 1, 1), "M-5", "NONE", 7.4],
];

const serve = () => {
  const ws = XLSX.utils.aoa_to_sheet([header]);
  rows.forEach((row, r) => row.forEach((v, c) => {
    ws[XLSX.utils.encode_cell({r: r + 1, c})] = typeof v === "object" ? v : {t: typeof v === "number" ? "n" : "s", v};
  }));
  ws["!ref"] = XLSX.utils.encode_range({s: {r: 0, c: 0}, e: {r: rows.length, c: header.length - 1}});
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Liste");
  const buf = XLSX.write(wb, {type: "array", bookType: "xlsx"});
  exportBillingExcelForSepa.mockResolvedValue({arrayBuffer: async () => buf});
};

const all = (xml: string, tag: string) => Array.from(xml.matchAll(new RegExp(`<${tag}[^>]*>([^<]*)</${tag}>`, "g")), m => m[1]);

describe("reading the billing SEPA export", () => {
  it("keeps mandate dates, amounts and IBANs of a billing-like workbook", async () => {
    serve();
    const r = await ConvertExcelToXML("TE1", "run", eeg, new Date(2026, 9, 15), period, false, false);
    expect(r.files.map(f => f.name)).toEqual([expect.stringMatching(/SEPA_Direct_Debit$/), expect.stringMatching(/SEPA_Credit_Transfer$/)]);
    const debit = r.files[0].content, transfer = r.files[1].content;
    expect(all(debit, "DtOfSgntr")).toEqual(["2026-03-29", "2026-10-25", "2025-12-31", "2024-02-29"]);
    expect(all(debit, "InstdAmt")).toEqual(["1234.50", "0.10", "99999.99", "12.35"]);
    expect(all(debit, "MndtId")).toEqual(["M-1", "M-2", "M-3", "M-4"]);
    expect(debit).toContain("<IBAN>AT611904300234573201</IBAN>");
    expect(debit).toContain("<IBAN>DE89370400440532013000</IBAN>");
    expect(all(transfer, "InstdAmt")).toEqual(["7.40"]);
    expect(transfer).toContain("<IBAN>AT261100000012345678</IBAN>");
  });
});
