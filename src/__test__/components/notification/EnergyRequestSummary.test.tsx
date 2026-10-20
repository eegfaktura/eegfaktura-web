import {afterEach, describe, expect, it, vi} from "vitest";
import {fireEvent, screen, waitFor} from "@testing-library/react";
import {renderWithProviders} from "../../test-utils";
import EnergyRequestSummaryComponent from "../../../components/notification/EnergyRequestSummary.component";
import {
  acceptedMetersToCheck,
  EnergyRequestSummary,
  meterCount,
  summaryGroups
} from "../../../components/notification/EnergyRequestSummary.functions";
import {EegParticipant} from "../../../models/members.model";
import {Api} from "../../../service";
import {initialState as participantInitial} from "../../../store/participant/states/participant.state";
import {BillingCheckResponse} from "../../../models/billingCheck.model";

const from = new Date(2026, 8, 1).getTime()
const to = new Date(2026, 8, 30, 23, 45).getTime()

const summary = (s: Partial<EnergyRequestSummary>): EnergyRequestSummary => ({
  type: "ZUSAMMENFASSUNG_PT", runId: "r", requested: 2, from, to,
  accepted: [{meteringPoint: "AT1", from, to}, {meteringPoint: "AT2", from, to}],
  rejected: [], noAnswer: [], skipped: [], superseded: [], ...s,
})

const participant = (id: string, lastname: string, meters: { meteringPoint: string, status?: string, equipmentName?: string }[]) => ({
  id, firstname: "Erika", lastname,
  meters: meters.map(m => ({
    meteringPoint: m.meteringPoint, direction: "CONSUMPTION", status: m.status ?? "ACTIVE", equipmentName: m.equipmentName,
    participantState: {activeSince: "2024-01-01", inactiveSince: "2099-12-31"},
  })),
}) as unknown as EegParticipant

const withParticipants = (participants: EegParticipant[]) => ({
  preloadedState: {
    participant: {
      ...participantInitial,
      ids: participants.map(p => p.id),
      entities: Object.fromEntries(participants.map(p => [p.id, p])),
    },
  },
})

const energy = (meters: { meteringPoint: string, missingCount: number }[]): BillingCheckResponse => ({
  periodStart: from, periodEnd: to,
  meters: meters.map(m => ({
    meteringPoint: m.meteringPoint, direction: "CONSUMPTION", activeSince: from, inactiveSince: to,
    l3Count: 0, l3Days: [], firstData: from, lastData: to,
    missingCount: m.missingCount, missingDays: m.missingCount > 0 ? ["2026-09-15"] : [],
  })),
  totals: {produced: 0, consumed: 0, allocated: 0, selfCovered: 0, surplus: 0},
} as unknown as BillingCheckResponse)

// Api is filled at runtime; the tests put in only what the component calls
const mockFetch = () => {
  const fetch = vi.fn()
  Api.energyService = {fetchBillingCheck: fetch} as unknown as typeof Api.energyService
  return fetch
}

afterEach(() => vi.restoreAllMocks())

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

  it("checks each accepted metering point over the period the backend requested, the active entry first", () => {
    const own = new Date(2026, 8, 15).getTime()
    const {toCheck, notCheckable} = acceptedMetersToCheck(
      summary({accepted: [{meteringPoint: "AT1", from: own, to}, {meteringPoint: "AT9", from, to}]}),
      [participant("p0", "Alt", [{meteringPoint: "AT1", status: "INACTIVE"}]), participant("p1", "Neu", [{meteringPoint: "AT1"}])])
    expect(toCheck).toHaveLength(1)
    expect(toCheck[0].participantName).toBe("Erika Neu")
    expect(toCheck[0].activeSince).toBe(own)
    expect(toCheck[0].inactiveSince).toBe(new Date(2026, 8, 30).getTime())
    expect(notCheckable).toEqual(["AT9"])
  })

  it("counts in singular and plural", () => {
    expect(meterCount(1)).toBe("1 Zählpunkt")
    expect(meterCount(3)).toBe("3 Zählpunkte")
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

  it("lists incomplete and not checkable metering points after the data check, and can check again", async () => {
    const fetch = mockFetch().mockResolvedValue(energy([{meteringPoint: "AT1", missingCount: 4}]))
    renderWithProviders(<EnergyRequestSummaryComponent summary={summary({})}/>,
      withParticipants([participant("p1", "Muster", [{meteringPoint: "AT1"}])]))

    fireEvent.click(screen.getByText("Datenstand prüfen"))
    await waitFor(() => expect(screen.getByText("Daten unvollständig (1)")).toBeTruthy())
    expect(screen.getByText(/4 Viertelstunden fehlen/)).toBeTruthy()
    expect(screen.getByText("Nicht prüfbar, Zählpunkt nicht geladen (1)")).toBeTruthy()
    expect(screen.queryByText("Alle angenommenen Zählpunkte haben Daten für den ganzen Zeitraum.")).toBeNull()
    expect(fetch.mock.calls[0][1].cps.map((c: { meteringPoint: string }) => c.meteringPoint)).toEqual(["AT1"])

    fireEvent.click(screen.getByText("Erneut prüfen"))
    await waitFor(() => expect(fetch).toHaveBeenCalledTimes(2))
  })

  it("does not report complete when nothing could be checked or energystore fails", async () => {
    const fetch = mockFetch().mockRejectedValue(new Error("down"))
    const {unmount} = renderWithProviders(<EnergyRequestSummaryComponent summary={summary({})}/>)
    fireEvent.click(screen.getByText("Datenstand prüfen"))
    await waitFor(() => expect(screen.getByText("Keiner der angenommenen Zählpunkte ist geladen.")).toBeTruthy())
    expect(fetch).not.toHaveBeenCalled()
    unmount()

    renderWithProviders(<EnergyRequestSummaryComponent summary={summary({})}/>,
      withParticipants([participant("p1", "Muster", [{meteringPoint: "AT1"}, {meteringPoint: "AT2"}])]))
    fireEvent.click(screen.getByText("Datenstand prüfen"))
    await waitFor(() => expect(screen.getByText("Energiedaten konnten nicht abgefragt werden.")).toBeTruthy())
    expect(screen.queryByText("Alle angenommenen Zählpunkte haben Daten für den ganzen Zeitraum.")).toBeNull()
  })
})
