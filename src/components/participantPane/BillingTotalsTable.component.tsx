import React, {FC} from "react";
import {AmountSum, BillingTotals} from "./BillingTotals.functions";

const euro = (v: number) => v.toLocaleString("de-AT", {minimumFractionDigits: 2, maximumFractionDigits: 2})

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
      </tbody>
    </table>
    {totals.reverseChargeNet > 0 && (
      <div style={{padding: "4px 6px 0"}}>
        Davon Gutschriften ohne USt an Erzeuger mit UID: {euro(totals.reverseChargeNet)} € netto. Die USt dafür
        führt ggf. die EEG ab (Reverse Charge).
      </div>
    )}
  </div>
)

export default BillingTotalsTable
