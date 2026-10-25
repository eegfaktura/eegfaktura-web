import {afterEach, describe, expect, it, vi} from "vitest";
import {fireEvent, screen, waitFor, within} from "@testing-library/react";
import {renderWithProviders} from "../../test-utils";
import NotificationLayoutComponent from "../../../components/notification/NotificationLayout.component";
import {EegNotification, Message} from "../../../models/eeg.model";
import {EegParticipant} from "../../../models/members.model";
import {Api} from "../../../service";
import {initialState as participantInitial} from "../../../store/participant/states/participant.state";
import {BillingCheckResponse} from "../../../models/billingCheck.model";

const sep = [new Date(2026, 8, 1).getTime(), new Date(2026, 8, 30, 23, 45).getTime()]
const aug = [new Date(2026, 7, 1).getTime(), new Date(2026, 7, 31, 23, 45).getTime()]

const row = (id: number, [from, to]: number[], meteringPoint: string) => ({
  type: "NOTIFICATION", process: "EDA_PROCESS", date: new Date(),
  notification: {
    id, date: new Date(), type: "NOTIFICATION", process: "EDA_PROCESS",
    message: new Message({
      type: "ZUSAMMENFASSUNG_PT", runId: `r${id}`, from, to, requested: 1,
      accepted: [{meteringPoint, from, to}], rejected: [], noAnswer: [], skipped: [], superseded: [],
    }),
  } as unknown as EegNotification,
})

const participant = {
  id: "p1", firstname: "Erika", lastname: "Muster",
  meters: ["AT1", "AT2"].map(meteringPoint => ({
    meteringPoint, direction: "CONSUMPTION", status: "ACTIVE",
    participantState: {activeSince: "2024-01-01", inactiveSince: "2099-12-31"},
  })),
} as unknown as EegParticipant

const missing: BillingCheckResponse = {
  periodStart: sep[0], periodEnd: sep[1],
  meters: [{meteringPoint: "AT1", direction: "CONSUMPTION", activeSince: sep[0], inactiveSince: sep[1], l3Count: 0,
    l3Days: [], firstData: sep[0], lastData: sep[1], missingCount: 4, missingDays: ["2026-09-15"]}],
  totals: {produced: 0, consumed: 0, allocated: 0, selfCovered: 0, surplus: 0},
}

afterEach(() => vi.restoreAllMocks())

describe("NotificationLayout", () => {
  it("keeps the data check of a card with its notification when the list is reordered", async () => {
    Api.energyService = {fetchBillingCheck: vi.fn().mockResolvedValue(missing)} as unknown as typeof Api.energyService
    const september = row(20, sep, "AT1")
    const august = row(10, aug, "AT2")
    const {rerender} = renderWithProviders(<NotificationLayoutComponent notifications={[september, august]}/>, {
      preloadedState: {participant: {...participantInitial, ids: ["p1"], entities: {p1: participant}}},
    })

    const card = (text: RegExp) => screen.getByText(text).closest(".notification-item") as HTMLElement
    fireEvent.click(within(card(/01.09.2026/)).getByText("Datenstand prüfen"))
    await waitFor(() => expect(within(card(/01.09.2026/)).getByText("Daten unvollständig (1)")).toBeTruthy())

    // a reload puts a newer notification first; the result stays with the September card
    rerender(<NotificationLayoutComponent notifications={[row(30, aug, "AT2"), september, august]}/>)
    expect(within(card(/01.09.2026/)).getByText("Daten unvollständig (1)")).toBeTruthy()
    expect(screen.getAllByText("Daten unvollständig (1)")).toHaveLength(1)
  })
})
