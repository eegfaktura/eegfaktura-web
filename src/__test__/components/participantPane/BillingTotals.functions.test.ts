import {describe, expect, it} from "vitest";
import {billingTotals} from "../../../components/participantPane/BillingTotals.functions";
import {BillingDocumentAmounts} from "../../../models/meteringpoint.model";

const doc = (billingDocumentType: BillingDocumentAmounts["billingDocumentType"], net: number, vat1: number, vat2 = 0,
             recipientName: string | null = "Muster"): BillingDocumentAmounts =>
  ({billingDocumentType, netAmountInEuro: net, vat1SumInEuro: vat1, vat2SumInEuro: vat2, grossAmountInEuro: net + vat1 + vat2, recipientName})

describe("billingTotals", () => {
  it("sums invoices and credit notes separately, credit notes to producers with a VAT ID count in both", () => {
    const t = billingTotals([
      doc("INVOICE", 10.1, 2.02),
      doc("INVOICE", 0.2, 0.04, 0.01),
      doc("CREDIT_NOTE", 5, 0),
      doc("CREDIT_NOTE_RC", 3, 0.6),
    ])
    expect(t.invoices).toEqual({count: 2, net: 10.3, vat: 2.07, gross: 12.37})
    expect(t.creditNotes).toEqual({count: 2, net: 8, vat: 0.6, gross: 8.6})
    expect(t.vatIdCreditNotes).toEqual({count: 1, net: 3, vat: 0.6, gross: 3.6})
  })

  it("keeps info documents apart and treats missing amounts as 0", () => {
    const t = billingTotals([
      doc("INFO", 4, 0.8),
      {billingDocumentType: "INVOICE", netAmountInEuro: null, vat1SumInEuro: null, vat2SumInEuro: null, grossAmountInEuro: 6, recipientName: null},
    ])
    expect(t.infos).toEqual({count: 1, net: 4, vat: 0.8, gross: 4.8})
    expect(t.creditNotes.count).toBe(0)
    expect(t.invoices).toEqual({count: 1, net: 0, vat: 0, gross: 6})
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

  it("has no warning without VAT on credit notes to producers with a VAT ID", () => {
    expect(billingTotals([doc("CREDIT_NOTE_RC", 100, 0), doc("INVOICE", 10, 2)]).vatIdCreditNotesWithVat)
      .toEqual({vat: 0, recipients: []})
  })

  it("is all zero without documents", () => {
    const t = billingTotals([])
    expect(t.invoices.gross + t.creditNotes.gross + t.infos.gross).toBe(0)
  })
})
