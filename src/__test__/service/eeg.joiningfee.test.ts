import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import {EegService, JoiningFeeAlreadyBilledError} from "../../service/eeg.service";
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

  it("asks a second time when the first call fails, then gives up", async () => {
    fetchMock
      .mockRejectedValueOnce(new TypeError("Failed to fetch"))
      .mockResolvedValueOnce(new Response(JSON.stringify(state), {status: 200}))
    expect(await service.fetchJoiningFeeState("TE100200")).toEqual(state)
    expect(fetchMock).toHaveBeenCalledTimes(2)

    fetchMock.mockReset()
    fetchMock.mockRejectedValue(new TypeError("Failed to fetch"))
    await expect(service.fetchJoiningFeeState("TE100200")).rejects.toThrow()
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it("asks a second time when the token lookup fails once", async () => {
    vi.spyOn(service as any, "lookupToken").mockRejectedValueOnce(new Error()).mockResolvedValue("token")
    fetchMock.mockResolvedValue(new Response(JSON.stringify(state), {status: 200}))
    expect(await service.fetchJoiningFeeState("TE100200")).toEqual(state)
    expect(fetchMock).toHaveBeenCalledTimes(1)
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

  it("requests the fee / records a payment with PUT on the member's joiningFee resource", async () => {
    fetchMock.mockResolvedValue(new Response(null, {status: 204}))
    await service.saveJoiningFeeRecord("te100200", "p-1", {kind: "PAID_EXTERNALLY", paidOn: "2026-03-01", note: null})
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toMatch(/\/api\/billingDocuments\/tenant\/TE100200\/participants\/p-1\/joiningFee$/)
    expect(init.method).toBe("PUT")
    expect(init.headers.tenant).toBe("te100200")
    expect(JSON.parse(init.body)).toEqual({kind: "PAID_EXTERNALLY", paidOn: "2026-03-01", note: null})
  })

  it("takes the record back with DELETE", async () => {
    fetchMock.mockResolvedValue(new Response(null, {status: 204}))
    await service.deleteJoiningFeeRecord("TE100200", "p-1")
    expect(fetchMock.mock.calls[0][1].method).toBe("DELETE")
    expect(fetchMock.mock.calls[0][1].body).toBeUndefined()
  })

  it("turns 409 (fee charged meanwhile) into JoiningFeeAlreadyBilledError, other errors stay errors", async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({error: "Conflict"}), {status: 409}))
    await expect(service.saveJoiningFeeRecord("TE100200", "p-1", {kind: "CHARGE_REQUESTED"}))
      .rejects.toBeInstanceOf(JoiningFeeAlreadyBilledError)
    fetchMock.mockResolvedValue(new Response(JSON.stringify({error: "Conflict"}), {status: 409}))
    await expect(service.deleteJoiningFeeRecord("TE100200", "p-1")).rejects.toBeInstanceOf(JoiningFeeAlreadyBilledError)
    fetchMock.mockResolvedValue(new Response("boom", {status: 500, statusText: "Internal Server Error"}))
    const e = await service.deleteJoiningFeeRecord("TE100200", "p-1").catch(x => x)
    expect(e).toBeInstanceOf(Error)
    expect(e).not.toBeInstanceOf(JoiningFeeAlreadyBilledError)
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
