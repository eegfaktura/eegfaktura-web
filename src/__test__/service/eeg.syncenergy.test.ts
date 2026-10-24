import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import {EegService} from "../../service/eeg.service";
import {AuthService} from "../../service/auth.service";

const fetchMock = vi.fn();

const response = (status: number, body: string) =>
  ({ok: true, status, text: async () => body} as unknown as Response)

describe("EegService.syncMeteringPoint (smart re-request)", () => {
  let service: EegService

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
    service = new EegService({} as AuthService);
    vi.spyOn(service as any, "lookupToken").mockResolvedValue("token");
  });
  afterEach(() => vi.unstubAllGlobals());

  const sentBody = () => JSON.parse(fetchMock.mock.calls[0][1].body)

  it("sends the request as before without per-meter periods and without complete metering points", async () => {
    fetchMock.mockResolvedValue(response(200, JSON.stringify({requested: 1, skipped: []})))
    await service.syncMeteringPoint("RC1", [{meter: "AT1", direction: "CONSUMPTION"}], 1, 2)

    expect(fetchMock.mock.calls[0][0]).toMatch(/\/meteringpoint\/syncenergy$/)
    expect(sentBody()).toEqual({meteringPoints: [{meter: "AT1", direction: "CONSUMPTION"}], from: 1, to: 2})
  })

  it("sends the period per metering point and the complete metering points", async () => {
    fetchMock.mockResolvedValue(response(200, JSON.stringify({requested: 1, skipped: []})))
    await service.syncMeteringPoint("RC1",
      [{meter: "AT1", direction: "CONSUMPTION", from: 10, to: 20}, {meter: "AT2", direction: "GENERATION"}], 1, 30, ["AT3"])

    expect(sentBody()).toEqual({
      meteringPoints: [{meter: "AT1", direction: "CONSUMPTION", from: 10, to: 20}, {meter: "AT2", direction: "GENERATION"}],
      from: 1, to: 30, complete: ["AT3"],
    })
  })

  it("reads the requested count and the skipped metering points from the 200 answer", async () => {
    fetchMock.mockResolvedValue(response(200, JSON.stringify({
      requested: 2, skipped: [{meteringPoint: "AT3", reason: "ALREADY_REQUESTED", until: 5000}],
    })))
    const r = await service.syncMeteringPoint("RC1", [{meter: "AT1", direction: "CONSUMPTION"}], 1, 2)
    expect(r).toEqual({requested: 2, skipped: [{meteringPoint: "AT3", reason: "ALREADY_REQUESTED", until: 5000}]})
  })

  it("takes a null skipped list as empty", async () => {
    fetchMock.mockResolvedValue(response(200, JSON.stringify({requested: 0, skipped: null})))
    const r = await service.syncMeteringPoint("RC1", [{meter: "AT1", direction: "CONSUMPTION"}], 1, 2)
    expect(r).toEqual({requested: 0, skipped: []})
  })

  it("accepts the empty 204 answer of an older backend, the requested count is unknown", async () => {
    fetchMock.mockResolvedValue(response(204, ""))
    const r = await service.syncMeteringPoint("RC1", [{meter: "AT1", direction: "CONSUMPTION"}], 1, 2)
    expect(r).toEqual({skipped: []})
    expect(r.requested).toBeUndefined()
  })
})
