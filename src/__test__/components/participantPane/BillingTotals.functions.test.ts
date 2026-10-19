import {describe, expect, it} from "vitest";
import {billingTotals, netWithoutVat, salesTaxation} from "../../../components/participantPane/BillingTotals.functions";
import {BillingDocumentAmounts} from "../../../models/meteringpoint.model";
import {EegTariff} from "../../../models/eeg.model";
import {EegParticipant} from "../../../models/members.model";

// VAT 1 at 20 %, VAT 2 at 10 % when set.
const doc = (billingDocumentType: BillingDocumentAmounts["billingDocumentType"], net: number, vat1: number, vat2 = 0,
             recipientName: string | null = "Muster", participantId: string | null = recipientName): BillingDocumentAmounts =>
  ({
    billingDocumentType, netAmountInEuro: net,
    vat1Percent: vat1 ? 20 : null, vat1SumInEuro: vat1,
    vat2Percent: vat2 ? 10 : null, vat2SumInEuro: vat2,
    grossAmountInEuro: net + vat1 + vat2, participantId, recipientName,
  })

describe("billingTotals", () => {
  it("sums invoices and credit notes separately, credit notes to producers with a VAT ID are credit notes", () => {
    const t = billingTotals([
      doc("INVOICE", 10.1, 2.02),
      doc("INVOICE", 0.2, 0.04, 0.01),
      doc("CREDIT_NOTE", 5, 0),
      doc("CREDIT_NOTE_RC", 3, 0.6),
    ])
    expect(t.invoices).toEqual({count: 2, net: 10.3, vat: 2.07, gross: 12.37})
    expect(t.creditNotes).toEqual({count: 2, net: 8, vat: 0.6, gross: 8.6})
  })

  it("keeps info documents apart and treats missing amounts as 0", () => {
    const t = billingTotals([
      doc("INFO", 4, 0.8),
      {billingDocumentType: "INVOICE", netAmountInEuro: null, vat1Percent: null, vat1SumInEuro: null,
        vat2Percent: null, vat2SumInEuro: null, grossAmountInEuro: 6, participantId: null, recipientName: null},
    ])
    expect(t.infos).toEqual({count: 1, net: 4, vat: 0.8, gross: 4.8})
    expect(t.creditNotes.count).toBe(0)
    expect(t.invoices).toEqual({count: 1, net: 0, vat: 0, gross: 6})
  })

  it("estimates reverse charge VAT at 20 % on the lines without VAT of credit notes to producers with a VAT ID", () => {
    const t = billingTotals([
      doc("CREDIT_NOTE_RC", 100, 0),
      doc("CREDIT_NOTE_RC", 150, 10),     // 50 net with VAT, 100 net without
      doc("CREDIT_NOTE", 40, 0),          // no VAT ID: not reverse charge
      doc("INVOICE", 30, 0),
    ])
    expect(t.reverseCharge).toEqual({net: 200, vat: 40})
  })

  it("lists producers with a VAT ID whose credit notes pay out VAT, once each and sorted", () => {
    const t = billingTotals([
      doc("CREDIT_NOTE_RC", 50, 10, 0, "Zach"),
      doc("CREDIT_NOTE_RC", 20, 4, 0, "Ähm"),
      doc("CREDIT_NOTE_RC", 30, 6, 0, "Zach"),
      doc("CREDIT_NOTE_RC", 100, 0, 0, "Ohne"),
      doc("CREDIT_NOTE", 10, 2, 0, "Privat"),
      doc("CREDIT_NOTE_RC", 5, 1, 0, null),
    ])
    expect(t.vatIdCreditNotesWithVat).toEqual({vat: 21, recipients: ["?", "Ähm", "Zach"]})
  })

  it("computes both margins, the small business one without input tax and minus reverse charge VAT", () => {
    // the documents of the dev test preview (TE100200, August 2026)
    const t = billingTotals([
      doc("INVOICE", 23.5, 4.7, 0, "001"),
      doc("CREDIT_NOTE_RC", 9.6, 1.92, 0, "002"),
      doc("INVOICE", 11.1, 2.22, 0, "003"),
      doc("CREDIT_NOTE_RC", 12, 0, 0, "003"),
    ])
    expect(t.marginStandard).toBe(13)
    expect(t.reverseCharge).toEqual({net: 12, vat: 2.4})
    expect(t.marginSmallBusiness).toBe(15.6)
    expect(t.vatIdCreditNoteCount).toBe(2)
  })

  it("counts info documents as paid out in both margins", () => {
    const t = billingTotals([doc("INVOICE", 100, 20), doc("INFO", 30, 6)])
    expect(t.marginStandard).toBe(70)
    expect(t.marginSmallBusiness).toBe(84)
  })

  it("counts two producers with the same name twice", () => {
    const t = billingTotals([doc("CREDIT_NOTE_RC", 50, 10, 0, "Huber", "p1"), doc("CREDIT_NOTE_RC", 50, 10, 0, "Huber", "p2")])
    expect(t.vatIdCreditNotesWithVat.recipients).toEqual(["Huber", "Huber"])
  })

  it("has no warning without VAT on credit notes to producers with a VAT ID", () => {
    expect(billingTotals([doc("CREDIT_NOTE_RC", 100, 0), doc("INVOICE", 10, 2)]).vatIdCreditNotesWithVat)
      .toEqual({vat: 0, recipients: []})
  })

  it("is all zero without documents", () => {
    const t = billingTotals([])
    expect(t.invoices.gross + t.creditNotes.gross + t.infos.gross + t.reverseCharge.vat).toBe(0)
  })
})

