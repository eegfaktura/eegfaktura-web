// The dialog gives the chosen date as local time: a typed date is local midnight, a picked date
// keeps the time of day. In Vienna both are still the previous day in UTC (finding 261005-ca1).
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

const row = (nr: string, name: string, iban: string, type: string, debit: string, amount: number) => ({
  "Nummer": nr, "Abrechnung": "A", "Dokumenttyp": type, "Rechnungsbetrag Brutto": amount,
  "Empfänger Name": name, "Empfänger Kontoeigner": name, "Empfänger Konto IBAN": iban,
  "Empfänger Mandatsreferenz": "M-" + nr, "Empfänger Mandatsausstellung": "2026-01-01", "Empfänger Einzugsart": debit,
});

const serve = () => {
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet([
    row("R1", "Anna", "AT611904300234573201", "Rechnung", "CORE", 10),
    row("R2", "Firma", "DE89370400440532013000", "Rechnung", "B2B", 20),
    row("G1", "Bert", "AT483200000012345864", "Gutschrift", "NONE", 5),
  ]), "Belege");
  const buf = XLSX.write(wb, {type: "array", bookType: "xlsx"});
  exportBillingExcelForSepa.mockResolvedValue({arrayBuffer: async () => buf});
};

describe("SEPA due date in Europe/Vienna", () => {
  it.each([
    ["local midnight (typed date)", new Date(2026, 9, 15, 0, 0)],
    ["local 01:00 (picked date)", new Date(2026, 9, 15, 1, 0)],
    ["local midnight in winter time", new Date(2026, 0, 15, 0, 0)],
  ])("writes the chosen calendar date for %s", async (_, collectionDate) => {
    serve();
    const r = await ConvertExcelToXML("TE1", "run", eeg, collectionDate, period, true, false);
    expect(r.files.map(f => f.name)).toEqual([expect.stringMatching(/SEPA_Direct_Debit$/),
      expect.stringMatching(/SEPA_Direct_Debit_B2B$/), expect.stringMatching(/SEPA_Credit_Transfer$/)]);
    const day = `${collectionDate.getFullYear()}-${String(collectionDate.getMonth() + 1).padStart(2, "0")}-15`;
    expect(r.files[0].content).toContain(`<ReqdColltnDt>${day}</ReqdColltnDt>`);
    expect(r.files[1].content).toContain(`<ReqdColltnDt>${day}</ReqdColltnDt>`);
    expect(r.files[2].content).toContain(`<ReqdExctnDt>${day}</ReqdExctnDt>`);
  });
});
