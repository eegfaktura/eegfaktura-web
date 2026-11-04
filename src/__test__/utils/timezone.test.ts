// @vitest-environment node
import {describe, expect, it} from "vitest"

// WEB-CQ-25: the tests with local dates and DST days rely on the one time zone of the suite (vite.config.ts test.env)
describe("test time zone", () => {
  it("is Europe/Vienna in every test file", () => {
    expect(new Date(2026, 0, 15, 12).getTimezoneOffset()).toBe(-60)   // CET
    expect(new Date(2026, 6, 15, 12).getTimezoneOffset()).toBe(-120)  // CEST
  })
})
