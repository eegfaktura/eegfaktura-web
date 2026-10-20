import {describe, expect, it} from "vitest";
import {screen} from "@testing-library/react";
import {renderWithProviders} from "../../test-utils";
import EnergyRequestSummaryComponent from "../../../components/notification/EnergyRequestSummary.component";
import {EnergyRequestSummary, summaryGroups} from "../../../components/notification/EnergyRequestSummary.functions";

const summary = (s: Partial<EnergyRequestSummary>): EnergyRequestSummary => ({
  type: "ZUSAMMENFASSUNG_PT", runId: "r", requested: 3, complete: 3,
  from: new Date(2026, 8, 1).getTime(), to: new Date(2026, 8, 30, 23, 45).getTime(),
  rejected: [], noAnswer: [], incomplete: [], skipped: [], superseded: [], ...s,
})

describe("EnergyRequestSummary (platform#173)", () => {
  it("lists only the problem groups that occur, in display order", () => {
    const groups = summaryGroups(summary({
      skipped: [{meteringPoint: "AT4", reason: "NOT_ACTIVE_IN_PERIOD"}],
      rejected: [{meteringPoint: "AT1", codes: ["Zählpunkt nicht gefunden"]}],
      incomplete: [
        {meteringPoint: "AT2", dataFrom: new Date(2026, 8, 1).getTime(), dataTo: new Date(2026, 8, 28).getTime()},
        {meteringPoint: "AT3"},
      ],
    }))
    expect(groups.map(g => g.title)).toEqual(["Abgelehnt", "Angenommen, aber Daten unvollständig", "Nicht angefordert"])
    expect(groups[0].lines[0].detail).toBe("Zählpunkt nicht gefunden")
    // the delivery ends at the start of 28.09. (exclusive): it covers up to 27.09.
    expect(groups[1].lines[0].detail).toBe("Daten 01.09.2026 – 27.09.2026")
    expect(groups[1].lines[1].detail).toBe("keine Daten")
    expect(groups[2].lines[0].detail).toBe("im Zeitraum nicht aktiv")
  })

  it("shows the header and a hint when everything was delivered", () => {
    renderWithProviders(<EnergyRequestSummaryComponent summary={summary({})}/>)
    expect(screen.getByText(/01.09.2026 – 30.09.2026/)).toBeTruthy()
    expect(screen.getByText(/3 Zählpunkte angefordert, 3 mit vollständigen Daten/)).toBeTruthy()
    expect(screen.getByText("Alle Zählpunkte haben Daten für den ganzen Zeitraum geliefert.")).toBeTruthy()
  })

  it("shows a collapsible group with its count", () => {
    renderWithProviders(<EnergyRequestSummaryComponent summary={summary({noAnswer: ["AT0001"], complete: 2})}/>)
    expect(screen.getByText("Keine Antwort (1)")).toBeTruthy()
    expect(screen.getByText("AT0001")).toBeTruthy()
  })
})
