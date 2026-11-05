import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import {EegService} from "../../service/eeg.service";
import {AuthService} from "../../service/auth.service";
import {SettlementState} from "../../models/eeg.model";

// platform#230: billing's settlement state, the backend's interval check/change, and the generic save without it

const fetchMock = vi.fn();
const billingState: SettlementState = {finalPeriods: ["Abr_YM-2026-3"], runningPeriods: []}
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), {status})

describe("EegService: settlement interval change", () => {
  let service: EegService

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
    service = new EegService({} as AuthService);
    vi.spyOn(service as any, "lookupToken").mockResolvedValue("token");
  });
  afterEach(() => vi.unstubAllGlobals());

  it("reads settlementState from billing with the tenant header", async () => {
    fetchMock.mockResolvedValue(json(billingState))
    expect(await service.fetchSettlementState("te100200")).toEqual(billingState)
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toMatch(/\/api\/billingRuns\/tenant\/TE100200\/settlementState$/)
    expect(init.method).toBe("GET")
    expect(init.headers.tenant).toBe("te100200")
  })

  it("posts interval, dryRun and the billing state to the backend", async () => {
    const result = {allowed: true, effectiveFrom: "2026-04-01", lastFinalPeriod: "Abr_YM-2026-3",
      message: "Das neue Intervall gilt ab 1. April 2026.", earliestFrom: null, eeg: null}
    fetchMock.mockResolvedValue(json(result))
    expect(await service.changeSettlementInterval("TE100200", "QUARTER", true, billingState)).toEqual(result)
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toMatch(/\/eeg\/settlementinterval$/)
    expect(init.method).toBe("POST")
    expect(init.headers.tenant).toBe("TE100200")
    expect(JSON.parse(init.body)).toEqual({settlementInterval: "QUARTER", dryRun: true, billingState})
  })

  it("a refusal (409) gives the backend's reason", async () => {
    const reason = "Für März 2026 läuft gerade eine Berechnung. Bitte nach deren Ende erneut versuchen."
    fetchMock.mockResolvedValue(json({error: {code: 409, error: reason, message: reason}}, 409))
    await expect(service.changeSettlementInterval("TE100200", "QUARTER", false, billingState))
      .rejects.toThrow(reason)
  })

  it("an error without a reason falls back to the generic handling", async () => {
    fetchMock.mockResolvedValue(new Response("<html>Bad Gateway</html>", {status: 502, statusText: "Bad Gateway"}))
    await expect(service.changeSettlementInterval("TE100200", "QUARTER", true, billingState))
      .rejects.toThrow("Bad Gateway")
  })

  it("the generic EEG save does not send the interval", async () => {
    fetchMock.mockResolvedValue(json({id: "TE100200"}))
    await service.updateEeg("TE100200", {settlementInterval: "ANNUAL", description: "neu"})
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toMatch(/\/eeg$/)
    expect(JSON.parse(init.body)).toEqual({description: "neu"})
  })
})
