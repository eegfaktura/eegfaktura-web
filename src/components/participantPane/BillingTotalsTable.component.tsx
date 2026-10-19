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

// Shown below „Gesamte EEG (brutto)“: the VAT for credit note lines without VAT to producers with a VAT ID, if
// reverse charge applies. billing does not compute it; an estimate at the standard rate. Worded as a computed value,
// not as tax advice (decision 19.10.2026).
export const ReverseChargeLine: FC<{ totals: BillingTotals }> = ({totals}) => (
  <div style={{padding: "0 16px 8px", fontSize: "12px", textAlign: "right"}}>
    Rechnerischer Wert bei Reverse Charge ({REVERSE_CHARGE_VAT_PERCENT} % auf {euro(totals.reverseCharge.net)} € netto
    aus Gutschriften ohne USt an Erzeuger mit UID): <strong>{euro(totals.reverseCharge.vat)} €</strong>. Ob Reverse
    Charge anzuwenden ist, bitte mit der Steuerberatung klären.
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
