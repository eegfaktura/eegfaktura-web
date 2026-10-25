import {afterEach, describe, expect, it, vi} from "vitest";
import {configureStore} from "@reduxjs/toolkit";
import {reducer} from "../../store/store";
import {selectTenant} from "../../store/eeg";
import {participantApi} from "../../store/participant/api";
import {Api} from "../../service";

// the API base URL is read when the module loads
vi.hoisted(() => { vi.stubEnv("VITE_API_SERVER_URL", "http://api.test") })

// 261024-ca13 review 1: a participant mutation goes out for the community it was started for, even when the
// community is switched while the token is looked up.

describe("participantApi tenant header (261024-ca13)", () => {
  afterEach(() => { vi.unstubAllGlobals() })

  it("sends the community of the call, not the one selected after the token lookup", async () => {
    let releaseToken: (t: string) => void = () => {}
    ;(Api as any).authService = {lookupToken: () => new Promise<string>(r => { releaseToken = r })}
    const fetchMock = vi.fn().mockImplementation(async (req: Request) =>
      new Response(JSON.stringify({id: "p1", meters: []}), {status: 200, headers: {"Content-Type": "application/json"}}))
    vi.stubGlobal("fetch", fetchMock)

    const store = configureStore({reducer, middleware: (d) => d({serializableCheck: false}).concat(participantApi.middleware)})
    store.dispatch(selectTenant("RC100100"))
    const call = store.dispatch(participantApi.endpoints.persistBusinessType.initiate(
      {tenant: "RC100100", participantId: "p1", value: {path: "businessRole", value: "EEG_BUSINESS"}}))

    store.dispatch(selectTenant("RC100200"))
    releaseToken("token")
    await call

    const sent: Request = fetchMock.mock.calls[0][0]
    expect(sent.headers.get("tenant")).toBe("RC100100")
    // the answer belongs to the previous community: it does not become the selected member of the new one
    expect(store.getState().participant.selectedParticipant?.id).toBeUndefined()
  })
})
