import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import {EegService} from "../../service/eeg.service";
import {AuthService} from "../../service/auth.service";

const fetchMock = vi.fn();

// the optional reason of a revoke goes to the backend as JSON key "reason"; without a reason the key is absent
describe("EegService.revokeMeteringPoint", () => {
  let service: EegService

  beforeEach(() => {
    fetchMock.mockReset();
    fetchMock.mockResolvedValue({ok: true, status: 201, json: async () => ({})} as unknown as Response)
    vi.stubGlobal("fetch", fetchMock);
    service = new EegService({} as AuthService);
    vi.spyOn(service as any, "lookupToken").mockResolvedValue("token");
  });
  afterEach(() => vi.unstubAllGlobals());

  const sentBody = () => JSON.parse(fetchMock.mock.calls[0][1].body)
  const meters = [{meter: "AT1", direction: "CONSUMPTION", consentId: "C1"}]

  it("sends the reason", async () => {
    await service.revokeMeteringPoint("TE1", "p1", meters, 1000, "Auszug")
    expect(fetchMock.mock.calls[0][0]).toMatch(/\/meteringpoint\/p1\/revokemeters$/)
    expect(sentBody()).toEqual({meteringPoints: meters, from: 1000, reason: "Auszug"})
  })

  it("omits an absent reason", async () => {
    await service.revokeMeteringPoint("TE1", "p1", meters, 1000, undefined)
    expect(sentBody()).toEqual({meteringPoints: meters, from: 1000})
  })
})
