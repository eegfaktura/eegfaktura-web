import {BillingDocumentAmounts} from "../../models/meteringpoint.model";

export interface AmountSum {
  count: number
  net: number
  vat: number
  gross: number
}

export interface BillingTotals {
  invoices: AmountSum
  creditNotes: AmountSum
  // Credit notes to producers with a VAT ID (CREDIT_NOTE_RC) that carry no VAT: the community may owe the VAT
  // itself (reverse charge). billing does not compute that VAT, so only the net amount is shown.
  reverseChargeNet: number
  // What is paid in total: invoices minus credit notes, gross. Same as the sum over the members.
  balance: number
}

const cents = (v: number) => Math.round(v * 100) / 100
const empty = (): AmountSum => ({count: 0, net: 0, vat: 0, gross: 0})

// Totals of a billing run (preview or final) from its documents, the same values as in the Excel export.
// Every document that is not an invoice is paid to the member (credit note, reverse charge credit note, info).
export const billingTotals = (documents: BillingDocumentAmounts[]): BillingTotals => {
  const invoices = empty()
  const creditNotes = empty()
  let reverseChargeNet = 0
  documents.forEach(d => {
    const vat = Number(d.vat1SumInEuro ?? 0) + Number(d.vat2SumInEuro ?? 0)
    const sum = d.billingDocumentType === "INVOICE" ? invoices : creditNotes
    sum.count += 1
    sum.net += Number(d.netAmountInEuro ?? 0)
    sum.vat += vat
    sum.gross += Number(d.grossAmountInEuro ?? 0)
    if (d.billingDocumentType === "CREDIT_NOTE_RC" && vat === 0) {
      reverseChargeNet += Number(d.netAmountInEuro ?? 0)
    }
  })
  const round = (s: AmountSum): AmountSum => ({count: s.count, net: cents(s.net), vat: cents(s.vat), gross: cents(s.gross)})
  return {
    invoices: round(invoices),
    creditNotes: round(creditNotes),
    reverseChargeNet: cents(reverseChargeNet),
    balance: cents(invoices.gross - creditNotes.gross),
  }
}
