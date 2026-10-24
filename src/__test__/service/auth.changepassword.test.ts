import {describe, expect, it, vi} from "vitest";
import {AuthService} from "../../service/auth.service";

describe("AuthService.redirectToUserAccount (261005-ca4)", () => {
  it("starts a regular sign-in (state and PKCE, like the login) with the Keycloak action to change the password", async () => {
    const service = new AuthService({authority: "https://login.example.org/realms/EEG/", client_id: "app",
      redirect_uri: "https://app.example.org"})
    const signin = vi.spyOn(service, "signinRedirect").mockResolvedValue(undefined)
    const before = window.location.href

    await service.redirectToUserAccount()

    expect(signin).toHaveBeenCalledWith({extraQueryParams: {kc_action: "UPDATE_PASSWORD"}})
    expect(window.location.href).toBe(before)
  })
})
