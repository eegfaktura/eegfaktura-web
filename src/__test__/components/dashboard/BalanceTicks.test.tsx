import React from "react";
import {afterEach, beforeEach, describe, expect, it, vi} from "vitest";
import {render} from "@testing-library/react";
import LoadSharingComponent from "../../../components/dashboard/LoadSharing.component";
import {ActiveTenant} from "../../../models/eeg.model";
import {ReportNamedData} from "../../../models/energy.model";

// Month view: the label of a day whose Bilanzdifferenz is more than rounding is drawn red (platform#220).

vi.mock("../../../service", () => ({Api: {energyService: {}}}))

const row = (name: string, produced: number, distributed: number, unused: number) =>
  ({name, produced, distributed, unused, consumed: 10, allocated: 0, qoVConsumer: 0, qoVProducer: 0,
    cntConsumer: 1, cntProducer: 1}) as ReportNamedData

describe("month view axis labels", () => {
  const original = globalThis.ResizeObserver
  beforeEach(() => {
    // give the ResponsiveContainer a size, so recharts draws the axis in jsdom
    globalThis.ResizeObserver = class {
      constructor(private cb: any) {}
      observe(el: Element) { this.cb([{target: el, contentRect: {width: 800, height: 400}}]) }
      unobserve() {} disconnect() {}
    } as any
  })
  afterEach(() => { globalThis.ResizeObserver = original })

  it("marks the unbalanced day red and leaves the balanced one as it is", () => {
    const {container} = render(
      <LoadSharingComponent tenant={{tenant: "RC100100", ecId: "x"} as ActiveTenant}
                            activePeriod={{type: "YM", year: 2026, segment: 10}}
                            energyDate={{begin: "01.01.2026 00:00:00", end: "24.10.2026 23:45:00"}}
                            report={[row("D:10:21:2", 244.844, 191.098, 61.596), row("D:10:22:3", 100, 60, 40)]}/>)
    const ticks = Array.from(container.querySelectorAll(".recharts-xAxis text"))
    const tick = (label: string) => ticks.find(t => t.textContent === label)
    expect(tick("21")?.getAttribute("fill")).toBe("#F20A5E")
    expect(tick("22")?.getAttribute("fill")).not.toBe("#F20A5E")
  })
})
