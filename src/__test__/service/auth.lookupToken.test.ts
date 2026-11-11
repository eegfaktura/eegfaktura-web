// @vitest-environment node
import {describe, expect, it, vi} from "vitest";
import {AuthService} from "../../service/auth.service";
import EegBaseService from "../../service/base.service";

// WEB-CQ-24: the one token lookup of the app waits for the refresh and uses its token (it used to start the refresh
// without waiting and fail with an empty Error for the RTK Query participant API).
const service = () => new AuthService({authority: "https://login.example.org/realms/EEG/", client_id: "app",
  redirect_uri: "https://app.example.org"})

describe("AuthService.lookupToken (WEB-CQ-24)", () => {
  it("refreshes the session when getToken fails and returns the refreshed token", async () => {
    const auth = service()
    const getToken = vi.spyOn(auth, "getToken").mockRejectedValueOnce(new Error("expired"))
    const refresh = vi.spyOn(auth, "refresh").mockResolvedValue("fresh")

    await expect(auth.lookupToken()).resolves.toBe("fresh")
    expect(refresh).toHaveBeenCalledTimes(1)
    expect(getToken).toHaveBeenCalledTimes(1)
  })

  it("asks getToken again when the refresh returns no token", async () => {
    const auth = service()
    vi.spyOn(auth, "getToken").mockRejectedValueOnce(new Error("expired")).mockResolvedValueOnce("after-redirect")
    vi.spyOn(auth, "refresh").mockResolvedValue(undefined)

    await expect(auth.lookupToken()).resolves.toBe("after-redirect")
  })

  it("fails with a real Error when getToken still fails after the refresh", async () => {
    const auth = service()
    vi.spyOn(auth, "getToken").mockRejectedValue(new Error("expired"))
    vi.spyOn(auth, "refresh").mockResolvedValue(undefined)

    await expect(auth.lookupToken()).rejects.toThrow("Not Authenticated")
  })

  it("fails with a real Error when there is no session", async () => {
    const auth = service()
    vi.spyOn(auth, "getToken").mockResolvedValue("")

    await expect(auth.lookupToken()).rejects.toThrow("Not Authenticated")
  })
})

class TestService extends EegBaseService {
  token() { return this.lookupToken() }
}

describe("EegBaseService.lookupToken (WEB-CQ-24)", () => {
  it("uses the token lookup of the shared AuthService", async () => {
    const auth = service()
    const lookup = vi.spyOn(auth, "lookupToken").mockResolvedValue("shared")

    await expect(new TestService(auth).token()).resolves.toBe("shared")
    expect(lookup).toHaveBeenCalledTimes(1)
  })
})
