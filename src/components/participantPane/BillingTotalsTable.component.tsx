import React, {FC} from "react";
import {AmountSum, BillingTotals, REVERSE_CHARGE_VAT_PERCENT} from "./BillingTotals.functions";

// "+ 0" turns -0 into 0, so a total that rounds to zero does not show as "-0,00".
export const euro = (v: number) => (v + 0).toLocaleString("de-AT", {minimumFractionDigits: 2, maximumFractionDigits: 2})

const cell: React.CSSProperties = {padding: "2px 6px", textAlign: "right", whiteSpace: "nowrap"}

const Row: FC<{ label: string, sum: AmountSum }> = ({label, sum}) => (
  <tr>
    <td style={{...cell, textAlign: "left"}}>{label} ({sum.count})</td>
    <td style={cell}>{euro(sum.net)}</td>
    <td style={cell}>{euro(sum.vat)}</td>
    <td style={cell}>{euro(sum.gross)}</td>
  </tr>
)

// Totals of the billing run per document type (platform#169), the same values as in the Excel export.
const BillingTotalsTable: FC<{ totals: BillingTotals }> = ({totals}) => (
  <div style={{padding: "8px 16px 0", fontSize: "12px"}}>
    <table style={{width: "100%", borderCollapse: "collapse"}}>
      <thead>
      <tr style={{borderBottom: "1px solid var(--ion-border-color, #dcdcdc)"}}>
        <th style={{...cell, textAlign: "left"}}>€</th>
        <th style={cell}>netto</th>
        <th style={cell}>USt</th>
        <th style={cell}>brutto</th>
      </tr>
      </thead>
      <tbody>
      <Row label="Rechnungen" sum={totals.invoices}/>
      <Row label="Gutschriften" sum={totals.creditNotes}/>
      {totals.infos.count > 0 && <Row label="Info-Belege" sum={totals.infos}/>}
      </tbody>
    </table>
    {totals.vatIdCreditNotesWithVat.recipients.length > 0 && <PaidOutVatWarning {...totals.vatIdCreditNotesWithVat}/>}
  </div>
)

// Shown below „Saldo Zahlungen (brutto)“: computed margins for standard taxation and for the small business scheme
// (decision 19.10.2026). The reverse charge VAT (20 % on the credit note lines without VAT to producers with a VAT ID)
// is a cost only without input tax, so it is deducted from the small business margin. Worded as computed values, not
// as tax advice; the reverse charge sentence only when the run has credit notes to producers with a VAT ID and the
// note on paid-out VAT does not already say it.
export const MarginLines: FC<{ totals: BillingTotals }> = ({totals}) => (
  <div style={{padding: "0 16px 8px", fontSize: "12px", textAlign: "right"}}>
    <div>Marge bei Regelbesteuerung (netto): <strong>{euro(totals.marginStandard)} €</strong></div>
    <div>
      Marge bei Kleinunternehmerregelung (brutto
      {totals.reverseCharge.vat > 0 &&
        `, abzgl. ${euro(totals.reverseCharge.vat)} € rechnerischer USt bei Reverse Charge (${REVERSE_CHARGE_VAT_PERCENT} %)`}):
      {" "}<strong>{euro(totals.marginSmallBusiness)} €</strong>
    </div>
    <div style={{color: "var(--ion-color-medium, #92949c)"}}>
      Rechnerische Werte, keine steuerliche Beratung.
      {totals.vatIdCreditNoteCount > 0 && totals.vatIdCreditNotesWithVat.recipients.length === 0 &&
        " Ob Reverse Charge anzuwenden ist, bitte mit der Steuerberatung klären."}
    </div>
  </div>
)

const SHOWN_RECIPIENTS = 10

const PaidOutVatWarning: FC<{ vat: number, recipients: string[] }> = ({vat, recipients}) => {
  const shown = recipients.slice(0, SHOWN_RECIPIENTS).join(", ")
  const more = recipients.length - SHOWN_RECIPIENTS
  return (
    <div style={{
      margin: "6px 0 0", padding: "6px", borderLeft: "4px solid var(--ion-color-warning, #ffc409)",
      background: "rgba(255, 196, 9, 0.15)"
    }}>
      {/* Describes the documents only, no tax advice (decision 19.10.2026). */}
      <strong>Hinweis:</strong> {euro(vat)} € USt auf Gutschriften an Erzeuger mit UID
      ({shown}{more > 0 ? ` und ${more} weitere` : ""}). Bitte mit eurer Steuerberatung prüfen, ob Reverse Charge
      anzuwenden ist. Keine steuerliche Beratung.
    </div>
  )
}

export default BillingTotalsTable
