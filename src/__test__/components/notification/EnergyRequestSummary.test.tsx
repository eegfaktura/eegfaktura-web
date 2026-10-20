import {describe, expect, it} from "vitest";
import {screen} from "@testing-library/react";
import {renderWithProviders} from "../../test-utils";
import EnergyRequestSummaryComponent from "../../../components/notification/EnergyRequestSummary.component";
import {
  acceptedMetersToCheck,
  EnergyRequestSummary,
  summaryGroups
} from "../../../components/notification/EnergyRequestSummary.functions";
import {EegParticipant} from "../../../models/members.model";

const from = new Date(2026, 8, 1).getTime()
const to = new Date(2026, 8, 30, 23, 45).getTime()

const summary = (s: Partial<EnergyRequestSummary>): EnergyRequestSummary => ({
  type: "ZUSAMMENFASSUNG_PT", runId: "r", requested: 2, from, to,
  accepted: [{meteringPoint: "AT1", from, to}, {meteringPoint: "AT2", from, to}],
  rejected: [], noAnswer: [], skipped: [], superseded: [], ...s,
})

const participant = (meters: { meteringPoint: string, status?: string }[]) => ({
  firstname: "Erika", lastname: "Muster",
  meters: meters.map(m => ({
    meteringPoint: m.meteringPoint, direction: "CONSUMPTION", status: m.status ?? "ACTIVE",
    participantState: {activeSince: "2024-01-01", inactiveSince: "2099-12-31"},
  })),
}) as unknown as EegParticipant

describe("EnergyRequestSummary (platform#173)", () => {
  it("lists only the problem groups that occur, in display order", () => {
    const groups = summaryGroups(summary({
      skipped: [{meteringPoint: "AT4", reason: "NOT_ACTIVE_IN_PERIOD"}],
      rejected: [{meteringPoint: "AT3", codes: ["Zählpunkt nicht gefunden"]}],
    }))
    expect(groups.map(g => g.title)).toEqual(["Abgelehnt", "Nicht angefordert"])
    expect(groups[0].lines[0].detail).toBe("Zählpunkt nicht gefunden")
    expect(groups[1].lines[0].detail).toBe("im Zeitraum nicht aktiv")
  })

  it("checks the energy data of the accepted metering points only", () => {
    const meters = acceptedMetersToCheck(summary({accepted: [{meteringPoint: "AT1", from, to}]}),
      [participant([{meteringPoint: "AT1"}, {meteringPoint: "AT9"}])])
    expect(meters.map(m => m.meteringPoint)).toEqual(["AT1"])
  })

  it("shows the header, a hint without problems and the data check button", () => {
    renderWithProviders(<EnergyRequestSummaryComponent summary={summary({})}/>)
    expect(screen.getByText(/01.09.2026 – 30.09.2026/)).toBeTruthy()
    expect(screen.getByText(/2 Zählpunkte angefordert, 2 angenommen/)).toBeTruthy()
    expect(screen.getByText("Alle Zählpunkte wurden angefordert und angenommen.")).toBeTruthy()
    expect(screen.getByText("Datenstand prüfen")).toBeTruthy()
  })

  it("shows a collapsible group with its count and no data check without accepted metering points", () => {
    renderWithProviders(<EnergyRequestSummaryComponent summary={summary({accepted: [], noAnswer: ["AT0001", "AT0002"]})}/>)
    expect(screen.getByText("Keine Antwort (2)")).toBeTruthy()
    expect(screen.getByText("AT0001")).toBeTruthy()
    expect(screen.queryByText("Datenstand prüfen")).toBeNull()
  })
})
