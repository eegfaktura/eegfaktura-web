import {describe, expect, it} from "vitest";
import {transformData} from "../../../components/dashboard/dashboard.functions";
import {calcXAxisHourNameV2} from "../../../components/dashboard/LoadCurveReport.functions";

// web 1.10.0 crashed the dashboard: the hourly report of the "Tagesverlauf" card (energystore IntraDay) has rows
// without "name", and the Bilanzdifferenz read name.split.

describe("transformData with the hourly report (no names)", () => {
  it("does not throw and labels the hours", () => {
    const rows = [{consumed: 3, distributed: 1, produced: 2, unused: 1, allocated: 0, qoVConsumer: 0, qoVProducer: 0,
      cntConsumer: 1, cntProducer: 1}, {consumed: 0, distributed: 0, produced: 0, unused: 0, allocated: 0,
      qoVConsumer: 0, qoVProducer: 0, cntConsumer: 1, cntProducer: 1}] as any
    const data = transformData(rows, calcXAxisHourNameV2)
    expect(data.map(d => d.name)).toEqual(["00:00", "01:00"])
    expect(data[0].days).toBe(1)
  })
})
