import {describe, expect, it} from "vitest";
import {reducer} from "../../store/rate/reducers/rate.reducer";
import {fetchRatesModel} from "../../store/rate/actions/rate.action";
import {initialState} from "../../store/rate/states/rate.state";

describe("rate reducer: loaded flag the energy report waits for (platform#174)", () => {
  it("is false before and while loading, true after loading", () => {
    expect(initialState.loaded).toBe(false)
    let s = reducer(initialState, fetchRatesModel.pending("r1", {} as any))
    expect(s.loaded).toBe(false)
    s = reducer(s, fetchRatesModel.fulfilled({rates: []} as any, "r1", {} as any))
    expect(s.loaded).toBe(true)
  })

  it("is true after a failed load too, so the report is not blocked", () => {
    const s = reducer(reducer(initialState, fetchRatesModel.pending("r1", {} as any)),
      fetchRatesModel.rejected(new Error("x"), "r1", {} as any))
    expect(s.loaded).toBe(true)
  })

  it("is false again while the tariffs of another tenant load", () => {
    let s = reducer(initialState, fetchRatesModel.fulfilled({rates: []} as any, "r1", {} as any))
    s = reducer(s, fetchRatesModel.pending("r2", {} as any))
    expect(s.loaded).toBe(false)
  })
})
