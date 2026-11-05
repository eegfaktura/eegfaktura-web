import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import {EegService} from "../../service/eeg.service";
import {ParticipantService} from "../../service/participant.service";
import {AuthService} from "../../service/auth.service";
import {Metering} from "../../models/meteringpoint.model";
import {EegParticipant} from "../../models/members.model";

// platform#229 addendum: TechCode and FuelCode come only from the grid operator's metering point list; the saves of a
// metering point or a member do not send them back
const fetchMock = vi.fn()
const sentBody = () => JSON.parse(fetchMock.mock.calls[0][1].body)
const meter = {meteringPoint: "AT1", direction: "CONSUMPTION", equipmentName: "PV", techCode: "PV01", fuelCode: "E01"} as Metering
const withToken = <T extends object>(service: T) => {
  vi.spyOn(service as any, "lookupToken").mockResolvedValue("token")
  return service
}

describe("saves without the codes of the metering point list", () => {
  beforeEach(() => {
    fetchMock.mockReset()
    fetchMock.mockResolvedValue({ok: true, status: 200, json: async () => ({})} as unknown as Response)
    vi.stubGlobal("fetch", fetchMock)
  })
  afterEach(() => vi.unstubAllGlobals())

  it("metering point save", async () => {
    await withToken(new EegService({} as AuthService)).updateMeteringPoint("RC1", "p1", meter)
    expect(sentBody()).toEqual({meteringPoint: "AT1", direction: "CONSUMPTION", equipmentName: "PV"})
  })

  it("metering point move", async () => {
    await withToken(new EegService({} as AuthService)).moveMeteringPoint("RC1", "p1", "p2", meter)
    expect(sentBody()).toEqual({meteringPoint: "AT1", direction: "CONSUMPTION", equipmentName: "PV"})
  })

  it("member save and member confirmation", async () => {
    const service = withToken(new ParticipantService({} as AuthService))
    await service.updateParticipant("RC1", {id: "p1", contact: {email: "a@example.org"}, meters: [meter]} as unknown as EegParticipant)
    expect(sentBody().meters).toEqual([{meteringPoint: "AT1", direction: "CONSUMPTION", equipmentName: "PV"}])

    fetchMock.mockClear()
    await service.confirmParticipant("RC1", "p1", [meter])
    expect(sentBody()).toEqual([{meteringPoint: "AT1", direction: "CONSUMPTION", equipmentName: "PV"}])
  })
})
