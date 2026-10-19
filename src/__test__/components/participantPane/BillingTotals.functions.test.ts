import {describe, expect, it} from "vitest";
import {billingTotals} from "../../../components/participantPane/BillingTotals.functions";
import {BillingDocumentAmounts} from "../../../models/meteringpoint.model";

const doc = (billingDocumentType: BillingDocumentAmounts["billingDocumentType"], net: number, vat1: number, vat2 = 0): BillingDocumentAmounts =>
  ({billingDocumentType, netAmountInEuro: net, vat1SumInEuro: vat1, vat2SumInEuro: vat2, grossAmountInEuro: net + vat1 + vat2})

describe("billingTotals", () => {
  it("sums invoices and credit notes separately, the balance is invoices minus credit notes gross", () => {
    const t = billingTotals([
      doc("INVOICE", 10.1, 2.02),
      doc("INVOICE", 0.2, 0.04, 0.01),
      doc("CREDIT_NOTE", 5, 0),
      doc("CREDIT_NOTE_RC", 3, 0.6),
    ])
    expect(t.invoices).toEqual({count: 2, net: 10.3, vat: 2.07, gross: 12.37})
    expect(t.creditNotes).toEqual({count: 2, net: 8, vat: 0.6, gross: 8.6})
    expect(t.balance).toBe(3.77)
  })

  it("counts only reverse charge credit notes without VAT as reverse charge net", () => {
    const t = billingTotals([doc("CREDIT_NOTE_RC", 100, 0), doc("CREDIT_NOTE_RC", 50, 10), doc("CREDIT_NOTE", 7, 0)])
    expect(t.reverseChargeNet).toBe(100)
  })

  it("counts info documents as paid to the member and treats missing amounts as 0", () => {
    const t = billingTotals([
      doc("INFO", 4, 0.8),
      {billingDocumentType: "INVOICE", netAmountInEuro: null, vat1SumInEuro: null, vat2SumInEuro: null, grossAmountInEuro: 6},
    ])
    expect(t.creditNotes.gross).toBe(4.8)
    expect(t.invoices).toEqual({count: 1, net: 0, vat: 0, gross: 6})
    expect(t.balance).toBe(1.2)
  })

  it("is all zero without documents", () => {
    expect(billingTotals([]).balance).toBe(0)
  })
})
