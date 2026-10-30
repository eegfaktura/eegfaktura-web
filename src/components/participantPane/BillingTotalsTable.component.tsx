import React, {FC} from "react";
import {IonButton, IonIcon} from "@ionic/react";
import {chevronDown, chevronForward} from "ionicons/icons";
import {AmountSum, BillingTotals, REVERSE_CHARGE_VAT_PERCENT, SalesTaxation} from "./BillingTotals.functions";
import {formatDecimal2} from "../../util/Number.util";

// formatDecimal2 turns -0 into 0, so a total that rounds to zero does not show as "-0,00".
export const euro = (v: number) => formatDecimal2(v)

const cell: React.CSSProperties = {padding: "2px 6px", textAlign: "right", whiteSpace: "nowrap"}

const Row: FC<{ label: string, sum: AmountSum }> = ({label, sum}) => (
  <tr>
    <td style={{...cell, textAlign: "left"}}>{label} ({sum.count})</td>
    <td style={cell}>{euro(sum.net)}</td>
    <td style={cell}>{euro(sum.vat)}</td>
    <td style={cell}>{euro(sum.gross)}</td>
  </tr>
)

// Totals of the billing run per document type (platform#169), the same values as in the Excel export. Collapsed
// (open = false) only the note on paid-out VAT remains: it is a warning.
const BillingTotalsTable: FC<{ totals: BillingTotals, open: boolean }> = ({totals, open}) => (
  <div style={{padding: "8px 16px 0", fontSize: "12px"}}>
    {open && <table style={{width: "100%", borderCollapse: "collapse"}}>
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
    </table>}
    {totals.vatIdCreditNotesWithVat.recipients.length > 0 && <PaidOutVatWarning {...totals.vatIdCreditNotesWithVat}/>}
  </div>
)

// Shown below „Saldo Zahlungen (brutto)“: computed margins for standard taxation and for the small business scheme
// (decision 19.10.2026). The reverse charge VAT (20 % on the credit note lines without VAT to producers with a VAT ID)
// is a cost only without input tax, so it is deducted from the small business margin. Worded as computed values, not
// as tax advice; the reverse charge sentence only when the run has credit notes to producers with a VAT ID and the
// note on paid-out VAT does not already say it.
// Only the margin that fits the consumer tariffs (with VAT: standard taxation, without: small business scheme); both
// when the tariffs are mixed or unknown.
export const MarginLines: FC<{ totals: BillingTotals, taxation: SalesTaxation }> = ({totals, taxation}) => (
  <div style={{padding: "0 16px 8px", fontSize: "12px", textAlign: "right"}}>
    {taxation !== "SMALL_BUSINESS" &&
      <div>Marge bei Regelbesteuerung (netto): <strong>{euro(totals.marginStandard)} €</strong></div>}
    {/* the reverse charge VAT on its own line, so it cannot be read as the margin (feedback 20.10.2026) */}
    {taxation !== "STANDARD" &&
      <div>
        Marge bei Kleinunternehmerregelung (brutto
        {totals.reverseCharge.vat > 0 ? ", nach Abzug der rechnerischen USt bei Reverse Charge" : ""}):
        {" "}<strong>{euro(totals.marginSmallBusiness)} €</strong>
      </div>}
    {taxation !== "STANDARD" && totals.reverseCharge.vat > 0 &&
      <div>Rechnerische USt bei Reverse Charge ({REVERSE_CHARGE_VAT_PERCENT} %): {euro(totals.reverseCharge.vat)} €</div>}
    {taxation === "MIXED" && <div>Verbrauchertarife teils mit, teils ohne USt. Bitte prüfen.</div>}
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

// The breakdown takes much height in the pane footer: it can be collapsed, and each viewer's choice is kept in the
// browser (expanded by default). Storage can be missing or blocked: then it is just expanded.
const TOTALS_OPEN_KEY = "eegfaktura.billingTotalsOpen"

export const readTotalsOpen = (): boolean => {
  try {
    return localStorage.getItem(TOTALS_OPEN_KEY) !== "0"
  } catch {
    return true
  }
}

export const writeTotalsOpen = (open: boolean) => {
  try {
    localStorage.setItem(TOTALS_OPEN_KEY, open ? "1" : "0")
  } catch {
    // not kept, still works for this page
  }
}

export const TotalsToggle: FC<{ open: boolean, onToggle: () => void }> = ({open, onToggle}) => (
  // ion-button copies aria attributes to its inner button only when it loads: remount it on every change
  // only the chevron (feedback 20.10.2026); the label stays for screen readers and as tooltip
  <IonButton key={String(open)} slot="start" fill="clear" size="small" onClick={onToggle} aria-expanded={open}
             aria-label={open ? "Aufstellung zuklappen" : "Aufstellung aufklappen"}
             title={open ? "Aufstellung zuklappen" : "Aufstellung aufklappen"}>
    <IonIcon slot="icon-only" icon={open ? chevronDown : chevronForward}/>
  </IonButton>
)

export default BillingTotalsTable
