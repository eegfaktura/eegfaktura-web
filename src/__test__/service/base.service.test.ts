import { describe, it, expect, vi } from "vitest";
import EegBaseService, {SESSION_EXPIRED} from "../../service/base.service";
import {AuthService} from "../../service/auth.service";

class TestService extends EegBaseService {
  check(response: Response) {
    return this.handleErrors(response)
  }
}

describe("handleErrors", () => {
  it("fails a 401 and starts the login once", async () => {
    const login = vi.fn().mockResolvedValue(undefined)
    const svc = new TestService({login} as unknown as AuthService)

    await expect(svc.check(new Response("", {status: 401}))).rejects.toThrow(SESSION_EXPIRED)
    await expect(svc.check(new Response("", {status: 401}))).rejects.toThrow(SESSION_EXPIRED)
    expect(login).toHaveBeenCalledTimes(1)
  })

  it("passes an ok response through", async () => {
    const svc = new TestService({} as AuthService)
    const res = new Response("{}", {status: 200})
    await expect(svc.check(res)).resolves.toBe(res)
  })
})
