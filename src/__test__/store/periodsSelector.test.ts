import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import {configureStore} from "@reduxjs/toolkit";
import {reducer} from "../../store/store";
import {periodsSelector} from "../../store/energy";

// Without energy meta the community range begins today: day of the month, not the weekday (getDay).

describe("periodsSelector without meta", () => {
  beforeEach(() => {
    vi.useFakeTimers({toFake: ["Date"]})
    vi.setSystemTime(new Date(2026, 9, 25, 12, 0))   // Sunday 25.10.2026, getDay() = 0
  })
  afterEach(() => vi.useRealTimers())

  it("begins on today's date", () => {
    const store = configureStore({reducer, middleware: (d) => d({serializableCheck: false})})
    expect(periodsSelector(store.getState() as any).begin).toBe("25.10.2026")
  })
})
