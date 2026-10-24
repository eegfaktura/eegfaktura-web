import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import {act} from "@testing-library/react";
import {renderWithProviders} from "../test-utils";

vi.mock("../../store/hook/Eeg.provider", () => ({useTenant: () => ({tenant: "TE100100"})}))

import NotificationPage, {LIVE_REFRESH_MS} from "../../pages/Notification.page";
import {Api} from "../../service";
import {hasLiveEntry} from "../../components/notification/EnergyRequestSummary.functions";
import {EegNotification, Message} from "../../models/eeg.model";

const summary = (live?: boolean) => ({
  id: 1, date: new Date(), type: "NOTIFICATION", process: "EDA_PROCESS",
  message: {
    type: "ZUSAMMENFASSUNG_PT", runId: "r", from: 0, to: 0, requested: 2, accepted: [], rejected: [],
    noAnswer: ["AT1"], skipped: [], superseded: [], ...(live ? {live} : {}),
  },
})

const mockNotifications = (rows: object[]) => {
  const get = vi.fn().mockImplementation(async () => rows.map(r => JSON.parse(JSON.stringify(r))))
  Api.eegService = {getNotifications: get} as unknown as typeof Api.eegService
  return get
}

const flush = () => act(async () => { await Promise.resolve() })

describe("Messages page: a running energy request refreshes", () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks() })

  it("recognises a live entry", () => {
    const n = (live?: boolean) => ({...summary(live), message: new Message(summary(live).message)}) as unknown as EegNotification
    expect(hasLiveEntry([n(true)])).toBe(true)
    expect(hasLiveEntry([n()])).toBe(false)
    expect(hasLiveEntry([])).toBe(false)
  })

  it("loads the list again every minute while a live entry is shown", async () => {
    const get = mockNotifications([summary(true)])
    renderWithProviders(<NotificationPage/>)
    await flush()
    expect(get).toHaveBeenCalledTimes(1)

    await act(async () => { vi.advanceTimersByTime(LIVE_REFRESH_MS) })
    await flush()
    expect(get).toHaveBeenCalledTimes(2)
  })

  it("does not poll without a live entry", async () => {
    const get = mockNotifications([summary()])
    renderWithProviders(<NotificationPage/>)
    await flush()
    await act(async () => { vi.advanceTimersByTime(3 * LIVE_REFRESH_MS) })
    expect(get).toHaveBeenCalledTimes(1)
  })
})
