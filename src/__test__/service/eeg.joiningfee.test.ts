import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import {EegService} from "../../service/eeg.service";
import {AuthService} from "../../service/auth.service";
import {exportMasterdataWithJoiningFees} from "../../util/JoiningFee.util";
import {JoiningFeeState} from "../../models/eeg.model";

// platform#217: billing's joiningFeeState and the member export that passes it to the backend

const fetchMock = vi.fn();
const state: JoiningFeeState[] = [
  {participantId: "p1", energyBilled: true, joiningFee: {documentNumber: "RG202600012", documentDate: "2026-01-15"}},
]

describe("EegService: joining fee calls", () => {
  let service: EegService

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
    service = new EegService({} as AuthService);
    vi.spyOn(service as any, "lookupToken").mockResolvedValue("token");
    vi.spyOn(service as any, "handleDownload").mockResolvedValue(true);
  });
  afterEach(() => vi.unstubAllGlobals());

  it("reads joiningFeeState from billing with the tenant header", async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify(state), {status: 200}))
    expect(await service.fetchJoiningFeeState("te100200")).toEqual(state)
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toMatch(/\/api\/billingDocuments\/tenant\/TE100200\/joiningFeeState$/)
    expect(init.method).toBe("GET")
    expect(init.headers.tenant).toBe("te100200")
  })

  it("posts the member export with the state as body", async () => {
    fetchMock.mockResolvedValue(new Response("xlsx", {status: 200}))
    await service.exportMasterdata("TE100200", state)
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toMatch(/\/eeg\/export\/masterdata$/)
    expect(init.method).toBe("POST")
    expect(JSON.parse(init.body)).toEqual(state)
  })

  it("posts the member export without a body when there is no state", async () => {
    fetchMock.mockResolvedValue(new Response("xlsx", {status: 200}))
    await service.exportMasterdata("TE100200")
    expect(fetchMock.mock.calls[0][1].method).toBe("POST")
    expect(fetchMock.mock.calls[0][1].body).toBeUndefined()
  })
})

describe("exportMasterdataWithJoiningFees", () => {
  it("passes billing's state to the export", async () => {
    const exportFn = vi.fn().mockResolvedValue(true)
    const unavailable = vi.fn()
    await exportMasterdataWithJoiningFees(() => Promise.resolve(state), exportFn, unavailable)
    expect(exportFn).toHaveBeenCalledWith(state)
    expect(unavailable).not.toHaveBeenCalled()
  })

  it("exports without the state and tells the user when billing fails", async () => {
    const exportFn = vi.fn().mockResolvedValue(true)
    const unavailable = vi.fn()
    expect(await exportMasterdataWithJoiningFees(() => Promise.reject(new Error("503")), exportFn, unavailable)).toBe(true)
    expect(exportFn).toHaveBeenCalledWith(undefined)
    expect(unavailable).toHaveBeenCalledTimes(1)
  })

  it("lets an export error through", async () => {
    await expect(exportMasterdataWithJoiningFees(() => Promise.resolve(state),
      () => Promise.reject(new Error("export failed")), vi.fn())).rejects.toThrow("export failed")
  })
})