describe("salesTaxation", () => {
  const tariff = (id: string, type: "VZP" | "EZP" | "EEG", useVat: boolean) => ({id, type, useVat} as EegTariff)
  const rates = {
    vat: tariff("vat", "VZP", true), novat: tariff("novat", "VZP", false),
    prod: tariff("prod", "EZP", false), fee: tariff("fee", "EEG", false),
  }
  const member = (meters: [string, "CONSUMPTION" | "GENERATION", string][]) =>
    ({meters: meters.map(([meteringPoint, direction, tariff_id]) => ({meteringPoint, direction, tariff_id}))} as unknown as EegParticipant)
  const bill = (...ids: string[]) => ({id: "x", amount: 0, participantFee: 0, meteringPoints: ids.map(id => ({id, amount: 1}))})

  it("is standard taxation when the billed consumer tariffs have VAT, producers and fees do not count", () => {
    const p = [member([["AT1", "CONSUMPTION", "vat"], ["AT2", "GENERATION", "prod"]])]
    expect(salesTaxation([bill("AT1", "AT2")], p, rates)).toBe("STANDARD")
  })

  it("is the small business scheme without VAT on the consumer tariffs", () => {
    expect(salesTaxation([bill("AT1")], [member([["AT1", "CONSUMPTION", "novat"]])], rates)).toBe("SMALL_BUSINESS")
  })

  it("is mixed with both, but ignores consumer meters not billed in the run", () => {
    const p = [member([["AT1", "CONSUMPTION", "vat"], ["AT3", "CONSUMPTION", "novat"]])]
    expect(salesTaxation([bill("AT1", "AT3")], p, rates)).toBe("MIXED")
    expect(salesTaxation([bill("AT1")], p, rates)).toBe("STANDARD")
  })

  it("is unknown without a known consumer tariff", () => {
    expect(salesTaxation([bill("AT1")], [member([["AT1", "CONSUMPTION", "missing"]])], rates)).toBe("UNKNOWN")
  })
})

describe("netWithoutVat", () => {
  it("is the whole net without VAT", () => {
    expect(netWithoutVat(doc("CREDIT_NOTE_RC", 123.45, 0))).toBe(123.45)
  })

  it("takes back the net of the lines with VAT from both rates", () => {
    // 50 at 20 % (VAT 10) and 30 at 10 % (VAT 3), 20 without VAT
    expect(netWithoutVat(doc("CREDIT_NOTE_RC", 100, 10, 3))).toBe(20)
  })

  it("is 0 when every line has VAT, also with rounded VAT per line", () => {
    // three lines of 0.33 net: VAT 0.07 each (rounded), so 0.21 VAT on 0.99 net
    expect(netWithoutVat(doc("CREDIT_NOTE_RC", 0.99, 0.21))).toBe(0)
  })

  it("is 0 for a VAT sum without its rate", () => {
    expect(netWithoutVat({...doc("CREDIT_NOTE_RC", 100, 10), vat1Percent: null})).toBe(0)
  })
})
