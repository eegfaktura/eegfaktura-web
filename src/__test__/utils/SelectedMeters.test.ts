import {describe, expect, it} from "vitest";
import {Metering} from "../../models/meteringpoint.model";
import {selectedMeters} from "../../util/FilterHelper";

const meter = (meteringPoint: string, processState: string, consentId: string) =>
  ({meteringPoint, processState, consentId, direction: "GENERATION"}) as unknown as Metering

// support ticket 66110076: after an owner change the same metering point is in the community twice
const ZP = "AT0020000000000000000000100129467"
const oldOwner = meter(ZP, "INACTIVE", "old-consent")
const newOwner = meter(ZP, "ACTIVE", "new-consent")

describe("selectedMeters", () => {
  it("sends a metering point once, the ACTIVE entry wins over the old owner's INACTIVE one", () => {
    expect(selectedMeters([oldOwner, newOwner], [ZP])).toEqual([newOwner])
    expect(selectedMeters([newOwner, oldOwner], [ZP])).toEqual([newOwner])
  })
  it("takes only meters the form offered", () => {
    expect(selectedMeters([newOwner], [ZP, "AT00X"])).toEqual([newOwner])
    expect(selectedMeters([], [ZP])).toEqual([])
  })
  it("keeps the selection order and ignores a number selected twice", () => {
    const other = meter("AT0020000000000000000000100000001", "ACTIVE", "c2")
    expect(selectedMeters([newOwner, other], [other.meteringPoint, ZP, ZP])).toEqual([other, newOwner])
  })
  it("falls back to the only entry when none is ACTIVE", () => {
    expect(selectedMeters([oldOwner], [ZP])).toEqual([oldOwner])
    expect(selectedMeters([oldOwner], undefined)).toEqual([])
  })
})
