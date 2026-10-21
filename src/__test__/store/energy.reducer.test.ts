import {describe, expect, it} from "vitest";
import {reducer} from "../../store/energy/reducers/energy.reducer";
import {fetchEnergyReportV2} from "../../store/energy/actions/energy.action";
import {initialState} from "../../store/energy/states/energy.state";

const report = (id: string) => ({
  report: {totalConsumption: 0, totalProduction: 0, meta: [], participantReports: [{participantId: id, meters: []}]},
})
const pending = (requestId: string) => fetchEnergyReportV2.pending(requestId, {} as any)
const fulfilled = (requestId: string, id: string) => fetchEnergyReportV2.fulfilled(report(id) as any, requestId, {} as any)
const rejected = (requestId: string) => fetchEnergyReportV2.rejected(new Error("x"), requestId, {} as any)

describe("energy reducer: only the latest report request counts (platform#174)", () => {
  it("ignores an older response that arrives after the newer one", () => {
    let s = reducer(initialState, pending("old"))
    s = reducer(s, pending("new"))
    s = reducer(s, fulfilled("new", "with-buckets"))
    s = reducer(s, fulfilled("old", "without-buckets"))
    expect(s.participantReports.ids).toEqual(["with-buckets"])
  })

  it("does not clear the report when an older request fails late", () => {
    let s = reducer(initialState, pending("old"))
    s = reducer(s, pending("new"))
    s = reducer(s, fulfilled("new", "with-buckets"))
    s = reducer(s, rejected("old"))
    expect(s.participantReports.ids).toEqual(["with-buckets"])
  })

  it("still takes the latest response", () => {
    let s = reducer(initialState, pending("only"))
    s = reducer(s, fulfilled("only", "p1"))
    expect(s.participantReports.ids).toEqual(["p1"])
  })
})
