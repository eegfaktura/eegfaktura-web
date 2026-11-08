import {afterAll, afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import {configureStore} from "@reduxjs/toolkit";
import {reducer} from "../../store/store";
import {participantApi} from "../../store/participant/api";
import {Api} from "../../service";

// the API base URL is read when the module loads
vi.hoisted(() => { vi.stubEnv("VITE_API_SERVER_URL", "http://api.test") })

// WEB-CQ-24: a 401 of the RTK Query participant API goes through the same session check as the class services.
describe("participantApi 401 (WEB-CQ-24)", () => {
  const original = Api.authService
  beforeEach(() => sessionStorage.clear())
  afterAll(() => vi.unstubAllEnvs())
  afterEach(() => {
    vi.unstubAllGlobals()
    ;(Api as any).authService = original
  })

  const deleteWith401 = async (expired: boolean) => {
    const login = vi.fn().mockResolvedValue(undefined)
    ;(Api as any).authService = {
      lookupToken: async () => "token",
      getUser: vi.fn().mockResolvedValue({expired}),
      login,
    }
    vi.stubGlobal("fetch", vi.fn().mockImplementation(async () =>
      new Response(JSON.stringify({error: {code: 1, error: "x", message: "x"}}), {status: 401,
        headers: {"Content-Type": "application/json"}})))
    const store = configureStore({reducer, middleware: (d) => d({serializableCheck: false}).concat(participantApi.middleware)})
    const error = await store.dispatch(participantApi.endpoints.deleteParticipant.initiate(
      {tenant: "RC100100", participantId: "p1"})).unwrap().catch(e => e)
    return {login, error}
  }

  it("starts the login when the session expired, the error keeps status and body", async () => {
    const {login, error} = await deleteWith401(true)
    expect(login).toHaveBeenCalledTimes(1)
    expect(error.status).toBe(401)
    expect(error.data.error.code).toBe(1)
  })

  it("does not start the login when the session is valid (missing permission)", async () => {
    const {login, error} = await deleteWith401(false)
    expect(login).not.toHaveBeenCalled()
    expect(error.status).toBe(401)
  })
})
