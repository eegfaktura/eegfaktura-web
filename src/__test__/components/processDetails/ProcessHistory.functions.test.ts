import { describe, it, expect } from "vitest";
import {render} from "@testing-library/react";
import {
  formatHistoryDate,
  formatHistoryTime,
  historyRangeEnd,
  mergeProtocolEntries,
  renderAccordionBody,
  REVOKE_PROTOCOLS
} from "../../../components/processDetails/ProcessHistory/ProcessHistory.functions";
import {EdaHistory} from "../../../models/process.model";

describe("revoke history", () => {
  it("queries the revocations by the member (CM_REV_CUS) as well", () => {
    expect(REVOKE_PROTOCOLS).toEqual(["CM_REV_IMP", "CM_REV_SP", "CM_REV_CUS"]);
  });

  it("merges the conversations of all revoke protocols", () => {
    const merged = mergeProtocolEntries(REVOKE_PROTOCOLS, {
      CM_REV_IMP: {c1: ["imp"]},
      CM_REV_CUS: {c2: ["cus"]},
      CR_MSG: {c3: ["other"]},
    });
    expect(merged).toEqual({c1: ["imp"], c2: ["cus"]});
    expect(mergeProtocolEntries(REVOKE_PROTOCOLS, undefined)).toEqual({});
  });
});

// web 261128-mm1: the end was the last day + 24 h; on the autumn DST day (25 h) that stayed on the same day and the
// backend, which takes the day of the end as exclusive bound, left out the messages of that day.
describe("process history range end", () => {
  it("is 00:00 of the next day on the autumn DST day (25 h)", () => {
    const lastDay = new Date(2026, 9, 25)
    expect(new Date(2026, 9, 26).getTime() - lastDay.getTime()).toBe(25 * 3600 * 1000) // runs in Europe/Vienna
    expect(historyRangeEnd(lastDay)).toBe(new Date("2026-10-26T00:00:00+01:00").getTime())
  })

  it("is 00:00 of the next day on the spring DST day (23 h)", () => {
    const lastDay = new Date(2026, 2, 29)
    expect(new Date(2026, 2, 30).getTime() - lastDay.getTime()).toBe(23 * 3600 * 1000)
    expect(historyRangeEnd(lastDay)).toBe(new Date("2026-03-30T00:00:00+02:00").getTime())
  })

  it("ignores the time of day of the last day and crosses month and year ends", () => {
    expect(historyRangeEnd(new Date(2026, 10, 28, 14, 30))).toBe(new Date(2026, 10, 29).getTime())
    expect(historyRangeEnd(new Date(2026, 11, 31, 23, 59))).toBe(new Date(2027, 0, 1).getTime())
  })
})

describe("process history dates (platform#224)", () => {
  it("formats dates as DD.MM.YYYY and times as HH:mm:ss in local time", () => {
    // 22:05:09 UTC is the next day in Vienna (CEST)
    const d = new Date("2026-10-03T22:05:09Z")
    expect(formatHistoryDate(d)).toBe("04.10.2026")
    expect(formatHistoryTime(d)).toBe("00:05:09")
  })

  it("„Versenden von Energiedaten“ shows the time with the date and the data range in German format", () => {
    const h = {
      date: new Date("2026-10-27T09:15:00Z"),
      meteringFrom: new Date("2026-10-01T00:00:00+02:00"),
      meteringTo: new Date("2026-10-26T00:00:00+01:00"),
    } as EdaHistory
    const {container} = render(renderAccordionBody("CR_MSG", [h]))
    const text = container.textContent ?? ""
    expect(text).toContain("27.10.2026")
    expect(text).toContain("10:15:00")
    expect(text).toContain("01.10.2026")
    expect(text).toContain("26.10.2026")
    expect(text).not.toContain("Oct")
  })

  it("the conversation tables show date and time in German format", () => {
    const h = {date: new Date("2026-03-05T07:08:09Z"), conversationId: "c1", processType: "ANTWORT_PT", responseCode: "-"} as EdaHistory
    const {container} = render(renderAccordionBody("CR_REQ_PT", [h]))
    expect(container.textContent).toContain("05.03.2026")
    expect(container.textContent).toContain("08:08:09")
    expect(container.textContent).not.toContain("GMT")
  })
})
