import {describe, expect, it} from "vitest";
import {countMemberActivity, memberActivity} from "../../util/MemberActivity.util";
import {EegParticipant} from "../../models/members.model";

const member = (...meters: [string, string][]) =>
  ({meters: meters.map(([status, processState]) => ({status, processState}))}) as unknown as EegParticipant

describe("memberActivity (platform#165)", () => {
  it("is active with at least one active metering point", () => {
    expect(memberActivity(member(["INACTIVE", "INACTIVE"], ["ACTIVE", "ACTIVE"]))).toBe('ACTIVE')
  })

  it("is inactive when all metering points have left or were rejected", () => {
    expect(memberActivity(member(["INACTIVE", "INACTIVE"], ["INACTIVE", "REVOKED"]))).toBe('INACTIVE')
    expect(memberActivity(member(["INIT", "REJECTED"]))).toBe('INACTIVE')
  })

  it("is pending while a metering point is being registered or without metering points", () => {
    expect(memberActivity(member(["INACTIVE", "INACTIVE"], ["INIT", "PENDING"]))).toBe('PENDING')
    expect(memberActivity(member(["INIT", "NEW"]))).toBe('PENDING')
    expect(memberActivity(member())).toBe('PENDING')
  })

  it("counts the members per status", () => {
    expect(countMemberActivity([member(["ACTIVE", "ACTIVE"]), member(["INIT", "REJECTED"]), member()]))
      .toEqual({ACTIVE: 1, PENDING: 1, INACTIVE: 1})
  })
})

describe("memberActivity without metering points (platform#165)", () => {
  it("is inactive when the stored status is ACTIVE (its metering points were moved away), else pending", () => {
    expect(memberActivity({meters: [], status: 'ACTIVE'} as unknown as EegParticipant)).toBe('INACTIVE')
    expect(memberActivity({meters: [], status: 'NEW'} as unknown as EegParticipant)).toBe('PENDING')
  })

  it("treats a metering point without status as not yet registered", () => {
    expect(memberActivity({meters: [{processState: 'ACTIVE'}]} as unknown as EegParticipant)).toBe('PENDING')
  })
})
