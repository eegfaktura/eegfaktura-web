import { describe, it, expect, vi, beforeEach } from "vitest";
import EegBaseService, {mayRedirectToLogin, NO_PERMISSION, SESSION_EXPIRED} from "../../service/base.service";
import {AuthService} from "../../service/auth.service";

class TestService extends EegBaseService {
  // like the real services: the handler is passed on unbound
  check(response: Response) {
    return Promise.resolve(response).then(this.handleErrors)
  }
}

describe("handleErrors", () => {
  beforeEach(() => sessionStorage.clear())

  it("fails a 401 passed unbound and starts the login once when the session expired", async () => {
    const login = vi.fn().mockResolvedValue(undefined)
    const getUser = vi.fn().mockResolvedValue({expired: true})
    const svc = new TestService({login, getUser} as unknown as AuthService)

    await expect(svc.check(new Response("", {status: 401}))).rejects.toThrow(SESSION_EXPIRED)
    await expect(svc.check(new Response("", {status: 401}))).rejects.toThrow(SESSION_EXPIRED)
    expect(login).toHaveBeenCalledTimes(1)
  })

  it("reports a 401 with a valid session as missing permission, without a login redirect", async () => {
    const login = vi.fn()
    const svc = new TestService({login, getUser: vi.fn().mockResolvedValue({expired: false})} as unknown as AuthService)
    await expect(svc.check(new Response("", {status: 401}))).rejects.toThrow(NO_PERMISSION)
    expect(login).not.toHaveBeenCalled()
  })

  it("reports the status text when the error body is not JSON (body read once)", async () => {
    const svc = new TestService({} as AuthService)
    const res = new Response("<html>Bad Gateway</html>", {status: 502, statusText: "Bad Gateway"})
    await expect(svc.check(res)).rejects.toThrow("Bad Gateway")
  })

  it("shows a plain-string error body (energystore) instead of \"E_undefined_undefined\" (pre-existing)", async () => {
    const svc = new TestService({} as AuthService)
    const res = new Response(JSON.stringify({error: "badger: database closed"}), {status: 500, statusText: "Internal Server Error"})
    await expect(svc.check(res)).rejects.toThrow(/^badger: database closed$/)
  })

  it("shows the reason of a Spring error body (pre-existing)", async () => {
    const svc = new TestService({} as AuthService)
    const res = new Response(JSON.stringify({timestamp: "2026-10-24T12:00:00", status: 500, error: "Internal Server Error", path: "/api/x"}),
      {status: 500, statusText: ""})
    await expect(svc.check(res)).rejects.toThrow(/^Internal Server Error$/)
  })

  it("passes an ok response through", async () => {
    const svc = new TestService({} as AuthService)
    const res = new Response("{}", {status: 200})
    await expect(svc.check(res)).resolves.toBe(res)
  })
})

describe("mayRedirectToLogin", () => {
  beforeEach(() => sessionStorage.clear())

  it("allows one redirect per minute, also after a reload (sessionStorage)", () => {
    expect(mayRedirectToLogin(1_000_000)).toBe(true)
    expect(mayRedirectToLogin(1_030_000)).toBe(false)  // a 401 right after coming back from the login
    expect(mayRedirectToLogin(1_061_000)).toBe(true)
  })
})
