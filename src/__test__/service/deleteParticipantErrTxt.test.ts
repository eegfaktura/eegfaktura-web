import {describe, expect, it} from "vitest";
import {deleteParticipantErrTxt} from "../../service/error.text";

describe("deleteParticipantErrTxt", () => {
  it("names the reason when backend refuses a member whose metering point took part", () => {
    expect(deleteParticipantErrTxt({status: 409, data: {error: {code: 1109}}})).toContain("angemeldet sind oder waren")
  })

  it("keeps the general text for every other failure", () => {
    const text = "Das Mitglied konnte nicht gelöscht werden."
    expect(deleteParticipantErrTxt({status: 400, data: {error: {code: 1107}}})).toBe(text)
    expect(deleteParticipantErrTxt({status: "FETCH_ERROR"})).toBe(text)
    expect(deleteParticipantErrTxt(undefined)).toBe(text)
  })
})
