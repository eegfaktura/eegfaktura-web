import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import {EegService} from "../../service/eeg.service";
import {AuthService} from "../../service/auth.service";

const fetchMock = vi.fn();

describe("EegService.getHistories1", () => {
  beforeEach(() => {
    fetchMock.mockReset();
    fetchMock.mockResolvedValue({ok: true, status: 200, json: async () => ({data: {}})});
    vi.stubGlobal("fetch", fetchMock);
  });
  afterEach(() => vi.unstubAllGlobals());

  it("encodes the protocol list, a raw ';' is dropped by the backend (platform#170)", async () => {
    const service = new EegService({} as AuthService);
    vi.spyOn(service as any, "lookupToken").mockResolvedValue("token");
    await service.getHistories1("RC1", ["CM_REV_IMP", "CM_REV_SP", "CM_REV_CUS"], 1, 2);

    const url = fetchMock.mock.calls[0][0] as string;
    expect(url).toContain("protocol=CM_REV_IMP%3BCM_REV_SP%3BCM_REV_CUS&");
    expect(url).not.toContain(";");
    expect(new URL(url, "http://x").searchParams.get("protocol")).toBe("CM_REV_IMP;CM_REV_SP;CM_REV_CUS");
  });
});
