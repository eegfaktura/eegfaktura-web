import {BillingDocumentAmounts} from "../../models/meteringpoint.model";

export interface AmountSum {
  count: number
  net: number
  vat: number
  gross: number
}

export interface BillingTotals {
  invoices: AmountSum
  // All credit notes, including those to producers with a VAT ID.
  creditNotes: AmountSum
  // Credit notes to producers with a VAT ID (CREDIT_NOTE_RC). Whether reverse charge applies is a tax question:
  // billing takes the VAT per line from the producer tariff, a document can mix lines with and without VAT.
  vatIdCreditNotes: AmountSum
  // Credit notes to producers with a VAT ID that pay out VAT: wrong if reverse charge applies (the community owes
  // the VAT then). The recipients, so the community can check their producer tariffs.
  vatIdCreditNotesWithVat: { vat: number, recipients: string[] }
  // Info documents (producer with a VAT ID, community without credit notes for all producers; no longer offered in
  // the settings). They are paid like credit notes in the SEPA export.
  infos: AmountSum
}

const cents = (v: number) => Math.round(v * 100) / 100 + 0
const empty = (): AmountSum => ({count: 0, net: 0, vat: 0, gross: 0})
const add = (sum: AmountSum, d: BillingDocumentAmounts) => {
  sum.count += 1
  sum.net += Number(d.netAmountInEuro ?? 0)
  sum.vat += Number(d.vat1SumInEuro ?? 0) + Number(d.vat2SumInEuro ?? 0)
  sum.gross += Number(d.grossAmountInEuro ?? 0)
}
const round = (s: AmountSum): AmountSum => ({count: s.count, net: cents(s.net), vat: cents(s.vat), gross: cents(s.gross)})

// Totals of a billing run (preview or final) from its documents, the same values as in the Excel export.
export const billingTotals = (documents: BillingDocumentAmounts[]): BillingTotals => {
  const invoices = empty()
  const creditNotes = empty()
  const vatIdCreditNotes = empty()
  const infos = empty()
  let paidOutVat = 0
  const recipients = new Set<string>()
  documents.forEach(d => {
    switch (d.billingDocumentType) {
      case "INVOICE":
        add(invoices, d)
        break
      case "CREDIT_NOTE_RC": {
        add(vatIdCreditNotes, d)
        add(creditNotes, d)
        const vat = Number(d.vat1SumInEuro ?? 0) + Number(d.vat2SumInEuro ?? 0)
        if (vat !== 0) {
          paidOutVat += vat
          recipients.add(d.recipientName || "?")
        }
        break
      }
      case "INFO":
        add(infos, d)
        break
      default:
        add(creditNotes, d)
    }
  })
  return {
    invoices: round(invoices),
    creditNotes: round(creditNotes),
    vatIdCreditNotes: round(vatIdCreditNotes),
    vatIdCreditNotesWithVat: {
      vat: cents(paidOutVat),
      recipients: Array.from(recipients).sort((a, b) => a.localeCompare(b, "de")),
    },
    infos: round(infos),
  }
}
