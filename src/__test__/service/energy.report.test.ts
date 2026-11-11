import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import {EnergyService} from "../../service/energy.service";
import {AuthService} from "../../service/auth.service";

const fetchMock = vi.fn();
const tenant = {tenant: "RC100200", ecId: "AT00999900000RC100200000000000001", rcNr: "RC100200"}

const answer = (status: number, body: unknown) => {
  const text = JSON.stringify(body)
  return {ok: status < 400, status, statusText: "Internal Server Error",
    text: async () => text, json: async () => JSON.parse(text),
    clone() { return this }} as unknown as Response
}

describe("EnergyService.fetchReportV2 (261024-ca6)", () => {
  let service: EnergyService

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
    service = new EnergyService({} as AuthService);
    vi.spyOn(service as any, "lookupToken").mockResolvedValue("token");
  });
  afterEach(() => vi.unstubAllGlobals());

  it("a community without any energy data yet gets an empty report, not an error", async () => {
    // energystore v1 answers 500 "Record doesn't exist" while no energy data was ever imported (cpmeta/0 missing)
    fetchMock.mockResolvedValue(answer(500, {error: "Record doesn't exist"}))
    const r = await service.fetchReportV2(tenant, 2026, 10, "YM", [])
    expect(r).toEqual({id: "YM/2026/10", participantReports: [], meta: [], totalProduction: 0, totalConsumption: 0})
  })

  it("any other server error still fails the load", async () => {
    fetchMock.mockResolvedValue(answer(500, {error: "badger: database closed"}))
    await expect(service.fetchReportV2(tenant, 2026, 10, "YM", [])).rejects.toThrow()
  })
})
