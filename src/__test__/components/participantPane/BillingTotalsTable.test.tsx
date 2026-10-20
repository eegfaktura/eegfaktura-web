import {afterEach, describe, expect, it} from "vitest";
import {fireEvent, render, screen} from "@testing-library/react";
import {useState} from "react";
import BillingTotalsTable, {
  MarginLines,
  readTotalsOpen,
  TotalsToggle,
  writeTotalsOpen
} from "../../../components/participantPane/BillingTotalsTable.component";
import {BillingTotals} from "../../../components/participantPane/BillingTotals.functions";

const sum = {count: 3, net: 0, vat: 0, gross: 0}
const totals = (rcVat: number, paidOutVatTo: string[] = []) => ({
  invoices: sum, creditNotes: sum, infos: {...sum, count: 0},
  reverseCharge: {net: rcVat * 5, vat: rcVat},
  vatIdCreditNotesWithVat: {vat: paidOutVatTo.length > 0 ? 10 : 0, recipients: paidOutVatTo}, vatIdCreditNoteCount: 1,
  marginStandard: 0, marginSmallBusiness: 163.22,
}) as unknown as BillingTotals

afterEach(() => localStorage.clear())

describe("MarginLines (feedback 20.10.2026)", () => {
  it("shows the reverse charge VAT on its own line, so it cannot be read as the margin", () => {
    render(<MarginLines totals={totals(114.51)} taxation="SMALL_BUSINESS"/>)
    expect(screen.getByText(/Marge bei Kleinunternehmerregelung \(brutto, abzgl. rechnerischer USt bei Reverse Charge\):/)).toBeTruthy()
    expect(screen.getByText("163,22 €")).toBeTruthy()
    expect(screen.getByText("Rechnerische USt bei Reverse Charge (20 %): 114,51 €")).toBeTruthy()
  })

  it("has no reverse charge line without reverse charge VAT", () => {
    render(<MarginLines totals={totals(0)} taxation="SMALL_BUSINESS"/>)
    expect(screen.queryByText(/Rechnerische USt bei Reverse Charge/)).toBeNull()
    expect(screen.getByText(/Marge bei Kleinunternehmerregelung \(brutto\):/)).toBeTruthy()
  })
})

describe("collapsible breakdown", () => {
  it("is collapsed by default and keeps the viewer's choice", () => {
    expect(readTotalsOpen()).toBe(false)
    writeTotalsOpen(true)
    expect(readTotalsOpen()).toBe(true)
    writeTotalsOpen(false)
    expect(readTotalsOpen()).toBe(false)
  })

  it("keeps the note on paid-out VAT when collapsed, without the table", () => {
    render(<BillingTotalsTable totals={totals(0, ["Erzeuger GmbH"])} open={false}/>)
    expect(screen.getByText(/USt auf Gutschriften an Erzeuger mit UID/)).toBeTruthy()
    expect(screen.queryByText("Rechnungen (3)")).toBeNull()
  })

  it("shows the table when open", () => {
    render(<BillingTotalsTable totals={totals(0)} open={true}/>)
    expect(screen.getByText("Rechnungen (3)")).toBeTruthy()
  })

  it("toggles with the button", () => {
    const Host = () => {
      const [open, setOpen] = useState(false)
      return <><TotalsToggle open={open} onToggle={() => setOpen(o => !o)}/>{open && <span>offen</span>}</>
    }
    render(<Host/>)
    expect(screen.queryByText("offen")).toBeNull()
    fireEvent.click(screen.getByText("Aufstellung"))
    expect(screen.getByText("offen")).toBeTruthy()
  })
})
