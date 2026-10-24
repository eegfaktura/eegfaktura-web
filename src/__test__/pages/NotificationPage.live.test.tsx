import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import {act} from "@testing-library/react";
import {renderWithProviders} from "../test-utils";

let tenant = "TE100100"
vi.mock("../../store/hook/Eeg.provider", () => ({useTenant: () => ({tenant})}))

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
  afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); tenant = "TE100100" })

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

  it("loads once when the browser tab becomes visible again", async () => {
    const get = mockNotifications([summary(true)])
    renderWithProviders(<NotificationPage/>)
    await flush()
    await act(async () => { document.dispatchEvent(new Event("visibilitychange")) })
    await flush()
    expect(get).toHaveBeenCalledTimes(2)
  })

  it("drops the answer of an older load that arrives after a newer one (community switch)", async () => {
    let first: (rows: object[]) => void = () => {}
    const get = vi.fn()
      .mockImplementationOnce(() => new Promise(resolve => { first = resolve }))
      .mockImplementation(async () => [JSON.parse(JSON.stringify(summary()))])
    Api.eegService = {getNotifications: get} as unknown as typeof Api.eegService
    const page = renderWithProviders(<NotificationPage/>)
    tenant = "TE100200"
    page.rerender(<NotificationPage/>)
    await flush()
    expect(get).toHaveBeenCalledTimes(2)
    expect(page.container.textContent).toContain("Zusammenfassung Energiedaten-Anforderung")

    await act(async () => { first([JSON.parse(JSON.stringify(summary(true)))]) })
    await flush()
    expect(page.container.textContent).not.toContain("läuft")
  })

  it("reports a failed load once until a load works again", async () => {
    const get = mockNotifications([summary(true)])
    const {store} = renderWithProviders(<NotificationPage/>)
    await flush()
    get.mockRejectedValue(new Error("Netzwerkfehler"))
    await act(async () => { vi.advanceTimersByTime(LIVE_REFRESH_MS) })
    await flush()
    const error = () => (store.getState() as any).eeg.error
    expect(error()).toEqual(expect.objectContaining({message: "Die Nachrichten konnten nicht geladen werden. (Netzwerkfehler)"}))

    store.dispatch({type: "eeg/setErrorState", payload: {message: "andere"}})  // a later error elsewhere
    await act(async () => { vi.advanceTimersByTime(LIVE_REFRESH_MS) })
    await flush()
    expect(get).toHaveBeenCalledTimes(3)
    expect(error().message).toBe("andere")  // the repeated poll failure is not reported again

    get.mockImplementation(async () => [JSON.parse(JSON.stringify(summary(true)))])
    await act(async () => { vi.advanceTimersByTime(LIVE_REFRESH_MS) })
    await flush()
    get.mockRejectedValue(new Error("wieder"))
    await act(async () => { vi.advanceTimersByTime(LIVE_REFRESH_MS) })
    await flush()
    expect(error().message).toBe("Die Nachrichten konnten nicht geladen werden. (wieder)")
  })

  it("never shows the old community's list when the new community's load fails", async () => {
    const get = mockNotifications([summary()])
    const page = renderWithProviders(<NotificationPage/>)
    await flush()
    expect(page.container.textContent).toContain("Zusammenfassung Energiedaten-Anforderung")

    tenant = "TE100200"
    get.mockRejectedValueOnce(new Error("neu"))
    page.rerender(<NotificationPage/>)
    await flush()
    expect(page.container.textContent).not.toContain("Zusammenfassung Energiedaten-Anforderung")
    expect((page.store.getState() as any).eeg.error.message).toBe("Die Nachrichten konnten nicht geladen werden. (neu)")
  })

  it("reports the new community's first failure although the old community's load failed", async () => {
    const get = mockNotifications([summary()])
    get.mockRejectedValueOnce(new Error("alt"))
    const page = renderWithProviders(<NotificationPage/>)
    await flush()
    const error = () => (page.store.getState() as any).eeg.error
    expect(error().message).toBe("Die Nachrichten konnten nicht geladen werden. (alt)")
    page.store.dispatch({type: "eeg/clearErrorState"})

    tenant = "TE100200"
    get.mockRejectedValueOnce(new Error("neu"))
    page.rerender(<NotificationPage/>)
    await flush()
    expect(error().message).toBe("Die Nachrichten konnten nicht geladen werden. (neu)")
  })

  it("does not poll without a live entry", async () => {
    const get = mockNotifications([summary()])
    renderWithProviders(<NotificationPage/>)
    await flush()
    await act(async () => { vi.advanceTimersByTime(3 * LIVE_REFRESH_MS) })
    expect(get).toHaveBeenCalledTimes(1)
  })
})
