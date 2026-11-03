import {describe, expect, it, vi} from "vitest";
import {AuthService} from "../../service/auth.service";

// WEB-CQ-24: the one token lookup of the app waits for the refresh and tries again (it used to start the refresh
// without waiting and fail with an empty Error for the RTK Query participant API).
const service = () => new AuthService({authority: "https://login.example.org/realms/EEG/", client_id: "app",
  redirect_uri: "https://app.example.org"})

describe("AuthService.lookupToken (WEB-CQ-24)", () => {
  it("refreshes the session when getToken fails and returns the new token", async () => {
    const auth = service()
    vi.spyOn(auth, "getToken").mockRejectedValueOnce(new Error("expired")).mockResolvedValueOnce("fresh")
    const refresh = vi.spyOn(auth, "refresh").mockResolvedValue("fresh")

    await expect(auth.lookupToken()).resolves.toBe("fresh")
    expect(refresh).toHaveBeenCalledTimes(1)
  })

  it("fails with a real Error when there is no session", async () => {
    const auth = service()
    vi.spyOn(auth, "getToken").mockResolvedValue("")

    await expect(auth.lookupToken()).rejects.toThrow("Not Authenticated")
  })
})
