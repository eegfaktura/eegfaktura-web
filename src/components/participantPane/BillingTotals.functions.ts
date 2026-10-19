import {BillingDocumentAmounts, ParticipantBillType} from "../../models/meteringpoint.model";
import {EegParticipant} from "../../models/members.model";
import {EegTariff} from "../../models/eeg.model";

// How the community taxes its sales, read from the consumer tariffs of the metering points billed in the run
// (decision 19.10.2026): selling electricity with VAT means standard taxation, without VAT the small business scheme.
// The membership fee does not count (it can be without VAT under standard taxation as well).
// MIXED: tariffs with and without VAT; UNKNOWN: no consumer tariff found (e.g. tariffs not loaded).
export type SalesTaxation = "STANDARD" | "SMALL_BUSINESS" | "MIXED" | "UNKNOWN"

export const salesTaxation = (bills: ParticipantBillType[], participants: EegParticipant[],
                              rates: Record<string, EegTariff>): SalesTaxation => {
  const billed = new Set(bills.flatMap(b => b.meteringPoints.map(m => m.id)))
  const withVat = new Set<boolean>()
  participants.forEach(p => p.meters.forEach(m => {
    if (m.direction !== "CONSUMPTION" || !billed.has(m.meteringPoint)) return
    const tariff = m.tariff_id ? rates[m.tariff_id] : undefined
    if (tariff && tariff.type === "VZP") withVat.add(!!tariff.useVat)
  }))
  if (withVat.size === 2) return "MIXED"
  if (withVat.has(true)) return "STANDARD"
  if (withVat.has(false)) return "SMALL_BUSINESS"
  return "UNKNOWN"
}

export interface AmountSum {
  count: number
  net: number
  vat: number
  gross: number
}

// VAT rate for the reverse charge estimate: the standard rate for electricity. billing has no rate for lines with 0 %.
export const REVERSE_CHARGE_VAT_PERCENT = 20

export interface BillingTotals {
  invoices: AmountSum
  // All credit notes, including those to producers with a VAT ID.
  creditNotes: AmountSum
  // Lines without VAT on credit notes to producers with a VAT ID (CREDIT_NOTE_RC): the community owes the VAT for
  // them if reverse charge applies (not for a small business with a VAT ID). An estimate at 20 %.
  reverseCharge: { net: number, vat: number }
  // Credit notes to producers with a VAT ID that pay out VAT: wrong if reverse charge applies (the community owes
  // the VAT then). The recipients, so the community can check their producer tariffs.
  vatIdCreditNotesWithVat: { vat: number, recipients: string[] }
  // Number of credit notes to producers with a VAT ID, with or without VAT.
  vatIdCreditNoteCount: number
  // Info documents (producer with a VAT ID, community without credit notes for all producers; no longer offered in
  // the settings). They are paid like credit notes in the SEPA export.
  infos: AmountSum
  // Computed margins (decision 19.10.2026). Standard taxation: VAT is passed on (input tax), so invoices net minus
  // credit notes net; reverse charge is neutral. Small business: no input tax, so VAT paid on credit notes is a cost
  // and the reverse charge VAT is paid by the community: invoices gross minus credit notes gross minus reverse charge.
  marginStandard: number
  marginSmallBusiness: number
}

const cents = (v: number) => Math.round(v * 100) / 100 + 0
const empty = (): AmountSum => ({count: 0, net: 0, vat: 0, gross: 0})
const vatOf = (d: BillingDocumentAmounts) => Number(d.vat1SumInEuro ?? 0) + Number(d.vat2SumInEuro ?? 0)
const add = (sum: AmountSum, d: BillingDocumentAmounts) => {
  sum.count += 1
  sum.net += Number(d.netAmountInEuro ?? 0)
  sum.vat += vatOf(d)
  sum.gross += Number(d.grossAmountInEuro ?? 0)
}
const round = (s: AmountSum): AmountSum => ({count: s.count, net: cents(s.net), vat: cents(s.vat), gross: cents(s.gross)})

// Net of the lines without VAT. The document has only sums per VAT rate, so the net of the lines with VAT is taken
// back from VAT sum and rate: exact for a document without VAT, a few cents off for a mixed one (VAT is rounded per
// line). A VAT sum without its rate cannot be taken back; such a document counts as having no lines without VAT.
export const netWithoutVat = (d: BillingDocumentAmounts): number => {
  let net = Number(d.netAmountInEuro ?? 0)
  for (const [sum, percent] of [[d.vat1SumInEuro, d.vat1Percent], [d.vat2SumInEuro, d.vat2Percent]]) {
    const vat = Number(sum ?? 0)
    if (vat === 0) continue
    const rate = Number(percent ?? 0)
    if (rate <= 0) return 0
    net -= vat * 100 / rate
  }
  return Math.max(0, cents(net))
}

// Totals of a billing run (preview or final) from its documents, the same values as in the Excel export.
export const billingTotals = (documents: BillingDocumentAmounts[]): BillingTotals => {
  const invoices = empty()
  const creditNotes = empty()
  const infos = empty()
  let reverseChargeNet = 0
  let paidOutVat = 0
  let vatIdCreditNoteCount = 0
  // per member (two producers can have the same name)
  const recipients = new Map<string, string>()
  documents.forEach(d => {
    switch (d.billingDocumentType) {
      case "INVOICE":
        add(invoices, d)
        break
      case "CREDIT_NOTE_RC": {
        add(creditNotes, d)
        vatIdCreditNoteCount += 1
        reverseChargeNet += netWithoutVat(d)
        const vat = vatOf(d)
        if (vat !== 0) {
          paidOutVat += vat
          recipients.set(d.participantId || `doc-${recipients.size}`, d.recipientName || "?")
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
  const reverseCharge = {
    net: cents(reverseChargeNet),
    vat: cents(cents(reverseChargeNet) * REVERSE_CHARGE_VAT_PERCENT / 100),
  }
  return {
    invoices: round(invoices),
    creditNotes: round(creditNotes),
    reverseCharge,
    vatIdCreditNotesWithVat: {
      vat: cents(paidOutVat),
      recipients: Array.from(recipients.values()).sort((a, b) => a.localeCompare(b, "de")),
    },
    vatIdCreditNoteCount,
    infos: round(infos),
    // info documents are paid like credit notes
    marginStandard: cents(invoices.net - creditNotes.net - infos.net),
    marginSmallBusiness: cents(invoices.gross - creditNotes.gross - infos.gross - reverseCharge.vat),
  }
}
